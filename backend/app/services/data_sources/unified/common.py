"""
通用组件：频率控制、重试机制、数据模型、技术指标计算
"""

import logging
import time
import random
import functools
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from enum import Enum
from threading import Lock

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


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


class SourceStatus(Enum):
    OK = "ok"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


@dataclass
class DataResult:
    success: bool
    data: Any = None
    source: str = ""
    status: SourceStatus = SourceStatus.OK
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


def calc_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def calc_momentum(close: pd.Series, period: int = 20) -> pd.Series:
    return close.pct_change(periods=period) * 100


def calc_volume_ratio(volume: pd.Series, current_minutes: int = 240) -> pd.Series:
    avg_5day_vol = volume.shift(1).rolling(window=5).mean()
    avg_per_minute = avg_5day_vol / 240
    return volume / (avg_per_minute * current_minutes)


def compute_technical_indicators(df: pd.DataFrame) -> Dict[str, Any]:
    if df is None or df.empty:
        return {}
    close = df['close'] if 'close' in df.columns else pd.Series(dtype=float)
    volume = df['volume'] if 'volume' in df.columns else pd.Series(dtype=float)
    result = {}
    if not close.empty:
        result["ma20"] = float(close.iloc[-20:].mean()) if len(close) >= 20 else float(close.mean())
        result["ma60"] = float(close.iloc[-60:].mean()) if len(close) >= 60 else None
        result["rsi14"] = float(calc_rsi(close, 14).iloc[-1]) if len(close) >= 14 else None
        result["momentum_20d"] = float(calc_momentum(close, 20).iloc[-1]) if len(close) >= 21 else None
        result["price_vs_ma20"] = "上方" if result["ma20"] and close.iloc[-1] > result["ma20"] else "下方"
        result["price_vs_ma60"] = "上方" if result.get("ma60") and close.iloc[-1] > result["ma60"] else "下方"
    if not volume.empty:
        result["volume_ratio"] = float(calc_volume_ratio(volume).iloc[-1]) if len(volume) >= 6 else None
    return result
