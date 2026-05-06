"""
新闻层 — 覆盖3个维度
  9.风险预警(新闻风险词扫描)  11.事件驱动(财经快讯)  15.市场情绪(新闻情感)

数据源: akshare (个股新闻/财联社快讯/全球资讯)
"""

import logging
from typing import Dict, Any, Optional, List

from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus

logger = logging.getLogger(__name__)


class NewsProvider:

    _RISK_KEYWORDS = [
        "违规", "处罚", "罚款", "调查", "立案", "诉讼", "仲裁",
        "亏损", "退市", "ST", "*ST", "停牌", "暂停上市",
        "减持", "质押", "冻结", "司法", "破产", "重整",
        "重大资产重组失败", "业绩变脸", "财务造假", "信披违规",
        "监管函", "问询函", "关注函", "警示函",
        "商誉减值", "资产减值", "债务违约", "流动性危机",
        "安全事故", "环保处罚", "产品质量", "召回",
        "高管离职", "控制权变更", "股东纠纷",
    ]

    _POSITIVE_KEYWORDS = [
        "增长", "突破", "创新", "中标", "签约", "获批",
        "回购", "增持", "分红", "送转", "业绩预增",
        "订单", "合作", "战略", "投资", "扩产",
        "专利", "认证", "获奖", "评级上调",
    ]

    def __init__(self):
        self._rate_limiter = RateLimiter(min_interval=0.5, max_per_minute=20)

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_stock_news(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_news_em(symbol=symbol)
            if df is None or df.empty:
                return None
            news = []
            for _, row in df.head(30).iterrows():
                title = str(row.get('新闻标题', ''))
                content = str(row.get('新闻内容', ''))[:300]
                news.append({
                    "title": title,
                    "content": content,
                    "time": str(row.get('发布时间', '')),
                    "source": str(row.get('文章来源', '')),
                    "url": str(row.get('新闻链接', '')),
                    "type": "stock_news",
                    "risk_scan": self._scan_risk(title + content),
                    "sentiment": self._analyze_sentiment(title + content),
                })
            return news
        except Exception as e:
            logger.warning(f"[新闻] 个股新闻失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_cls_telegraph(self) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_info_global_cls()
            if df is None or df.empty:
                return None
            news = []
            for _, row in df.head(20).iterrows():
                title = str(row.get('标题', ''))
                content = str(row.get('内容', ''))[:200]
                news.append({
                    "title": title,
                    "time": str(row.get('发布时间', '')),
                    "content": content,
                    "type": "cls_telegraph",
                    "risk_scan": self._scan_risk(title + content),
                })
            return news
        except Exception as e:
            logger.warning(f"[新闻] 财联社快讯失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=0.5)
    def _get_global_news(self) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_info_global_em()
            if df is None or df.empty:
                return None
            news = []
            for _, row in df.head(15).iterrows():
                news.append({
                    "title": str(row.get('标题', '')),
                    "time": str(row.get('发布时间', '')),
                    "content": str(row.get('摘要', ''))[:200],
                    "url": str(row.get('链接', '')),
                    "type": "global",
                })
            return news
        except Exception as e:
            logger.warning(f"[新闻] 全球资讯失败: {e}")
            return None

    def _scan_risk(self, text: str) -> Dict[str, Any]:
        if not text:
            return {"has_risk": False, "risk_words": [], "risk_level": "无"}
        found = [kw for kw in self._RISK_KEYWORDS if kw in text]
        level = "高风险" if len(found) >= 3 else ("中风险" if len(found) >= 1 else "无")
        return {"has_risk": len(found) > 0, "risk_words": found, "risk_level": level}

    def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        if not text:
            return {"sentiment": "中性", "score": 0}
        pos_count = sum(1 for kw in self._POSITIVE_KEYWORDS if kw in text)
        neg_count = sum(1 for kw in self._RISK_KEYWORDS if kw in text)
        score = pos_count - neg_count
        sentiment = "正面" if score > 0 else ("负面" if score < 0 else "中性")
        return {"sentiment": sentiment, "score": score, "positive_words": pos_count, "negative_words": neg_count}

    def get_news(self, symbol: str, include_global: bool = False) -> DataResult:
        result = {
            "stock_news": [],
            "cls_telegraph": [],
            "global_news": [],
            "sentiment_summary": {"positive": 0, "negative": 0, "neutral": 0},
            "risk_summary": {"high_risk": 0, "medium_risk": 0, "no_risk": 0},
        }

        try:
            stock_news = self._get_stock_news(symbol)
            if stock_news:
                result["stock_news"] = stock_news
        except Exception as e:
            logger.warning(f"[新闻] 个股新闻异常: {e}")

        try:
            cls_news = self._get_cls_telegraph()
            if cls_news:
                result["cls_telegraph"] = cls_news
        except Exception as e:
            logger.warning(f"[新闻] 财联社异常: {e}")

        if include_global:
            try:
                result["global_news"] = self._get_global_news() or []
            except Exception as e:
                logger.warning(f"[新闻] 全球资讯异常: {e}")

        all_news = result["stock_news"] + result["cls_telegraph"]
        for item in all_news:
            sent = item.get("sentiment", {}).get("sentiment", "中性")
            if sent == "正面":
                result["sentiment_summary"]["positive"] += 1
            elif sent == "负面":
                result["sentiment_summary"]["negative"] += 1
            else:
                result["sentiment_summary"]["neutral"] += 1

            risk = item.get("risk_scan", {}).get("risk_level", "无")
            if risk == "高风险":
                result["risk_summary"]["high_risk"] += 1
            elif risk == "中风险":
                result["risk_summary"]["medium_risk"] += 1
            else:
                result["risk_summary"]["no_risk"] += 1

        total = len(result["stock_news"]) + len(result["cls_telegraph"])
        status = SourceStatus.OK if total > 0 else SourceStatus.DEGRADED
        risk_ratio = round(
            (result["risk_summary"]["high_risk"] + result["risk_summary"]["medium_risk"]) / max(total, 1) * 100, 1
        )
        return DataResult(
            success=total > 0, data=result, source="akshare",
            status=status, metadata={"total": total, "risk_ratio": risk_ratio},
        )
