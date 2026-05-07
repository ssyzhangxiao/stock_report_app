"""
新闻层 — 覆盖2个维度
  5.新闻舆情(近期新闻)  11.新闻情绪(正面/负面)

数据源:
  - akshare (个股新闻/财联社快讯/全球资讯)
  - AI (Qwen/DeepSeek，新闻情绪分析)
"""

import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

import pandas as pd

from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus

logger = logging.getLogger(__name__)


class NewsProvider:

    def __init__(self):
        self._ak = None
        self._rate_limiter = RateLimiter(min_interval=0.5, max_per_minute=30)

    @property
    def _akshare(self):
        if self._ak is None:
            from ..akshare_source import AkShareDataSource
            self._ak = AkShareDataSource()
        return self._ak

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_stock_news(self, symbol: str, limit: int = 30) -> Optional[List[Dict]]:
        try:
            self._rate_limiter.wait()
            df = self._akshare.get_news(symbol)
            if df is None or df.empty:
                return None
            df = df.head(limit)
            news = []
            for _, row in df.iterrows():
                news.append({
                    "title": str(row.get("标题", "")),
                    "content": str(row.get("内容", ""))[:200],
                    "date": str(row.get("发布时间", "")),
                    "source": str(row.get("来源", "")),
                    "url": str(row.get("链接", "")),
                })
            return news
        except Exception as e:
            logger.warning(f"[新闻] 个股新闻失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_cls_telegraph(self, limit: int = 20) -> Optional[List[Dict]]:
        try:
            self._rate_limiter.wait()
            df = self._akshare.get_cls_telegraph()
            if df is None or df.empty:
                return None
            df = df.head(limit)
            news = []
            for _, row in df.iterrows():
                news.append({
                    "title": str(row.get("标题", "")),
                    "content": str(row.get("内容", ""))[:200],
                    "date": str(row.get("时间", "")),
                    "source": "财联社",
                })
            return news
        except Exception as e:
            logger.warning(f"[新闻] 财联社快讯失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_global_news(self, limit: int = 20) -> Optional[List[Dict]]:
        try:
            self._rate_limiter.wait()
            df = self._akshare.get_global_news()
            if df is None or df.empty:
                return None
            df = df.head(limit)
            news = []
            for _, row in df.iterrows():
                news.append({
                    "title": str(row.get("标题", "")),
                    "content": str(row.get("内容", ""))[:200],
                    "date": str(row.get("时间", "")),
                    "source": "全球资讯",
                })
            return news
        except Exception as e:
            logger.warning(f"[新闻] 全球资讯失败: {e}")
            return None

    def _analyze_sentiment(self, news_list: List[Dict]) -> Optional[Dict[str, Any]]:
        if not news_list:
            return None
        try:
            from ..llm_service import get_llm_service
            llm = get_llm_service()
            if not llm.is_available():
                return None

            titles = [n.get("title", "") for n in news_list[:15]]
            today = datetime.now().strftime("%Y年%m月%d日")
            prompt = f"""当前日期：{today}
请分析以下新闻标题的情绪倾向，返回JSON：
{json.dumps(titles, ensure_ascii=False, indent=2)}

返回格式：
{{
    "整体情绪": "正面/中性/负面",
    "情绪得分": 0到100的数值（越高越正面），
    "关键主题": ["主题1", "主题2"],
    "正面新闻数": 数值,
    "负面新闻数": 数值,
    "中性新闻数": 数值,
    "总结": "一句话总结新闻情绪"
}}"""
            content = llm.call_llm(
                system_prompt="你是专业的金融新闻分析师，擅长情绪分析。",
                user_prompt=prompt,
                use_json_mode=True,
            )
            if not content:
                return None
            start = content.find("{")
            end = content.rfind("}") + 1
            if start == -1 or end == 0:
                return None
            return json.loads(content[start:end])
        except Exception as e:
            logger.warning(f"[新闻] 情绪分析失败: {e}")
            return None

    def get_news(self, symbol: str, include_global: bool = False) -> DataResult:
        result = {
            "symbol": symbol,
            "stock_news": None,
            "cls_telegraph": None,
            "global_news": None,
            "sentiment_analysis": None,
        }

        try:
            result["stock_news"] = self._get_stock_news(symbol)
        except Exception as e:
            logger.warning(f"[新闻] 个股新闻异常: {e}")

        try:
            result["cls_telegraph"] = self._get_cls_telegraph()
        except Exception as e:
            logger.warning(f"[新闻] 财联社快讯异常: {e}")

        if include_global:
            try:
                result["global_news"] = self._get_global_news()
            except Exception as e:
                logger.warning(f"[新闻] 全球资讯异常: {e}")

        if result["stock_news"]:
            try:
                result["sentiment_analysis"] = self._analyze_sentiment(result["stock_news"])
            except Exception as e:
                logger.warning(f"[新闻] 情绪分析异常: {e}")

        has_data = bool(result["stock_news"] or result["cls_telegraph"])
        status = SourceStatus.OK if has_data else SourceStatus.DEGRADED
        return DataResult(
            success=has_data, data=result, source="akshare+ai",
            status=status,
            metadata={
                "has_stock_news": bool(result["stock_news"]),
                "has_cls": bool(result["cls_telegraph"]),
                "has_sentiment": bool(result["sentiment_analysis"]),
            },
        )
