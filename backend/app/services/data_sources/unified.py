"""
A股数据统一获取模块

五层数据架构：
  行情层   → mootdx (TCP实时) + 腾讯财经 (HTTP指标)
  研报层   → 东财 + akshare + iwencai
  新闻层   → akshare (个股新闻/财联社快讯/全球资讯)
  基础数据层 → mootdx F10 (TCP) + akshare (低频辅助)
  公告层   → 巨潮 cninfo (爬虫) + mootdx F10

统一入口函数：
  get_market_data()     行情
  get_research()        研报
  get_news()            新闻
  get_financials()      基础数据
  get_announcements()   公告

特性：自动路由、降级备用、频率控制、重试超时
"""

import logging
import time
import random
import functools
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from threading import Lock

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# 频率控制 & 重试
# ═══════════════════════════════════════════════════════════════


class RateLimiter:
    """请求频率控制器"""

    def __init__(self, min_interval: float = 0.5, max_per_minute: int = 30):
        self._min_interval = min_interval
        self._max_per_minute = max_per_minute
        self._last_call: float = 0.0
        self._call_times: List[float] = []
        self._lock = Lock()

    def wait(self):
        with self._lock:
            now = time.time()
            self._call_times = [t for t in self._call_times if now - t < 60]
            if len(self._call_times) >= self._max_per_minute:
                sleep_time = 60 - (now - self._call_times[0]) + 0.1
                if sleep_time > 0:
                    time.sleep(sleep_time)
                    now = time.time()
            elapsed = now - self._last_call
            if elapsed < self._min_interval:
                time.sleep(self._min_interval - elapsed)
            self._last_call = time.time()
            self._call_times.append(self._last_call)


def retry_on_failure(max_retries: int = 3, base_delay: float = 1.0, backoff: float = 2.0):
    """重试装饰器，指数退避"""

    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exc = e
                    if attempt < max_retries - 1:
                        delay = base_delay * (backoff ** attempt) + random.uniform(0, 0.5)
                        logger.debug(f"[重试] {func.__name__} 第{attempt+1}次失败, {delay:.1f}s后重试: {e}")
                        time.sleep(delay)
            raise last_exc

        return wrapper

    return decorator


# ═══════════════════════════════════════════════════════════════
# 股票代码工具
# ═══════════════════════════════════════════════════════════════


def _to_mootdx_symbol(symbol: str) -> str:
    """转为 mootdx 格式: sh600519 / sz000001"""
    if symbol.startswith(('600', '601', '603', '605', '688', '689')):
        return f"sh{symbol}"
    elif symbol.startswith(('000', '001', '002', '003', '300', '301')):
        return f"sz{symbol}"
    elif symbol.startswith(('4', '8')):
        return f"bj{symbol}"
    return f"sh{symbol}"


def _to_tencent_symbol(symbol: str) -> str:
    """转为腾讯财经格式: sh600519 / sz000001"""
    return _to_mootdx_symbol(symbol)


def _get_market(symbol: str) -> int:
    """获取市场代码: 0=深圳, 1=上海"""
    if symbol.startswith(('600', '601', '603', '605', '688', '689')):
        return 1
    return 0


# ═══════════════════════════════════════════════════════════════
# 数据模型
# ═══════════════════════════════════════════════════════════════


class SourceStatus(Enum):
    OK = "ok"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


@dataclass
class DataResult:
    """统一返回结构"""
    success: bool
    data: Any = None
    source: str = ""
    status: SourceStatus = SourceStatus.OK
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════
# 行情层: mootdx + 腾讯财经
# ═══════════════════════════════════════════════════════════════


class MarketDataProvider:
    """行情数据提供者"""

    def __init__(self):
        self._tdx_client = None
        self._tdx_available: Optional[bool] = None
        self._rate_limiter = RateLimiter(min_interval=0.3, max_per_minute=40)

    @property
    def tdx_client(self):
        if self._tdx_client is None and self._tdx_available is not False:
            try:
                from mootdx.quotes import Quotes
                self._tdx_client = Quotes.factory(market='std', timeout=10)
                self._tdx_available = True
                logger.info("[mootdx] 行情客户端初始化成功")
            except Exception as e:
                self._tdx_available = False
                logger.warning(f"[mootdx] 初始化失败: {e}")
        return self._tdx_client

    def is_tdx_available(self) -> bool:
        if self._tdx_available is None:
            self.tdx_client
        return self._tdx_available is True

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """mootdx 实时行情"""
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = _to_mootdx_symbol(symbol)
        data = client.quotes(symbol=tdx_symbol)
        if data is None or (isinstance(data, pd.DataFrame) and data.empty):
            return None
        if isinstance(data, pd.DataFrame):
            row = data.iloc[0]
            return {
                "symbol": symbol,
                "name": str(row.get('name', '')),
                "price": float(row.get('price', 0)),
                "open": float(row.get('open', 0)),
                "high": float(row.get('high', 0)),
                "low": float(row.get('low', 0)),
                "volume": int(row.get('volume', 0)),
                "amount": float(row.get('amount', 0)),
                "bid1": float(row.get('bid1', 0)),
                "ask1": float(row.get('ask1', 0)),
                "bid_vol1": int(row.get('bid_vol1', 0)),
                "ask_vol1": int(row.get('ask_vol1', 0)),
                "source": "mootdx",
            }
        return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tencent_valuation(self, symbol: str) -> Optional[Dict[str, Any]]:
        """腾讯财经 PE/PB/市值"""
        try:
            import akshare as ak
            tdx_symbol = _to_tencent_symbol(symbol)
            df = ak.stock_zh_a_spot_em()
            code_col = '代码' if '代码' in df.columns else 'code'
            row = df[df[code_col] == symbol]
            if row.empty:
                return None
            r = row.iloc[0]
            return {
                "pe_ratio": float(r.get('市盈率-动态', 0)) if r.get('市盈率-动态') else None,
                "pb_ratio": float(r.get('市净率', 0)) if r.get('市净率') else None,
                "market_cap": float(r.get('总市值', 0)) if r.get('总市值') else None,
                "circulating_market_cap": float(r.get('流通市值', 0)) if r.get('流通市值') else None,
                "volume_ratio": float(r.get('量比', 0)) if r.get('量比') else None,
                "turnover_rate": float(r.get('换手率', 0)) if r.get('换手率') else None,
                "source": "tencent",
            }
        except Exception:
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_kline(self, symbol: str, days: int = 60) -> Optional[pd.DataFrame]:
        """mootdx K线数据"""
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = _to_mootdx_symbol(symbol)
        market = _get_market(symbol)
        df = client.bars(symbol=tdx_symbol, frequency=9, offset=0, start=0, count=days)
        if df is not None and not df.empty:
            df['date'] = pd.to_datetime(df.index)
            df.sort_values('date', inplace=True)
            df['date'] = df['date'].dt.strftime('%Y-%m-%d')
            return df
        return None

    def get_market_data(self, symbol: str, include_kline: bool = True,
                        kline_days: int = 60) -> DataResult:
        """
        获取行情数据（自动路由）
        优先 mootdx → 降级 腾讯财经/akshare
        """
        result = {"symbol": symbol, "quote": None, "valuation": None, "kline": None}

        # 1. mootdx 实时行情
        if self.is_tdx_available():
            try:
                quote = self._get_tdx_quote(symbol)
                if quote:
                    result["quote"] = quote
                    logger.info(f"[行情] mootdx实时行情获取成功")
            except Exception as e:
                logger.warning(f"[行情] mootdx实时行情失败: {e}")

        # 2. 腾讯财经估值指标
        try:
            valuation = self._get_tencent_valuation(symbol)
            if valuation:
                result["valuation"] = valuation
                logger.info(f"[行情] 腾讯财经估值获取成功")
        except Exception as e:
            logger.warning(f"[行情] 腾讯财经估值失败: {e}")

        # 3. mootdx K线
        if include_kline and self.is_tdx_available():
            try:
                kline = self._get_tdx_kline(symbol, kline_days)
                if kline is not None and not kline.empty:
                    result["kline"] = kline.to_dict(orient='records')
                    logger.info(f"[行情] mootdx K线获取成功 ({len(kline)}条)")
            except Exception as e:
                logger.warning(f"[行情] mootdx K线失败: {e}")

        # 降级：akshare K线
        if include_kline and not result["kline"]:
            try:
                import akshare as ak
                end = datetime.now().strftime("%Y%m%d")
                start = (datetime.now() - timedelta(days=kline_days + 10)).strftime("%Y%m%d")
                df = ak.stock_zh_a_hist(symbol=symbol, period='daily',
                                        start_date=start, end_date=end, adjust='qfq')
                if df is not None and not df.empty:
                    result["kline"] = df.tail(kline_days).to_dict(orient='records')
                    logger.info(f"[行情] akshare K线降级成功 ({len(df)}条)")
            except Exception as e:
                logger.warning(f"[行情] akshare K线降级失败: {e}")

        status = SourceStatus.OK if result["quote"] or result["valuation"] else SourceStatus.DEGRADED
        return DataResult(
            success=bool(result["quote"] or result["valuation"] or result["kline"]),
            data=result,
            source="mootdx+tencent",
            status=status,
            metadata={"tdx_available": self.is_tdx_available()},
        )


# ═══════════════════════════════════════════════════════════════
# 研报层: 东财 + akshare + iwencai
# ═══════════════════════════════════════════════════════════════


class ResearchProvider:
    """研报数据提供者"""

    def __init__(self):
        self._rate_limiter = RateLimiter(min_interval=1.0, max_per_minute=15)

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_eastmoney_reports(self, symbol: str, limit: int = 20) -> Optional[List[Dict]]:
        """东财研报"""
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_research_report_em(symbol=symbol)
            if df is None or df.empty:
                return None
            df = df.head(limit)
            reports = []
            for _, row in df.iterrows():
                reports.append({
                    "title": str(row.get('报告名称', row.get('title', ''))),
                    "org": str(row.get('机构', row.get('org', ''))),
                    "date": str(row.get('日期', row.get('date', ''))),
                    "rating": str(row.get('东财评级', row.get('rating', ''))),
                    "source": "eastmoney",
                })
            return reports
        except Exception as e:
            logger.warning(f"[研报] 东财研报失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_analyst_consensus(self, symbol: str) -> Optional[Dict[str, Any]]:
        """机构一致预期EPS"""
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_profit_forecast_ths(symbol=symbol)
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            if latest is None:
                return None
            return {
                "year": str(latest.get('年度', '')),
                "avg_eps": float(latest.get('均值', 0)) if latest.get('均值') else None,
                "org_count": int(latest.get('预测机构数', 0)) if latest.get('预测机构数') else None,
                "source": "ths",
            }
        except Exception as e:
            logger.warning(f"[研报] 一致预期(ths)失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_iwencai_research(self, symbol: str, query: str = "") -> Optional[List[Dict]]:
        """iwencai 自然语言搜索研报（需API Key）"""
        try:
            import os
            api_key = os.getenv("IWENCAI_API_KEY")
            if not api_key:
                logger.debug("[研报] iwencai API Key未配置，跳过")
                return None

            import requests
            self._rate_limiter.wait()
            search_query = query or f"{symbol} 研报 评级 目标价"
            resp = requests.post(
                "https://iwencai.com/customized/chart/get-robot-data",
                json={"question": search_query, "perpage": 10},
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=15,
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            results = []
            for item in data.get("data", [])[:10]:
                results.append({
                    "title": item.get("title", ""),
                    "summary": item.get("summary", ""),
                    "source": "iwencai",
                })
            return results
        except Exception as e:
            logger.warning(f"[研报] iwencai失败: {e}")
            return None

    def get_research(self, symbol: str, include_iwencai: bool = False) -> DataResult:
        """
        获取研报数据
        优先 东财 → 降级 iwencai
        """
        result = {"reports": [], "consensus": None, "iwencai": []}

        # 1. 东财研报
        try:
            reports = self._get_eastmoney_reports(symbol)
            if reports:
                result["reports"] = reports
        except Exception as e:
            logger.warning(f"[研报] 东财研报异常: {e}")

        # 2. 一致预期
        try:
            consensus = self._get_analyst_consensus(symbol)
            if consensus:
                result["consensus"] = consensus
        except Exception as e:
            logger.warning(f"[研报] 一致预期异常: {e}")

        # 3. iwencai（可选）
        if include_iwencai:
            try:
                iwencai = self._get_iwencai_research(symbol)
                if iwencai:
                    result["iwencai"] = iwencai
            except Exception as e:
                logger.warning(f"[研报] iwencai异常: {e}")

        status = SourceStatus.OK if result["reports"] else SourceStatus.DEGRADED
        return DataResult(
            success=bool(result["reports"] or result["consensus"]),
            data=result,
            source="eastmoney+iwencai",
            status=status,
            metadata={"report_count": len(result["reports"])},
        )


# ═══════════════════════════════════════════════════════════════
# 新闻层: akshare
# ═══════════════════════════════════════════════════════════════


class NewsProvider:
    """新闻数据提供者"""

    def __init__(self):
        self._rate_limiter = RateLimiter(min_interval=0.5, max_per_minute=20)

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_stock_news(self, symbol: str) -> Optional[List[Dict]]:
        """个股新闻"""
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_news_em(symbol=symbol)
            if df is None or df.empty:
                return None
            news = []
            for _, row in df.head(30).iterrows():
                news.append({
                    "title": str(row.get('新闻标题', row.get('title', ''))),
                    "content": str(row.get('新闻内容', row.get('content', '')))[:200],
                    "time": str(row.get('发布时间', row.get('time', ''))),
                    "source": str(row.get('文章来源', row.get('source', ''))),
                    "url": str(row.get('新闻链接', row.get('url', ''))),
                    "type": "stock_news",
                })
            return news
        except Exception as e:
            logger.warning(f"[新闻] 个股新闻失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_cls_telegraph(self) -> Optional[List[Dict]]:
        """财联社快讯（分钟级更新）"""
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_info_global_cls()
            if df is None or df.empty:
                return None
            news = []
            for _, row in df.head(20).iterrows():
                news.append({
                    "title": str(row.get('标题', row.get('title', ''))),
                    "time": str(row.get('发布时间', row.get('time', ''))),
                    "content": str(row.get('内容', row.get('content', '')))[:200],
                    "type": "cls_telegraph",
                })
            return news
        except Exception as e:
            logger.warning(f"[新闻] 财联社快讯失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_global_news(self) -> Optional[List[Dict]]:
        """全球财经资讯"""
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_info_global_em()
            if df is None or df.empty:
                return None
            news = []
            for _, row in df.head(15).iterrows():
                news.append({
                    "title": str(row.get('标题', row.get('title', ''))),
                    "time": str(row.get('发布时间', row.get('time', ''))),
                    "content": str(row.get('摘要', row.get('content', '')))[:200],
                    "url": str(row.get('链接', row.get('url', ''))),
                    "type": "global",
                })
            return news
        except Exception as e:
            logger.warning(f"[新闻] 全球资讯失败: {e}")
            return None

    def get_news(self, symbol: str, include_global: bool = False) -> DataResult:
        """
        获取新闻数据
        个股新闻 + 财联社快讯 + (可选)全球资讯
        """
        result = {"stock_news": [], "cls_telegraph": [], "global_news": []}

        try:
            stock_news = self._get_stock_news(symbol)
            if stock_news:
                result["stock_news"] = stock_news
        except Exception as e:
            logger.warning(f"[新闻] 个股新闻异常: {e}")

        try:
            cls_news = self._get_cls_telegraph()
            if cls_news:
                result["cls_telegraph"] = cls_news
        except Exception as e:
            logger.warning(f"[新闻] 财联社异常: {e}")

        if include_global:
            try:
                global_news = self._get_global_news()
                if global_news:
                    result["global_news"] = global_news
            except Exception as e:
                logger.warning(f"[新闻] 全球资讯异常: {e}")

        total = len(result["stock_news"]) + len(result["cls_telegraph"])
        status = SourceStatus.OK if total > 0 else SourceStatus.DEGRADED
        return DataResult(
            success=total > 0,
            data=result,
            source="akshare",
            status=status,
            metadata={"total": total},
        )


# ═══════════════════════════════════════════════════════════════
# 基础数据层: mootdx F10 + akshare
# ═══════════════════════════════════════════════════════════════


class FinancialsProvider:
    """基础数据提供者"""

    def __init__(self):
        self._tdx_client = None
        self._tdx_available: Optional[bool] = None
        self._rate_limiter = RateLimiter(min_interval=0.5, max_per_minute=20)

    @property
    def tdx_client(self):
        if self._tdx_client is None and self._tdx_available is not False:
            try:
                from mootdx.quotes import Quotes
                self._tdx_client = Quotes.factory(market='std', timeout=10)
                self._tdx_available = True
            except Exception as e:
                self._tdx_available = False
                logger.warning(f"[mootdx] F10客户端初始化失败: {e}")
        return self._tdx_client

    def is_tdx_available(self) -> bool:
        if self._tdx_available is None:
            self.tdx_client
        return self._tdx_available is True

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_finance(self, symbol: str) -> Optional[Dict[str, Any]]:
        """mootdx F10 季报37字段"""
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = _to_mootdx_symbol(symbol)
        market = _get_market(symbol)
        try:
            df = client.finance(symbol=tdx_symbol, market=market)
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            return {
                "date": str(latest.get('date', '')),
                "eps": float(latest.get('每股收益', 0)) if latest.get('每股收益') else None,
                "bps": float(latest.get('每股净资产', 0)) if latest.get('每股净资产') else None,
                "roe": float(latest.get('净资产收益率', 0)) if latest.get('净资产收益率') else None,
                "total_shares": float(latest.get('总股本', 0)) if latest.get('总股本') else None,
                "circulating_shares": float(latest.get('流通股', 0)) if latest.get('流通股') else None,
                "source": "mootdx_f10",
            }
        except Exception as e:
            logger.warning(f"[F10] 季报失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """mootdx F10 公司概况"""
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = _to_mootdx_symbol(symbol)
        market = _get_market(symbol)
        try:
            info = client.company_info(symbol=tdx_symbol, market=market)
            if info is None:
                return None
            return {
                "name": str(info.get('name', '')),
                "industry": str(info.get('industry', '')),
                "main_business": str(info.get('main_business', '')),
                "listing_date": str(info.get('listing_date', '')),
                "source": "mootdx_f10",
            }
        except Exception as e:
            logger.warning(f"[F10] 公司概况失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_shareholders(self, symbol: str) -> Optional[List[Dict]]:
        """mootdx F10 股东研究"""
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = _to_mootdx_symbol(symbol)
        market = _get_market(symbol)
        try:
            df = client.xdxr(symbol=tdx_symbol, market=market)
            if df is None or df.empty:
                return None
            shareholders = []
            for _, row in df.head(10).iterrows():
                shareholders.append({
                    "name": str(row.get('name', '')),
                    "shares": float(row.get('shares', 0)) if row.get('shares') else None,
                    "ratio": float(row.get('ratio', 0)) if row.get('ratio') else None,
                })
            return shareholders
        except Exception as e:
            logger.warning(f"[F10] 股东研究失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_akshare_financials(self, symbol: str) -> Optional[Dict[str, Any]]:
        """akshare 基本面（低频辅助）"""
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_financial_abstract_ths(symbol=symbol, indicator='按报告期')
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            return {
                "date": str(latest.get('报告期', '')),
                "revenue": float(latest.get('营业总收入', 0)) if latest.get('营业总收入') else None,
                "net_profit": float(latest.get('净利润', 0)) if latest.get('净利润') else None,
                "total_assets": float(latest.get('资产总计', 0)) if latest.get('资产总计') else None,
                "total_liabilities": float(latest.get('负债合计', 0)) if latest.get('负债合计') else None,
                "source": "akshare",
            }
        except Exception as e:
            logger.warning(f"[基础数据] akshare财务失败: {e}")
            return None

    def get_financials(self, symbol: str) -> DataResult:
        """
        获取基础数据
        优先 mootdx F10 → 降级 akshare
        """
        result = {
            "finance": None,
            "company_info": None,
            "shareholders": [],
            "akshare_financials": None,
        }

        if self.is_tdx_available():
            try:
                result["finance"] = self._get_tdx_finance(symbol)
            except Exception as e:
                logger.warning(f"[基础数据] F10季报异常: {e}")

            try:
                result["company_info"] = self._get_tdx_company_info(symbol)
            except Exception as e:
                logger.warning(f"[基础数据] F10公司概况异常: {e}")

            try:
                result["shareholders"] = self._get_tdx_shareholders(symbol) or []
            except Exception as e:
                logger.warning(f"[基础数据] F10股东异常: {e}")

        # akshare 低频辅助
        try:
            result["akshare_financials"] = self._get_akshare_financials(symbol)
        except Exception as e:
            logger.warning(f"[基础数据] akshare异常: {e}")

        has_data = result["finance"] or result["company_info"] or result["akshare_financials"]
        status = SourceStatus.OK if has_data else SourceStatus.DEGRADED
        return DataResult(
            success=has_data,
            data=result,
            source="mootdx_f10+akshare",
            status=status,
            metadata={"tdx_available": self.is_tdx_available()},
        )


# ═══════════════════════════════════════════════════════════════
# 公告层: 巨潮 cninfo + mootdx F10
# ═══════════════════════════════════════════════════════════════


class AnnouncementProvider:
    """公告数据提供者"""

    def __init__(self):
        self._rate_limiter = RateLimiter(min_interval=1.0, max_per_minute=10)

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_cninfo_announcements(self, symbol: str, limit: int = 20) -> Optional[List[Dict]]:
        """巨潮 cninfo 公告全文及摘要"""
        try:
            import requests
            self._rate_limiter.wait()

            market = 'sz' if symbol.startswith(('000', '001', '002', '003', '300', '301')) else 'sh'
            org_id = f"gssz{symbol}" if market == 'sz' else f"gssh{symbol}"

            url = "http://www.cninfo.com.cn/new/hisAnnouncement/query"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "http://www.cninfo.com.cn/",
            }
            params = {
                "pageNum": 1,
                "pageSize": limit,
                "column": market,
                "tabName": "fulltext",
                "plate": "",
                "stock": f"{symbol},{org_id}",
                "searchkey": "",
                "secid": "",
                "category": "",
                "trade": "",
                "seDate": "",
            }
            resp = requests.post(url, data=params, headers=headers, timeout=15)
            if resp.status_code != 200:
                return None
            data = resp.json()
            if not data or not isinstance(data, dict):
                return None
            announcements = []
            items = data.get("announcements") or []
            for item in (items or [])[:limit]:
                if not item:
                    continue
                announcements.append({
                    "id": str(item.get("id", "")),
                    "title": str(item.get("announcementTitle", "")),
                    "date": str(item.get("announcementTime", ""))[:10],
                    "url": f"http://www.cninfo.com.cn/{item.get('adjunctUrl', '')}",
                    "type": "cninfo",
                })
            return announcements
        except Exception as e:
            logger.warning(f"[公告] 巨潮cninfo失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_akshare_notices(self, symbol: str) -> Optional[List[Dict]]:
        """akshare 个股公告（降级方案）"""
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_individual_notice_report(security=symbol, symbol="全部")
            if df is None or df.empty:
                return None
            notices = []
            for _, row in df.head(15).iterrows():
                notices.append({
                    "title": str(row.get('公告标题', row.get('title', ''))),
                    "date": str(row.get('公告日期', row.get('date', ''))),
                    "url": str(row.get('网址', row.get('url', ''))),
                    "type": "akshare_notice",
                })
            return notices
        except Exception as e:
            logger.warning(f"[公告] akshare公告失败: {e}")
            return None

    def get_announcements(self, symbol: str) -> DataResult:
        """
        获取公告数据
        优先 巨潮cninfo → 降级 mootdx F10
        """
        result = {"announcements": [], "notices": []}

        try:
            announcements = self._get_cninfo_announcements(symbol)
            if announcements:
                result["announcements"] = announcements
        except Exception as e:
            logger.warning(f"[公告] 巨潮异常: {e}")

        try:
            notices = self._get_akshare_notices(symbol)
            if notices:
                result["notices"] = notices
        except Exception as e:
            logger.warning(f"[公告] akshare异常: {e}")

        total = len(result["announcements"]) + len(result["notices"])
        status = SourceStatus.OK if total > 0 else SourceStatus.DEGRADED
        return DataResult(
            success=total > 0,
            data=result,
            source="cninfo+akshare",
            status=status,
            metadata={"total": total},
        )


# ═══════════════════════════════════════════════════════════════
# 统一入口
# ═══════════════════════════════════════════════════════════════


class UnifiedDataAcquisition:
    """A股数据统一获取模块"""

    def __init__(self):
        self._market = MarketDataProvider()
        self._research = ResearchProvider()
        self._news = NewsProvider()
        self._financials = FinancialsProvider()
        self._announcements = AnnouncementProvider()

    def get_market_data(self, symbol: str, include_kline: bool = True,
                        kline_days: int = 60) -> DataResult:
        """获取行情数据"""
        return self._market.get_market_data(symbol, include_kline, kline_days)

    def get_research(self, symbol: str, include_iwencai: bool = False) -> DataResult:
        """获取研报数据"""
        return self._research.get_research(symbol, include_iwencai)

    def get_news(self, symbol: str, include_global: bool = False) -> DataResult:
        """获取新闻数据"""
        return self._news.get_news(symbol, include_global)

    def get_financials(self, symbol: str) -> DataResult:
        """获取基础数据"""
        return self._financials.get_financials(symbol)

    def get_announcements(self, symbol: str) -> DataResult:
        """获取公告数据"""
        return self._announcements.get_announcements(symbol)

    def get_all(self, symbol: str) -> Dict[str, DataResult]:
        """一次性获取全部五层数据"""
        results = {}
        for name, method in [
            ("market", self.get_market_data),
            ("research", self.get_research),
            ("news", self.get_news),
            ("financials", self.get_financials),
            ("announcements", self.get_announcements),
        ]:
            try:
                results[name] = method(symbol)
            except Exception as e:
                results[name] = DataResult(
                    success=False, error=str(e),
                    source="unified", status=SourceStatus.UNAVAILABLE,
                )
        return results


# 全局单例
_unified: Optional[UnifiedDataAcquisition] = None


def get_unified_acquisition() -> UnifiedDataAcquisition:
    global _unified
    if _unified is None:
        _unified = UnifiedDataAcquisition()
    return _unified


# 模块级便捷函数
def get_market_data(symbol: str, **kwargs) -> DataResult:
    return get_unified_acquisition().get_market_data(symbol, **kwargs)


def get_research(symbol: str, **kwargs) -> DataResult:
    return get_unified_acquisition().get_research(symbol, **kwargs)


def get_news(symbol: str, **kwargs) -> DataResult:
    return get_unified_acquisition().get_news(symbol, **kwargs)


def get_financials(symbol: str, **kwargs) -> DataResult:
    return get_unified_acquisition().get_financials(symbol, **kwargs)


def get_announcements(symbol: str, **kwargs) -> DataResult:
    return get_unified_acquisition().get_announcements(symbol, **kwargs)
