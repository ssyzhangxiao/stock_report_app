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


def get_router_status() -> Dict[str, Any]:
    """获取路由状态"""
    return get_router().get_status()
