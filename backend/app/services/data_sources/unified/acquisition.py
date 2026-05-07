"""
统一入口 — UnifiedDataAcquisition + 便捷函数
"""

import logging
from typing import Dict, Optional

from .common import DataResult, SourceStatus
from .market import MarketDataProvider
from .research import ResearchProvider
from .news import NewsProvider
from .financials import FinancialsProvider
from .announcements import AnnouncementsProvider as AnnouncementProvider

logger = logging.getLogger(__name__)


class UnifiedDataAcquisition:
    """A股数据统一获取模块 — 五层架构"""

    def __init__(self):
        self._market = MarketDataProvider()
        self._research = ResearchProvider()
        self._news = NewsProvider()
        self._financials = FinancialsProvider()
        self._announcements = AnnouncementProvider()

    def get_market_data(self, symbol: str, include_kline: bool = True,
                        kline_days: int = 120) -> DataResult:
        return self._market.get_market_data(symbol, include_kline, kline_days)

    def get_research(self, symbol: str, include_iwencai: bool = False) -> DataResult:
        return self._research.get_research(symbol, include_iwencai)

    def get_news(self, symbol: str, include_global: bool = False) -> DataResult:
        return self._news.get_news(symbol, include_global)

    def get_financials(self, symbol: str) -> DataResult:
        return self._financials.get_financials(symbol)

    def get_announcements(self, symbol: str) -> DataResult:
        return self._announcements.get_announcements(symbol)

    def get_capital_operation(self, symbol: str) -> DataResult:
        return self._announcements.get_capital_operation(symbol)

    def get_all(self, symbol: str) -> Dict[str, DataResult]:
        results = {}
        for name, method in [
            ("market", self.get_market_data),
            ("research", self.get_research),
            ("news", self.get_news),
            ("financials", self.get_financials),
            ("announcements", self.get_announcements),
            ("capital_operation", self.get_capital_operation),
        ]:
            try:
                results[name] = method(symbol)
            except Exception as e:
                results[name] = DataResult(
                    success=False, error=str(e),
                    source="unified", status=SourceStatus.UNAVAILABLE,
                )
        return results


_unified_instance: Optional[UnifiedDataAcquisition] = None


def get_unified_acquisition() -> UnifiedDataAcquisition:
    global _unified_instance
    if _unified_instance is None:
        _unified_instance = UnifiedDataAcquisition()
    return _unified_instance


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


def get_capital_operation(symbol: str, **kwargs) -> DataResult:
    return get_unified_acquisition().get_capital_operation(symbol, **kwargs)