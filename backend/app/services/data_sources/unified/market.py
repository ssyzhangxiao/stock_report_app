"""
行情层 — 覆盖7个维度
  1.价格趋势(K线MA20/MA60)  4.市场环境(大盘涨跌)
  7.历史趋势               10.资金流向
  12.动量因子(20日涨幅)     13.成交量(量比)
  14.RSI(14)               15.市场情绪(大盘涨跌家数)

数据源: mootdx (TCP实时) + akshare (HTTP备份)
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

import pandas as pd

from ..stock_utils import to_mootdx_symbol, is_sse
from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus, compute_technical_indicators

logger = logging.getLogger(__name__)


class MarketDataProvider:

    def __init__(self):
        self._tdx_client = None
        self._tdx_available: Optional[bool] = None
        self._rate_limiter = RateLimiter(min_interval=0.3, max_per_minute=40)
        self._slow_limiter = RateLimiter(min_interval=1.0, max_per_minute=10)

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
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = to_mootdx_symbol(symbol)
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
                "source": "mootdx",
            }
        return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_valuation(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_zh_a_spot_em()
            if df is None or df.empty:
                return None
            code_col = '代码' if '代码' in df.columns else 'code'
            row = df[df[code_col] == symbol]
            if row.empty:
                return None
            r = row.iloc[0]
            return {
                "pe_ratio": float(r.get('市盈率-动态', 0)) if pd.notna(r.get('市盈率-动态')) else None,
                "pb_ratio": float(r.get('市净率', 0)) if pd.notna(r.get('市净率')) else None,
                "market_cap": float(r.get('总市值', 0)) if pd.notna(r.get('总市值')) else None,
                "circulating_market_cap": float(r.get('流通市值', 0)) if pd.notna(r.get('流通市值')) else None,
                "volume_ratio": float(r.get('量比', 0)) if pd.notna(r.get('量比')) else None,
                "turnover_rate": float(r.get('换手率', 0)) if pd.notna(r.get('换手率')) else None,
                "change_pct": float(r.get('涨跌幅', 0)) if pd.notna(r.get('涨跌幅')) else None,
                "source": "akshare_spot",
            }
        except Exception:
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_kline(self, symbol: str, days: int = 120) -> Optional[pd.DataFrame]:
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = to_mootdx_symbol(symbol)
        df = client.bars(symbol=tdx_symbol, frequency=9, offset=0, start=0, count=days)
        if df is not None and not df.empty:
            df['date'] = pd.to_datetime(df.index)
            df.sort_values('date', inplace=True)
            df['date'] = df['date'].dt.strftime('%Y-%m-%d')
            return df
        return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_akshare_kline(self, symbol: str, days: int = 120) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak
            self._slow_limiter.wait()
            end = datetime.now().strftime("%Y%m%d")
            start = (datetime.now() - timedelta(days=days + 30)).strftime("%Y%m%d")
            df = ak.stock_zh_a_hist(symbol=symbol, period='daily',
                                    start_date=start, end_date=end, adjust='qfq')
            if df is not None and not df.empty:
                df.rename(columns={
                    '日期': 'date', '开盘': 'open', '收盘': 'close',
                    '最高': 'high', '最低': 'low', '成交量': 'volume',
                    '成交额': 'amount',
                }, inplace=True, errors='ignore')
                df['date'] = pd.to_datetime(df['date'])
                df.sort_values('date', inplace=True)
                df['date'] = df['date'].dt.strftime('%Y-%m-%d')
                return df.tail(days)
            return None
        except Exception as e:
            logger.warning(f"[行情] akshare K线降级失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_market_index(self) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_zh_index_spot_em()
            if df is None or df.empty:
                return None
            indices = {}
            for _, row in df.iterrows():
                name = str(row.get('名称', ''))
                if any(k in name for k in ['上证指数', '深证成指', '创业板指', '科创50', '沪深300', '上证50']):
                    indices[name] = {
                        "code": str(row.get('代码', '')),
                        "price": float(row.get('最新价', 0)) if pd.notna(row.get('最新价')) else None,
                        "change_pct": float(row.get('涨跌幅', 0)) if pd.notna(row.get('涨跌幅')) else None,
                        "volume": float(row.get('成交量', 0)) if pd.notna(row.get('成交量')) else None,
                        "amount": float(row.get('成交额', 0)) if pd.notna(row.get('成交额')) else None,
                    }
            return indices if indices else None
        except Exception as e:
            logger.warning(f"[行情] 大盘指数失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_market_breadth(self) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_zh_a_spot_em()
            if df is None or df.empty:
                return None
            up_count = len(df[df['涨跌幅'] > 0]) if '涨跌幅' in df.columns else 0
            down_count = len(df[df['涨跌幅'] < 0]) if '涨跌幅' in df.columns else 0
            flat_count = len(df[df['涨跌幅'] == 0]) if '涨跌幅' in df.columns else 0
            total = len(df)
            return {
                "up_count": up_count,
                "down_count": down_count,
                "flat_count": flat_count,
                "total": total,
                "up_ratio": round(up_count / total * 100, 1) if total > 0 else 0,
                "breadth_signal": "偏多" if up_count > down_count * 1.5 else (
                    "偏空" if down_count > up_count * 1.5 else "中性"
                ),
            }
        except Exception as e:
            logger.warning(f"[行情] 市场宽度失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_fund_flow(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak
            self._slow_limiter.wait()
            market = "sh" if is_sse(symbol) else "sz"
            df = ak.stock_individual_fund_flow(stock=symbol, market=market)
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            return {
                "date": str(latest.get('日期', '')),
                "main_net_inflow": float(latest.get('主力净流入', 0)) if pd.notna(latest.get('主力净流入')) else None,
                "main_net_inflow_ratio": float(latest.get('主力净流入占比', 0)) if pd.notna(latest.get('主力净流入占比')) else None,
                "super_large_net": float(latest.get('超大单净流入', 0)) if pd.notna(latest.get('超大单净流入')) else None,
                "large_net": float(latest.get('大单净流入', 0)) if pd.notna(latest.get('大单净流入')) else None,
                "medium_net": float(latest.get('中单净流入', 0)) if pd.notna(latest.get('中单净流入')) else None,
                "small_net": float(latest.get('小单净流入', 0)) if pd.notna(latest.get('小单净流入')) else None,
                "source": "akshare_fund_flow",
            }
        except Exception as e:
            logger.warning(f"[行情] 资金流向失败: {e}")
            return None

    def get_market_data(self, symbol: str, include_kline: bool = True,
                        kline_days: int = 120) -> DataResult:
        result = {
            "symbol": symbol,
            "quote": None,
            "valuation": None,
            "kline": None,
            "technical_indicators": {},
            "market_index": None,
            "market_breadth": None,
            "fund_flow": None,
        }

        if self.is_tdx_available():
            try:
                result["quote"] = self._get_tdx_quote(symbol)
            except Exception as e:
                logger.warning(f"[行情] mootdx实时行情失败: {e}")

        try:
            result["valuation"] = self._get_valuation(symbol)
        except Exception as e:
            logger.warning(f"[行情] 估值指标失败: {e}")

        if include_kline:
            kline_df = None
            if self.is_tdx_available():
                try:
                    kline_df = self._get_tdx_kline(symbol, kline_days)
                except Exception as e:
                    logger.warning(f"[行情] mootdx K线失败: {e}")

            if kline_df is None or kline_df.empty:
                try:
                    kline_df = self._get_akshare_kline(symbol, kline_days)
                except Exception as e:
                    logger.warning(f"[行情] akshare K线失败: {e}")

            if kline_df is not None and not kline_df.empty:
                result["kline"] = kline_df.to_dict(orient='records')
                result["technical_indicators"] = compute_technical_indicators(kline_df)

        try:
            result["market_index"] = self._get_market_index()
        except Exception as e:
            logger.warning(f"[行情] 大盘指数异常: {e}")

        try:
            result["market_breadth"] = self._get_market_breadth()
        except Exception as e:
            logger.warning(f"[行情] 市场宽度异常: {e}")

        try:
            result["fund_flow"] = self._get_fund_flow(symbol)
        except Exception as e:
            logger.warning(f"[行情] 资金流向异常: {e}")

        has_data = bool(result["quote"] or result["valuation"] or result["kline"])
        status = SourceStatus.OK if has_data else SourceStatus.DEGRADED
        return DataResult(
            success=has_data, data=result, source="mootdx+akshare",
            status=status,
            metadata={
                "tdx_available": self.is_tdx_available(),
                "has_kline": bool(result["kline"]),
                "has_index": bool(result["market_index"]),
                "has_fund_flow": bool(result["fund_flow"]),
            },
        )
