"""
基础数据层 — 覆盖5个维度
  8.财务指标(ROE/ROA/毛利率)  9.估值指标(PE/PB/PS)
  16.盈利能力(净利润率)       17.成长性(营收/利润增速)
  18.偿债能力(资产负债率)

数据源:
  - mootdx F10 (TCP，季报37字段/公司概况/股东研究)
  - akshare 基本面 (HTTP低频辅助)
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

import pandas as pd

from ..stock_utils import to_mootdx_symbol, is_sse
from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus

logger = logging.getLogger(__name__)


class FinancialsProvider:

    def __init__(self):
        self._tdx_client = None
        self._tdx_available: Optional[bool] = None
        self._ak = None
        self._rate_limiter = RateLimiter(min_interval=0.5, max_per_minute=30)
        self._slow_limiter = RateLimiter(min_interval=1.5, max_per_minute=8)

    @property
    def _akshare(self):
        if self._ak is None:
            from ..akshare_source import AkShareDataSource
            self._ak = AkShareDataSource()
        return self._ak

    @property
    def tdx_client(self):
        if self._tdx_client is None and self._tdx_available is not False:
            try:
                from mootdx.quotes import Quotes
                self._tdx_client = Quotes.factory(market='std', timeout=10)
                self._tdx_available = True
                logger.info("[mootdx] F10客户端初始化成功")
            except Exception as e:
                self._tdx_available = False
                logger.warning(f"[mootdx] F10初始化失败: {e}")
        return self._tdx_client

    def is_tdx_available(self) -> bool:
        if self._tdx_available is None:
            self.tdx_client
        return self._tdx_available is True

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_finance(self, symbol: str) -> Optional[pd.DataFrame]:
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = to_mootdx_symbol(symbol)
        df = client.finance(symbol=tdx_symbol)
        if df is not None and not df.empty:
            return df
        return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_xdxr(self, symbol: str) -> Optional[pd.DataFrame]:
        client = self.tdx_client
        if not client:
            return None
        self._rate_limiter.wait()
        tdx_symbol = to_mootdx_symbol(symbol)
        df = client.xdxr(symbol=tdx_symbol)
        if df is not None and not df.empty:
            return df
        return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_akshare_financials(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            self._slow_limiter.wait()
            df = self._akshare.get_financial_indicators(symbol)
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            return {
                "report_date": str(latest.get("报告日", "")),
                "eps": float(latest.get("摊薄每股收益(元)", 0)) if pd.notna(latest.get("摊薄每股收益(元)")) else None,
                "bps": float(latest.get("每股净资产(元)", 0)) if pd.notna(latest.get("每股净资产(元)")) else None,
                "roe": float(latest.get("净资产收益率(%)", 0)) if pd.notna(latest.get("净资产收益率(%)")) else None,
                "gross_margin": float(latest.get("销售毛利率(%)", 0)) if pd.notna(latest.get("销售毛利率(%)")) else None,
                "net_margin": float(latest.get("销售净利率(%)", 0)) if pd.notna(latest.get("销售净利率(%)")) else None,
                "debt_ratio": float(latest.get("资产负债率(%)", 0)) if pd.notna(latest.get("资产负债率(%)")) else None,
                "current_ratio": float(latest.get("流动比率", 0)) if pd.notna(latest.get("流动比率")) else None,
                "quick_ratio": float(latest.get("速动比率", 0)) if pd.notna(latest.get("速动比率")) else None,
                "source": "akshare_financials",
            }
        except Exception as e:
            logger.warning(f"[财务] akshare财务指标失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_akshare_growth(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            self._slow_limiter.wait()
            df = self._akshare.get_profit_forecast(symbol)
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            return {
                "year": str(latest.get("年度", "")),
                "net_profit": float(latest.get("净利润", 0)) if pd.notna(latest.get("净利润")) else None,
                "revenue": float(latest.get("营业收入", 0)) if pd.notna(latest.get("营业收入")) else None,
                "eps": float(latest.get("每股收益", 0)) if pd.notna(latest.get("每股收益")) else None,
                "source": "akshare_growth",
            }
        except Exception as e:
            logger.warning(f"[财务] akshare成长性失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_akshare_holders(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            self._slow_limiter.wait()
            df = self._akshare.get_top10_holders(symbol)
            if df is None or df.empty:
                return None
            holders = []
            for _, row in df.head(10).iterrows():
                holders.append({
                    "name": str(row.get("股东名称", "")),
                    "shares": str(row.get("持股数", "")),
                    "ratio": str(row.get("占总股本比例", "")),
                })
            return {"top10_holders": holders, "source": "akshare_holders"}
        except Exception as e:
            logger.warning(f"[财务] akshare股东失败: {e}")
            return None

    def get_financials(self, symbol: str) -> DataResult:
        result = {
            "symbol": symbol,
            "tdx_finance": None,
            "tdx_xdxr": None,
            "financial_indicators": None,
            "growth_data": None,
            "holders": None,
        }

        if self.is_tdx_available():
            try:
                result["tdx_finance"] = self._get_tdx_finance(symbol)
            except Exception as e:
                logger.warning(f"[财务] mootdx F10失败: {e}")
            try:
                result["tdx_xdxr"] = self._get_tdx_xdxr(symbol)
            except Exception as e:
                logger.warning(f"[财务] mootdx 除权除息失败: {e}")

        try:
            result["financial_indicators"] = self._get_akshare_financials(symbol)
        except Exception as e:
            logger.warning(f"[财务] akshare财务指标异常: {e}")

        try:
            result["growth_data"] = self._get_akshare_growth(symbol)
        except Exception as e:
            logger.warning(f"[财务] akshare成长性异常: {e}")

        try:
            result["holders"] = self._get_akshare_holders(symbol)
        except Exception as e:
            logger.warning(f"[财务] akshare股东异常: {e}")

        has_data = bool(
            result["tdx_finance"] is not None
            or result["financial_indicators"]
            or result["growth_data"]
        )
        status = SourceStatus.OK if has_data else SourceStatus.DEGRADED
        return DataResult(
            success=has_data, data=result, source="mootdx+akshare",
            status=status,
            metadata={
                "tdx_available": self.is_tdx_available(),
                "has_finance": bool(result["tdx_finance"] is not None),
                "has_indicators": bool(result["financial_indicators"]),
                "has_growth": bool(result["growth_data"]),
                "has_holders": bool(result["holders"]),
            },
        )
