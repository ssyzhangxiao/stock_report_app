import pandas as pd
from typing import List, Dict, Any

from .sentiment_constants import classify_sentiment


def classify_news(news_df: pd.DataFrame) -> List[Dict]:
    """新闻情感分类（兼容东财等不同来源的列名）"""
    if news_df.empty:
        return []

    results = []
    for _, row in news_df.head(20).iterrows():
        title = str(row.get("新闻标题") or row.get("标题") or "")
        content = str(row.get("新闻内容") or row.get("内容") or "")
        source = str(row.get("文章来源") or row.get("来源") or "")
        pub_time = str(row.get("发布时间") or row.get("publish_time") or "")
        url = str(row.get("url") or row.get("链接") or "")
        text = title + content

        sentiment = classify_sentiment(text)

        results.append(
            {
                "title": title,
                "content": content[:300],
                "publish_time": pub_time,
                "source": source,
                "source_type": "api",
                "url": url,
                "sentiment": sentiment,
            }
        )

    return results


def classify_web_search_result(
    title: str, snippet: str, source: str, url: str
) -> Dict[str, Any]:
    """分类网页搜索结果"""
    text = title + snippet
    return {
        "title": title,
        "content": snippet[:300],
        "publish_time": "",
        "source": source,
        "source_type": "web_search",
        "url": url,
        "sentiment": classify_sentiment(text),
    }


def classify_fetched_article(
    title: str, content: str, source: str, url: str, publish_time: str = ""
) -> Dict[str, Any]:
    """分类网页抓取结果"""
    text = title + content
    return {
        "title": title,
        "content": content[:300],
        "publish_time": publish_time,
        "source": source,
        "source_type": "web_fetch",
        "url": url,
        "sentiment": classify_sentiment(text),
    }
