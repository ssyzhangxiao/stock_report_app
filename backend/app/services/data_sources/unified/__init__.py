"""
unified 包 — 五层数据架构

行情层     market.py      → MarketDataProvider
研报层     research.py    → ResearchProvider
新闻层     news.py        → NewsProvider
基础数据层 financials.py  → FinancialsProvider
公告层     announcements.py → AnnouncementsProvider
统一入口   acquisition.py → UnifiedDataAcquisition + 便捷函数
路由器     router.py      → DataSourceRouter + 便捷函数（支持多数据源自动路由和降级）
"""

from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus
from .market import MarketDataProvider
from .research import ResearchProvider
from .news import NewsProvider
from .financials import FinancialsProvider
from .announcements import AnnouncementsProvider as AnnouncementProvider
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
from .router import (
    DataSourceRouter,
    DataSourceConfig,
    DataSourcePriority,
    SourceResult,
    get_router,
    get_router_status,
    get_market_data as router_get_market_data,
    get_research_data as router_get_research_data,
    get_news_data as router_get_news_data,
    get_financial_data as router_get_financial_data,
    get_announcement_data as router_get_announcement_data,
    get_capital_operation_data as router_get_capital_operation_data,
)

__all__ = [
    "RateLimiter", "retry_on_failure", "DataResult", "SourceStatus",
    "MarketDataProvider", "ResearchProvider", "NewsProvider",
    "FinancialsProvider", "AnnouncementProvider",
    "UnifiedDataAcquisition", "get_unified_acquisition",
    "get_market_data", "get_research", "get_news",
    "get_financials", "get_announcements", "get_capital_operation",
    "DataSourceRouter", "DataSourceConfig", "DataSourcePriority", "SourceResult",
    "get_router", "get_router_status",
    "router_get_market_data", "router_get_research_data", "router_get_news_data",
    "router_get_financial_data", "router_get_announcement_data",
    "router_get_capital_operation_data",
]