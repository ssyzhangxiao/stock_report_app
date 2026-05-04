import pandas as pd
from typing import List, Dict, Any


POSITIVE_KW = ['增长', '新高', '买入', '增持', '利好', '超预期', '突破', '上涨', '盈利',
               '回购', '分红', '业绩预增', '订单', '扩产', '创新高', '机构买入']
NEGATIVE_KW = ['下跌', '风险', '减持', '利空', '调查', '诉讼', '亏损', '下滑', '违规',
               '退市', '质押', '爆仓', '处罚', '警示', '问询', '监管']


def classify_news(news_df: pd.DataFrame) -> List[Dict]:
    """新闻情感分类（兼容东财等不同来源的列名）"""
    if news_df.empty:
        return []

    results = []
    for _, row in news_df.head(20).iterrows():
        title = str(row.get('新闻标题') or row.get('标题') or '')
        content = str(row.get('新闻内容') or row.get('内容') or '')
        source = str(row.get('文章来源') or row.get('来源') or '')
        pub_time = str(row.get('发布时间') or row.get('publish_time') or '')
        url = str(row.get('url') or row.get('链接') or '')
        text = title + content

        sentiment = _classify_text(text)

        results.append({
            'title': title,
            'content': content[:300],
            'publish_time': pub_time,
            'source': source,
            'source_type': 'api',
            'url': url,
            'sentiment': sentiment,
        })

    return results


def _classify_text(text: str) -> str:
    pos_count = sum(1 for kw in POSITIVE_KW if kw in text)
    neg_count = sum(1 for kw in NEGATIVE_KW if kw in text)
    if pos_count > neg_count:
        return 'positive'
    elif neg_count > pos_count:
        return 'negative'
    return 'neutral'


def classify_web_search_result(title: str, snippet: str, source: str, url: str) -> Dict[str, Any]:
    """分类网页搜索结果"""
    text = title + snippet
    return {
        'title': title,
        'content': snippet[:300],
        'publish_time': '',
        'source': source,
        'source_type': 'web_search',
        'url': url,
        'sentiment': _classify_text(text),
    }


def classify_fetched_article(title: str, content: str, source: str, url: str, publish_time: str = '') -> Dict[str, Any]:
    """分类网页抓取结果"""
    text = title + content
    return {
        'title': title,
        'content': content[:300],
        'publish_time': publish_time,
        'source': source,
        'source_type': 'web_fetch',
        'url': url,
        'sentiment': _classify_text(text),
    }
