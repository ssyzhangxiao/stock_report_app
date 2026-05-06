"""
基础数据层 — 覆盖3个维度
  2.行业板块(验证)  5.外汇市场(USD/CNY)  8.核心因素(PE/基本面)

数据源: mootdx F10 (季报/公司概况/股东) + akshare (财务摘要/公司详情/外汇)
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

import pandas as pd

from ..stock_utils import to_mootdx_symbol, get_market
from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus

logger = logging.getLogger(__name__)


class FinancialsProvider:

    def __init__(self):
        self._tdx_client = None
        self._tdx_available: Optional[bool] = None
        self._rate_limiter = RateLimiter(min_interval=0.5, max_per_minute=20)
        self._slow_limiter = RateLimiter(min_interval=1.0, max_per_minute=10)

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
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = to_mootdx_symbol(symbol)
        market = get_market(symbol)
        try:
            df = client.finance(symbol=tdx_symbol, market=market)
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            return {
                "date": str(latest.get('date', '')),
                "eps": float(latest.get('每股收益', 0)) if pd.notna(latest.get('每股收益')) else None,
                "bps": float(latest.get('每股净资产', 0)) if pd.notna(latest.get('每股净资产')) else None,
                "roe": float(latest.get('净资产收益率', 0)) if pd.notna(latest.get('净资产收益率')) else None,
                "total_shares": float(latest.get('总股本', 0)) if pd.notna(latest.get('总股本')) else None,
                "circulating_shares": float(latest.get('流通股', 0)) if pd.notna(latest.get('流通股')) else None,
                "source": "mootdx_f10",
            }
        except Exception as e:
            logger.warning(f"[F10] 季报失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = to_mootdx_symbol(symbol)
        market = get_market(symbol)
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
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = to_mootdx_symbol(symbol)
        market = get_market(symbol)
        try:
            df = client.xdxr(symbol=tdx_symbol, market=market)
            if df is None or df.empty:
                return None
            shareholders = []
            for _, row in df.head(10).iterrows():
                shareholders.append({
                    "name": str(row.get('name', '')),
                    "shares": float(row.get('shares', 0)) if pd.notna(row.get('shares')) else None,
                    "ratio": float(row.get('ratio', 0)) if pd.notna(row.get('ratio')) else None,
                })
            return shareholders
        except Exception as e:
            logger.warning(f"[F10] 股东研究失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_akshare_financials(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_financial_abstract_ths(symbol=symbol, indicator='按报告期')
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            return {
                "date": str(latest.get('报告期', '')),
                "revenue": float(latest.get('营业总收入', 0)) if pd.notna(latest.get('营业总收入')) else None,
                "net_profit": float(latest.get('净利润', 0)) if pd.notna(latest.get('净利润')) else None,
                "total_assets": float(latest.get('资产总计', 0)) if pd.notna(latest.get('资产总计')) else None,
                "total_liabilities": float(latest.get('负债合计', 0)) if pd.notna(latest.get('负债合计')) else None,
                "source": "akshare",
            }
        except Exception as e:
            logger.warning(f"[基础数据] akshare财务失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_company_detail(self, symbol: str) -> Optional[Dict[str, str]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_individual_info_em(symbol=symbol)
            if df is None or df.empty:
                return None
            info_dict = {}
            for _, row in df.iterrows():
                key = str(row.get('item', ''))
                value = str(row.get('value', ''))
                info_dict[key] = value
            return info_dict
        except Exception as e:
            logger.warning(f"[基础数据] 公司详细信息失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_forex_rate(self) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak
            self._slow_limiter.wait()
            df = ak.currency_boc_sina(symbol='美元')
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            rate = latest.get('现汇卖出价', latest.get('卖出价', 0))
            return {
                "currency_pair": "USD/CNY",
                "rate": float(rate) if pd.notna(rate) else None,
                "date": str(latest.get('日期', datetime.now().strftime('%Y-%m-%d'))),
                "source": "akshare_forex",
            }
        except Exception as e:
            logger.warning(f"[基础数据] 外汇汇率失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_forex_hist(self) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._slow_limiter.wait()
            df = ak.currency_hist(symbol='美元')
            if df is None or df.empty:
                return None
            hist = []
            for _, row in df.tail(30).iterrows():
                hist.append({
                    "date": str(row.get('日期', '')),
                    "close": float(row.get('收盘', 0)) if pd.notna(row.get('收盘')) else None,
                })
            return hist
        except Exception as e:
            logger.warning(f"[基础数据] 历史汇率失败: {e}")
            return None

    def get_financials(self, symbol: str) -> DataResult:
        result = {
            "finance": None,
            "company_info": None,
            "shareholders": [],
            "akshare_financials": None,
            "company_detail": None,
            "forex_rate": None,
            "forex_hist": [],
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

        try:
            result["akshare_financials"] = self._get_akshare_financials(symbol)
        except Exception as e:
            logger.warning(f"[基础数据] akshare财务异常: {e}")

        try:
            result["company_detail"] = self._get_company_detail(symbol)
        except Exception as e:
            logger.warning(f"[基础数据] 公司详细信息异常: {e}")

        try:
            result["forex_rate"] = self._get_forex_rate()
        except Exception as e:
            logger.warning(f"[基础数据] 外汇汇率异常: {e}")

        try:
            result["forex_hist"] = self._get_forex_hist() or []
        except Exception as e:
            logger.warning(f"[基础数据] 历史汇率异常: {e}")

        has_data = bool(result["finance"] or result["company_info"] or result["akshare_financials"])
        status = SourceStatus.OK if has_data else SourceStatus.DEGRADED
        return DataResult(
            success=has_data, data=result, source="mootdx_f10+akshare",
            status=status,
            metadata={
                "tdx_available": self.is_tdx_available(),
                "has_forex": bool(result["forex_rate"]),
            },
        )
