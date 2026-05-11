"""
数据源路由器 - 实现五层架构的自动路由和降级策略

【行情层】
  - mootdx（TCP）：实时价格、K线、逐笔成交
  - sina/腾讯（HTTP）：PE/PB/市值等指标

【研报层】
  - akshare：免费PDF研报、机构一致预期EPS
  - iwencai：自然语言语义搜索研报
  - AI（Qwen/DeepSeek）：智能分析

【新闻层】
  - akshare：个股新闻、财联社快讯

【基础数据层】
  - mootdx F10（TCP）：季报37字段、公司概况、股东研究
  - akshare（低频辅助）

【公告层】
  - 巨潮 cninfo（爬虫）：公告全文
  - mootdx F10：公告快速浏览
"""

import logging
import time
from typing import Dict, Any, Optional, List, Callable, Type
from dataclasses import dataclass, field
from enum import Enum
from threading import Lock

logger = logging.getLogger(__name__)


class DataSourcePriority(Enum):
    PRIMARY = 1
    SECONDARY = 2
    FALLBACK = 3


@dataclass
class DataSourceConfig:
    name: str
    enabled: bool = True
    priority: DataSourcePriority = DataSourcePriority.PRIMARY
    timeout: float = 10.0
    max_retries: int = 2
    rate_limit_interval: float = 0.5
    rate_limit_per_minute: int = 30
    weight: float = 1.0


@dataclass
class SourceResult:
    success: bool
    data: Any = None
    source_name: str = ""
    error: Optional[str] = None
    latency_ms: float = 0.0
    used_fallback: bool = False


class RateLimiter:
    """请求频率控制器（线程安全）"""

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


class DataSourceRouter:
    """
    数据源路由器 - 实现自动路由和降级

    特性：
    1. 统一函数入口
    2. 自动路由到最佳数据源，支持降级
    3. 请求频率控制
    4. 重试和超时处理
    """

    def __init__(self):
        self._sources: Dict[str, Dict[str, Any]] = {}
        self._rate_limiters: Dict[str, RateLimiter] = {}
        self._source_health: Dict[str, float] = {}
        self._lock = Lock()

    def register_source(
        self,
        layer: str,
        name: str,
        fetch_func: Callable,
        config: Optional[DataSourceConfig] = None,
    ):
        """注册数据源"""
        if config is None:
            config = DataSourceConfig(name=name)

        if layer not in self._sources:
            self._sources[layer] = {}

        self._sources[layer][name] = {
            "fetch_func": fetch_func,
            "config": config,
        }

        self._rate_limiters[f"{layer}.{name}"] = RateLimiter(
            min_interval=config.rate_limit_interval,
            max_per_minute=config.rate_limit_per_minute,
        )

        self._source_health[f"{layer}.{name}"] = 1.0
        logger.info(f"[路由] 注册 {layer}.{name}")

    def get_best_source(self, layer: str, required_data: str = None) -> Optional[str]:
        """获取最佳数据源（按优先级和健康度）"""
        if layer not in self._sources:
            return None

        candidates = []
        for name, info in self._sources[layer].items():
            config = info["config"]
            if not config.enabled:
                continue
            health = self._source_health.get(f"{layer}.{name}", 1.0)
            score = config.weight * health * (1.0 / config.priority.value)
            candidates.append((name, score))

        if not candidates:
            return None

        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]

    def get_fallback_sources(self, layer: str, primary: str) -> List[str]:
        """获取备用数据源列表"""
        if layer not in self._sources:
            return []

        fallbacks = []
        for name in self._sources[layer].keys():
            if name != primary and self._sources[layer][name]["config"].enabled:
                fallbacks.append(name)
        return fallbacks

    def update_health(self, layer: str, name: str, success: bool):
        """更新数据源健康度"""
        key = f"{layer}.{name}"
        with self._lock:
            current = self._source_health.get(key, 1.0)
            if success:
                self._source_health[key] = min(1.0, current + 0.1)
            else:
                self._source_health[key] = max(0.1, current - 0.3)

    def route(
        self, layer: str, data_key: str, symbol: str = None, **kwargs
    ) -> SourceResult:
        """
        路由到最佳数据源，自动降级

        Args:
            layer: 数据层（如 'market', 'research'）
            data_key: 数据类型（如 'history', 'valuation'）
            symbol: 股票代码
            **kwargs: 额外参数

        Returns:
            SourceResult: 包含数据、来源、延迟等信息
        """
        primary = self.get_best_source(layer, data_key)
        if not primary:
            return SourceResult(
                success=False,
                error=f"No available source for layer={layer}, data={data_key}",
            )

        fallbacks = self.get_fallback_sources(layer, primary)
        all_sources = [primary] + fallbacks

        last_error = None
        for source_name in all_sources:
            result = self._try_fetch(layer, source_name, symbol, **kwargs)
            self.update_health(layer, source_name, result.success)

            if result.success:
                result.used_fallback = source_name != primary
                return result
            last_error = result.error

        return SourceResult(success=False, error=last_error or "All sources failed")

    def _try_fetch(
        self, layer: str, source_name: str, symbol: str = None, **kwargs
    ) -> SourceResult:
        """尝试从指定数据源获取数据"""
        key = f"{layer}.{source_name}"
        if key not in self._sources:
            return SourceResult(success=False, error=f"Source not found: {key}")

        info = self._sources[layer][source_name]
        config = info["config"]
        fetch_func = info["fetch_func"]

        limiter = self._rate_limiters.get(key)
        if limiter:
            limiter.wait()

        start_time = time.time()
        try:
            if symbol:
                data = fetch_func(symbol, **kwargs)
            else:
                data = fetch_func(**kwargs)

            latency = (time.time() - start_time) * 1000

            if data is not None:
                return SourceResult(
                    success=True, data=data, source_name=source_name, latency_ms=latency
                )
            else:
                return SourceResult(
                    success=False,
                    source_name=source_name,
                    error="Data is None",
                    latency_ms=latency,
                )

        except Exception as e:
            latency = (time.time() - start_time) * 1000
            logger.warning(f"[路由] {key} fetch failed: {e}")
            return SourceResult(
                success=False, source_name=source_name, error=str(e), latency_ms=latency
            )

    def get_layer_sources(self, layer: str) -> List[str]:
        """获取某层的所有数据源"""
        if layer not in self._sources:
            return []
        return list(self._sources[layer].keys())

    def get_all_layers(self) -> List[str]:
        """获取所有数据层"""
        return list(self._sources.keys())

    def get_status(self) -> Dict[str, Any]:
        """获取路由状态"""
        status = {}
        for layer, sources in self._sources.items():
            status[layer] = {}
            for name, info in sources.items():
                key = f"{layer}.{name}"
                status[layer][name] = {
                    "enabled": info["config"].enabled,
                    "priority": info["config"].priority.name,
                    "health": self._source_health.get(key, 1.0),
                }
        return status


_router_instance: Optional[DataSourceRouter] = None
_router_lock = Lock()


def get_router() -> DataSourceRouter:
    """获取全局路由器实例（单例）"""
    global _router_instance
    if _router_instance is None:
        with _router_lock:
            if _router_instance is None:
                _router_instance = DataSourceRouter()
                _init_default_sources(_router_instance)
    return _router_instance


def _init_default_sources(router: DataSourceRouter):
    """初始化默认数据源"""

    # ========== 行情层 ==========
    def mootdx_history(symbol: str, **kwargs) -> Any:
        try:
            from mootdx.quotes import Quotes
            from ..stock_utils import to_mootdx_symbol

            client = Quotes.factory(market="std", timeout=10)
            tdx_symbol = to_mootdx_symbol(symbol)
            df = client.quotes(symbol=tdx_symbol)
            return df
        except Exception as e:
            logger.warning(f"[mootdx] {symbol} failed: {e}")
            return None

    def sina_history(symbol: str, **kwargs) -> Any:
        try:
            import akshare as ak
            from ..stock_utils import to_sina_symbol

            prefix = to_sina_symbol(symbol)
            years = kwargs.get("years", 2)
            start = kwargs.get("start", None)
            end = kwargs.get("end", None)
            if not start:
                from datetime import datetime, timedelta

                start = (datetime.now() - timedelta(days=365 * years)).strftime(
                    "%Y%m%d"
                )
            if not end:
                end = datetime.now().strftime("%Y%m%d")
            df = ak.stock_zh_a_daily(
                symbol=prefix,
                start_date=start,
                end_date=end,
                adjust=kwargs.get("adjust", "qfq"),
            )
            return df
        except Exception as e:
            logger.warning(f"[sina] {symbol} failed: {e}")
            return None

    def akshare_valuation(symbol: str, **kwargs) -> Any:
        try:
            import akshare as ak

            df = ak.stock_zh_a_spot_em()
            code_col = "代码" if "代码" in df.columns else "code"
            row = df[df[code_col] == symbol]
            if row.empty:
                return None
            return row.iloc[0].to_dict()
        except Exception as e:
            logger.warning(f"[akshare_valuation] {symbol} failed: {e}")
            return None

    router.register_source(
        "market",
        "mootdx",
        mootdx_history,
        DataSourceConfig(
            name="mootdx",
            priority=DataSourcePriority.PRIMARY,
            timeout=10.0,
            rate_limit_interval=0.3,
            rate_limit_per_minute=40,
        ),
    )

    router.register_source(
        "market",
        "sina",
        sina_history,
        DataSourceConfig(
            name="sina",
            priority=DataSourcePriority.SECONDARY,
            timeout=8.0,
            rate_limit_interval=0.5,
            rate_limit_per_minute=30,
        ),
    )

    router.register_source(
        "market",
        "akshare_valuation",
        akshare_valuation,
        DataSourceConfig(
            name="akshare_valuation",
            priority=DataSourcePriority.FALLBACK,
            timeout=15.0,
            rate_limit_interval=1.0,
            rate_limit_per_minute=10,
        ),
    )

    # ========== 研报层 ==========
    def akshare_research(symbol: str, **kwargs) -> Any:
        try:
            import akshare as ak

            df = ak.stock_research_report_em(symbol=symbol)
            return df
        except Exception as e:
            logger.warning(f"[akshare_research] {symbol} failed: {e}")
            return None

    def iwencai_research(symbol: str, **kwargs) -> Any:
        try:
            import wencai as wc

            query = kwargs.get("query", f"{symbol} 研报")
            df = wc.search(query, loop=True)
            return df
        except Exception as e:
            logger.warning(f"[iwencai] {symbol} failed: {e}")
            return None

    router.register_source(
        "research",
        "akshare",
        akshare_research,
        DataSourceConfig(
            name="akshare",
            priority=DataSourcePriority.PRIMARY,
            timeout=15.0,
            rate_limit_interval=1.0,
            rate_limit_per_minute=10,
        ),
    )

    router.register_source(
        "research",
        "iwencai",
        iwencai_research,
        DataSourceConfig(
            name="iwencai",
            priority=DataSourcePriority.SECONDARY,
            timeout=20.0,
            rate_limit_interval=2.0,
            rate_limit_per_minute=5,
        ),
    )

    # ========== 新闻层 ==========
    def akshare_news(symbol: str, **kwargs) -> Any:
        try:
            import akshare as ak

            df = ak.stock_news_em(symbol=symbol)
            return df
        except Exception as e:
            logger.warning(f"[akshare_news] {symbol} failed: {e}")
            return None

    router.register_source(
        "news",
        "akshare",
        akshare_news,
        DataSourceConfig(
            name="akshare",
            priority=DataSourcePriority.PRIMARY,
            timeout=10.0,
            rate_limit_interval=0.5,
            rate_limit_per_minute=20,
        ),
    )

    # ========== 基础数据层 ==========
    def mootdx_financial(symbol: str, **kwargs) -> Any:
        try:
            from mootdx.financial import Financial

            fin = Financial()
            df = fin.daily(symbol=symbol)
            return df
        except Exception as e:
            logger.warning(f"[mootdx_financial] {symbol} failed: {e}")
            return None

    def akshare_financial(symbol: str, **kwargs) -> Any:
        try:
            import akshare as ak

            df = ak.stock_financial_analysis_indicator(symbol=symbol)
            return df
        except Exception as e:
            logger.warning(f"[akshare_financial] {symbol} failed: {e}")
            return None

    router.register_source(
        "financials",
        "mootdx",
        mootdx_financial,
        DataSourceConfig(
            name="mootdx",
            priority=DataSourcePriority.PRIMARY,
            timeout=15.0,
            rate_limit_interval=1.0,
            rate_limit_per_minute=15,
        ),
    )

    router.register_source(
        "financials",
        "akshare",
        akshare_financial,
        DataSourceConfig(
            name="akshare",
            priority=DataSourcePriority.SECONDARY,
            timeout=20.0,
            rate_limit_interval=2.0,
            rate_limit_per_minute=10,
        ),
    )

    # ========== 公告层 ==========
    def cninfo_announcement(symbol: str, **kwargs) -> Any:
        try:
            import akshare as ak

            df = ak.stock_zh_a_disclosure_report_cninfo(symbol=symbol)
            return df
        except Exception as e:
            logger.warning(f"[cninfo] {symbol} failed: {e}")
            return None

    def mootdx_announcement(symbol: str, **kwargs) -> Any:
        try:
            from mootdx.announcements import Announcements

            ann = Announcements()
            df = ann.announcement(symbol=symbol)
            return df
        except Exception as e:
            logger.warning(f"[mootdx_announcement] {symbol} failed: {e}")
            return None

    router.register_source(
        "announcements",
        "cninfo",
        cninfo_announcement,
        DataSourceConfig(
            name="cninfo",
            priority=DataSourcePriority.PRIMARY,
            timeout=15.0,
            rate_limit_interval=1.0,
            rate_limit_per_minute=20,
        ),
    )

    router.register_source(
        "announcements",
        "mootdx",
        mootdx_announcement,
        DataSourceConfig(
            name="mootdx",
            priority=DataSourcePriority.FALLBACK,
            timeout=10.0,
            rate_limit_interval=0.5,
            rate_limit_per_minute=30,
        ),
    )

    # ========== 资本运作层 ==========
    def akshare_capital_operation(symbol: str, **kwargs) -> Any:
        """从 akshare 获取资本运作数据（募集资金、收购兼并等）"""
        try:
            import akshare as ak

            result = {
                "fund_raising": [],
                "project_investment": [],
                "acquisition": [],
                "equity_investment": [],
                "equity_transfer": [],
                "related_transactions": [],
                "company_info": None,
                "profit_forecast": [],
            }

            # 获取一致预期数据
            try:
                df_forecast = ak.stock_profit_forecast_ths(symbol=symbol)
                if df_forecast is not None and not df_forecast.empty:
                    forecasts = []
                    for _, row in df_forecast.iterrows():
                        forecasts.append({
                            "year": str(row.get("年度", "")),
                            "avg_eps": float(row.get("均值", 0)) if row.get("均值") else None,
                            "org_count": int(row.get("预测机构数", 0)) if row.get("预测机构数") else None,
                            "min_eps": float(row.get("最小值", 0)) if row.get("最小值") else None,
                            "max_eps": float(row.get("最大值", 0)) if row.get("最大值") else None,
                            "industry_avg": float(row.get("行业平均数", 0)) if row.get("行业平均数") else None,
                        })
                    result["profit_forecast"] = forecasts
            except Exception as e:
                logger.debug(f"一致预期数据获取失败: {e}")

            # 获取募集资金数据
            try:
                df_fund = ak.stock_em_mllist(symbol=symbol)
                if df_fund is not None and not df_fund.empty:
                    fund_raising = []
                    for _, row in df_fund.iterrows():
                        fund_raising.append({
                            "announcement_date": str(row.get("公告日期", row.get("公告时间", ""))),
                            "issue_type": str(row.get("发行类别", row.get("发行类型", ""))),
                            "start_date": str(row.get("发行起始日期", row.get("发行日期", ""))),
                            "net_raised": str(row.get("实际募集资金净额", row.get("募集资金净额", ""))),
                            "remaining_end_date": str(row.get("剩余募集资金截止时间", row.get("截止日期", ""))),
                            "remaining": str(row.get("剩余募集资金", "")),
                            "utilization_rate": str(row.get("募集资金使用率", row.get("使用率", ""))),
                        })
                    result["fund_raising"] = fund_raising
            except Exception as e:
                logger.debug(f"募集资金数据获取失败: {e}")

            # 获取收购兼并数据
            try:
                df_acq = ak.stock_cg_equity_mortgage_em(symbol=symbol)
                if df_acq is not None and not df_acq.empty:
                    acquisitions = []
                    for _, row in df_acq.iterrows():
                        acquisitions.append({
                            "announcement_date": str(row.get("公告日期", "")),
                            "transaction_amount": str(row.get("交易金额", "")),
                            "progress": str(row.get("进度", "")),
                            "target": str(row.get("标的", "")),
                            "buyer": str(row.get("买方", "")),
                            "seller": str(row.get("卖方", "")),
                            "overview": str(row.get("概述", "")),
                        })
                    result["acquisition"] = acquisitions
            except Exception as e:
                logger.debug(f"收购兼并数据获取失败: {e}")

            # 获取关联交易数据
            try:
                df_related = ak.stock_gszl_em(symbol=symbol)
                if df_related is not None and not df_related.empty:
                    related = []
                    for _, row in df_related.iterrows():
                        related.append({
                            "announcement_date": str(row.get("公告日期", "")),
                            "transaction_amount": str(row.get("交易金额", "")),
                            "payment_method": str(row.get("支付方式", "")),
                            "counterparty": str(row.get("关联方", "")),
                            "transaction_type": str(row.get("交易类型", "")),
                            "related_relation": str(row.get("关联关系", "")),
                            "description": str(row.get("概述", "")),
                        })
                    result["related_transactions"] = related
            except Exception as e:
                logger.debug(f"关联交易数据获取失败: {e}")

            # 获取公司基本信息
            try:
                df_company = ak.stock_profile_cninfo(symbol=symbol)
                if df_company is not None and not df_company.empty:
                    result["company_info"] = df_company.to_dict("records")
            except Exception as e:
                logger.debug(f"公司基本信息获取失败: {e}")

            return result
        except Exception as e:
            logger.warning(f"[akshare_capital_operation] {symbol} failed: {e}")
            return None

    def eastmoney_capital_operation(symbol: str, **kwargs) -> Any:
        """从东方财富获取资本运作数据"""
        try:
            import akshare as ak

            result = {
                "fund_raising": [],
                "project_investment": [],
                "acquisition": [],
                "equity_investment": [],
                "equity_transfer": [],
                "related_transactions": [],
                "company_info": None,
                "profit_forecast": [],
            }

            # 获取募集资金数据
            try:
                df = ak.stock_em_mllist(symbol=symbol)
                if df is not None and not df.empty:
                    result["fund_raising"] = df.to_dict("records")
            except Exception:
                pass

            # 获取收购兼并数据
            try:
                df = ak.stock_cg_equity_mortgage_em(symbol=symbol)
                if df is not None and not df.empty:
                    result["acquisition"] = df.to_dict("records")
            except Exception:
                pass

            # 获取一致预期数据
            try:
                df = ak.stock_profit_forecast_ths(symbol=symbol)
                if df is not None and not df.empty:
                    result["profit_forecast"] = df.to_dict("records")
            except Exception:
                pass

            return result
        except Exception as e:
            logger.warning(f"[eastmoney_capital_operation] {symbol} failed: {e}")
            return None

    def cninfo_capital_operation(symbol: str, **kwargs) -> Any:
        """从巨潮资讯获取资本运作公告"""
        try:
            import akshare as ak

            result = {
                "fund_raising": [],
                "project_investment": [],
                "acquisition": [],
                "equity_investment": [],
                "equity_transfer": [],
                "related_transactions": [],
                "company_info": None,
                "profit_forecast": [],
            }

            # 从公告中提取资本运作相关公告
            try:
                df = ak.stock_zh_a_disclosure_report_cninfo(symbol=symbol)
                if df is not None and not df.empty:
                    # 过滤资本运作相关公告
                    keywords = ["募集", "增发", "配股", "收购", "兼并", "投资", "关联交易"]
                    related_announcements = []
                    for _, row in df.iterrows():
                        title = str(row.get("公告标题", ""))
                        if any(kw in title for kw in keywords):
                            related_announcements.append({
                                "announcement_date": str(row.get("公告日期", "")),
                                "title": title,
                                "type": "公告",
                            })
                    result["related_transactions"] = related_announcements
            except Exception:
                pass

            return result
        except Exception as e:
            logger.warning(f"[cninfo_capital_operation] {symbol} failed: {e}")
            return None

    router.register_source(
        "capital_operation",
        "akshare",
        akshare_capital_operation,
        DataSourceConfig(
            name="akshare",
            priority=DataSourcePriority.PRIMARY,
            timeout=15.0,
            rate_limit_interval=1.0,
            rate_limit_per_minute=10,
        ),
    )

    router.register_source(
        "capital_operation",
        "eastmoney",
        eastmoney_capital_operation,
        DataSourceConfig(
            name="eastmoney",
            priority=DataSourcePriority.SECONDARY,
            timeout=20.0,
            rate_limit_interval=1.5,
            rate_limit_per_minute=8,
        ),
    )

    router.register_source(
        "capital_operation",
        "cninfo",
        cninfo_capital_operation,
        DataSourceConfig(
            name="cninfo",
            priority=DataSourcePriority.FALLBACK,
            timeout=25.0,
            rate_limit_interval=2.0,
            rate_limit_per_minute=5,
        ),
    )

    logger.info(f"[路由] 初始化完成，共 {len(router.get_all_layers())} 层")


# ============ 便捷函数 ============


def get_market_data(symbol: str, data_key: str = "history", **kwargs) -> SourceResult:
    """获取行情数据"""
    return get_router().route("market", data_key, symbol, **kwargs)


def get_research_data(symbol: str, data_key: str = "report", **kwargs) -> SourceResult:
    """获取研报数据"""
    return get_router().route("research", data_key, symbol, **kwargs)


def get_news_data(symbol: str, data_key: str = "news", **kwargs) -> SourceResult:
    """获取新闻数据"""
    return get_router().route("news", data_key, symbol, **kwargs)


def get_financial_data(
    symbol: str, data_key: str = "financial", **kwargs
) -> SourceResult:
    """获取财务数据"""
    return get_router().route("financials", data_key, symbol, **kwargs)


def get_announcement_data(
    symbol: str, data_key: str = "announcement", **kwargs
) -> SourceResult:
    """获取公告数据"""
    return get_router().route("announcements", data_key, symbol, **kwargs)


def get_capital_operation_data(
    symbol: str, data_key: str = "capital_operation", **kwargs
) -> SourceResult:
    """获取资本运作数据"""
    return get_router().route("capital_operation", data_key, symbol, **kwargs)


def get_router_status() -> Dict[str, Any]:
    """获取路由状态"""
    return get_router().get_status()
