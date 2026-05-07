"""
公告层 — 覆盖1个维度
  19.公告事件(近期公告)

数据源:
  - 巨潮 cninfo (爬虫方式，沪/深/北交所公告全文及摘要)
  - mootdx F10 "最新提示" (公告快速浏览，仅作补充)
  - akshare (个股公告)
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

import pandas as pd

from ..stock_utils import to_mootdx_symbol, is_sse
from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus

logger = logging.getLogger(__name__)


class AnnouncementsProvider:

    def __init__(self):
        self._tdx_client = None
        self._tdx_available: Optional[bool] = None
        self._ak = None
        self._rate_limiter = RateLimiter(min_interval=1.0, max_per_minute=20)
        self._slow_limiter = RateLimiter(min_interval=2.0, max_per_minute=5)

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
                logger.info("[mootdx] 公告客户端初始化成功")
            except Exception as e:
                self._tdx_available = False
                logger.warning(f"[mootdx] 公告初始化失败: {e}")
        return self._tdx_client

    def is_tdx_available(self) -> bool:
        if self._tdx_available is None:
            self.tdx_client
        return self._tdx_available is True

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_cninfo_announcements(self, symbol: str, limit: int = 20) -> Optional[List[Dict]]:
        try:
            self._slow_limiter.wait()
            df = self._akshare.get_cninfo_announcements(symbol)
            if df is None or df.empty:
                return None
            df = df.head(limit)
            announcements = []
            for _, row in df.iterrows():
                announcements.append({
                    "title": str(row.get("公告标题", "")),
                    "date": str(row.get("公告日期", "")),
                    "type": str(row.get("公告类型", "")),
                    "source": "cninfo",
                })
            return announcements
        except Exception as e:
            logger.warning(f"[公告] cninfo失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_tdx_notices(self, symbol: str) -> Optional[List[Dict]]:
        client = self.tdx_client
        if not client:
            return None
        try:
            self._rate_limiter.wait()
            tdx_symbol = to_mootdx_symbol(symbol)
            df = client.finance(symbol=tdx_symbol)
            if df is None or df.empty:
                return None
            notices = []
            for _, row in df.head(10).iterrows():
                notices.append({
                    "title": str(row.get("事项", "")),
                    "date": str(row.get("日期", "")),
                    "source": "mootdx_f10",
                })
            return notices
        except Exception as e:
            logger.warning(f"[公告] mootdx F10失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_akshare_announcements(self, symbol: str, limit: int = 20) -> Optional[List[Dict]]:
        try:
            self._rate_limiter.wait()
            df = self._akshare.get_announcements(symbol)
            if df is None or df.empty:
                return None
            df = df.head(limit)
            announcements = []
            for _, row in df.iterrows():
                announcements.append({
                    "title": str(row.get("公告标题", "")),
                    "date": str(row.get("公告日期", "")),
                    "source": "akshare",
                })
            return announcements
        except Exception as e:
            logger.warning(f"[公告] akshare公告失败: {e}")
            return None

    def get_announcements(self, symbol: str) -> DataResult:
        result = {
            "symbol": symbol,
            "cninfo_announcements": None,
            "tdx_notices": None,
            "akshare_announcements": None,
        }

        try:
            result["cninfo_announcements"] = self._get_cninfo_announcements(symbol)
        except Exception as e:
            logger.warning(f"[公告] cninfo异常: {e}")

        if self.is_tdx_available():
            try:
                result["tdx_notices"] = self._get_tdx_notices(symbol)
            except Exception as e:
                logger.warning(f"[公告] mootdx异常: {e}")

        if not result["cninfo_announcements"]:
            try:
                result["akshare_announcements"] = self._get_akshare_announcements(symbol)
            except Exception as e:
                logger.warning(f"[公告] akshare异常: {e}")

        has_data = bool(
            result["cninfo_announcements"]
            or result["tdx_notices"]
            or result["akshare_announcements"]
        )
        status = SourceStatus.OK if has_data else SourceStatus.DEGRADED
        return DataResult(
            success=has_data, data=result, source="cninfo+mootdx+akshare",
            status=status,
            metadata={
                "has_cninfo": bool(result["cninfo_announcements"]),
                "has_tdx": bool(result["tdx_notices"]),
                "has_akshare": bool(result["akshare_announcements"]),
            },
        )
