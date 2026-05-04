"""
多源新闻聚合服务 - 整合东财API、网页搜索、网页抓取等多源新闻
参考搜索流程:
  1. 网页搜索: 股票名+代码 最新股价财务数据业绩
  2. 网页搜索: 股票名+代码 technical analysis stock price target
  3. 网页获取: k.sina.cn / xueqiu.com / www.futunn.com
  4. 网页搜索: 股票名+代码 股价走势 技术分析 支撑阻力位
  5. 网页搜索: 股票名+代码 风险因素 监管 投资风险
  6. 网页获取: xueqiu.com / cn.investing.com / news.10jqka.com.cn
  7. 网页获取: quote.eastmoney.com
  8. 网页搜索: 股票名+代码 PE估值 目标价 机构观点 买入理由
"""

import logging
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from .web_search_service import get_web_search_service, WebSearchResult
from .web_fetch_service import get_web_fetch_service, FetchedArticle

logger = logging.getLogger(__name__)

POSITIVE_KW = ['增长', '新高', '买入', '增持', '利好', '超预期', '突破', '上涨', '盈利',
               '回购', '分红', '业绩预增', '订单', '扩产', '创新高', '机构买入']
NEGATIVE_KW = ['下跌', '风险', '减持', '利空', '调查', '诉讼', '亏损', '下滑', '违规',
               '退市', '质押', '爆仓', '处罚', '警示', '问询', '监管']


def _classify_sentiment(text: str) -> str:
    pos = sum(1 for kw in POSITIVE_KW if kw in text)
    neg = sum(1 for kw in NEGATIVE_KW if kw in text)
    if pos > neg:
        return "positive"
    elif neg > pos:
        return "negative"
    return "neutral"


def _deduplicate(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    result = []
    for item in items:
        key = (item.get("title", "")[:50], item.get("source", ""))
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


class NewsAggregator:
    """多源新闻聚合器"""

    def aggregate(self, symbol: str, existing_news: List[Dict] = None) -> Dict[str, Any]:
        """
        聚合多源新闻
        返回: {
            "news_analysis": [...],  # 合并后的新闻列表
            "web_search_results": [...],  # 搜索结果
            "web_fetch_results": [...],  # 抓取结果
            "sources_summary": {...},  # 来源统计
        }
        """
        logger.info(f"[NewsAggregator] 开始聚合 {symbol} 的多源新闻")

        search_results = []
        fetch_results = []
        all_news = list(existing_news or [])

        with ThreadPoolExecutor(max_workers=3) as pool:
            search_future = pool.submit(self._do_web_search, symbol)
            fetch_future = pool.submit(self._do_web_fetch, symbol)

            for future in as_completed([search_future, fetch_future], timeout=20):
                try:
                    result = future.result(timeout=10)
                    if isinstance(result, list) and result and isinstance(result[0], WebSearchResult):
                        search_results = result
                    elif isinstance(result, list) and result and isinstance(result[0], FetchedArticle):
                        fetch_results = result
                except Exception as e:
                    logger.warning(f"[NewsAggregator] 子任务失败: {e}")

        for sr in search_results:
            all_news.append({
                "title": sr.title,
                "content": sr.snippet[:300],
                "publish_time": datetime.now().strftime("%Y-%m-%d"),
                "source": sr.source,
                "source_type": "web_search",
                "url": sr.url,
                "sentiment": _classify_sentiment(sr.title + sr.snippet),
            })

        for fa in fetch_results:
            all_news.append({
                "title": fa.title,
                "content": fa.content[:300],
                "publish_time": fa.publish_time,
                "source": fa.source,
                "source_type": "web_fetch",
                "url": fa.url,
                "sentiment": _classify_sentiment(fa.title + fa.content),
            })

        all_news = _deduplicate(all_news)

        all_news.sort(key=lambda x: (
            0 if x.get("source_type") == "api" else 1 if x.get("source_type") == "web_fetch" else 2,
            x.get("publish_time", ""),
        ))

        sources_summary = self._build_sources_summary(all_news, search_results, fetch_results)

        logger.info(f"[NewsAggregator] 聚合完成: API新闻{len(existing_news or [])}条, "
                     f"搜索{len(search_results)}条, 抓取{len(fetch_results)}条, "
                     f"去重后{len(all_news)}条")

        return {
            "news_analysis": all_news,
            "web_search_results": [r.to_dict() for r in search_results],
            "web_fetch_results": [r.to_dict() for r in fetch_results],
            "sources_summary": sources_summary,
        }

    def _do_web_search(self, symbol: str) -> List[WebSearchResult]:
        try:
            service = get_web_search_service()
            return service.search_stock_news(symbol, max_results=10)
        except Exception as e:
            logger.warning(f"[NewsAggregator] 网页搜索失败: {e}")
            return []

    def _do_web_fetch(self, symbol: str) -> List[FetchedArticle]:
        try:
            service = get_web_fetch_service()
            return service.fetch_stock_pages(symbol)
        except Exception as e:
            logger.warning(f"[NewsAggregator] 网页抓取失败: {e}")
            return []

    def _build_sources_summary(self, all_news, search_results, fetch_results) -> Dict[str, Any]:
        api_count = sum(1 for n in all_news if n.get("source_type") == "api" or not n.get("source_type"))
        search_count = len(search_results)
        fetch_count = len(fetch_results)

        source_domains = {}
        for n in all_news:
            src = n.get("source", "unknown")
            source_domains[src] = source_domains.get(src, 0) + 1

        pos = sum(1 for n in all_news if n.get("sentiment") == "positive")
        neg = sum(1 for n in all_news if n.get("sentiment") == "negative")
        neu = sum(1 for n in all_news if n.get("sentiment") == "neutral")

        return {
            "total": len(all_news),
            "by_type": {
                "api": api_count,
                "web_search": search_count,
                "web_fetch": fetch_count,
            },
            "by_domain": source_domains,
            "sentiment_distribution": {
                "positive": pos,
                "negative": neg,
                "neutral": neu,
            },
        }


_news_aggregator: Optional[NewsAggregator] = None


def get_news_aggregator() -> NewsAggregator:
    global _news_aggregator
    if _news_aggregator is None:
        _news_aggregator = NewsAggregator()
    return _news_aggregator
