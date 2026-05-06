"""
unified 包 — 五层数据架构

行情层     market.py      → MarketDataProvider
研报层     research.py    → ResearchProvider
新闻层     news.py        → NewsProvider
基础数据层 financials.py  → FinancialsProvider
公告层     announcements.py → AnnouncementProvider
统一入口   acquisition.py → UnifiedDataAcquisition + 便捷函数
"""

from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus
from .market import MarketDataProvider
from .research import ResearchProvider
from .news import NewsProvider
from .financials import FinancialsProvider
from .announcements import AnnouncementProvider
from .acquisition import (
    UnifiedDataAcquisition,
    get_unified_acquisition,
    get_market_data,
    get_research,
    get_news,
    get_financials,
    get_announcements,
    get_capital_operation,
)

__all__ = [
    "RateLimiter", "retry_on_failure", "DataResult", "SourceStatus",
    "MarketDataProvider", "ResearchProvider", "NewsProvider",
    "FinancialsProvider", "AnnouncementProvider",
    "UnifiedDataAcquisition", "get_unified_acquisition",
    "get_market_data", "get_research", "get_news",
    "get_financials", "get_announcements", "get_capital_operation",
]
