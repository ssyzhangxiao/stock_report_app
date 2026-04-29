import pandas as pd
from typing import List, Dict


def classify_news(news_df: pd.DataFrame) -> List[Dict]:
    """新闻情感分类（兼容东财等不同来源的列名）"""
    if news_df.empty:
        return []

    positive_kw = ['增长', '新高', '买入', '增持', '利好', '超预期', '突破', '上涨', '盈利']
    negative_kw = ['下跌', '风险', '减持', '利空', '调查', '诉讼', '亏损', '下滑', '违规']

    results = []
    for _, row in news_df.head(20).iterrows():
        title = str(row.get('新闻标题') or row.get('标题') or '')
        content = str(row.get('新闻内容') or row.get('内容') or '')
        source = str(row.get('文章来源') or row.get('来源') or '')
        pub_time = str(row.get('发布时间') or row.get('publish_time') or '')
        text = title + content

        sentiment = 'neutral'
        pos_count = sum(1 for kw in positive_kw if kw in text)
        neg_count = sum(1 for kw in negative_kw if kw in text)

        if pos_count > neg_count:
            sentiment = 'positive'
        elif neg_count > pos_count:
            sentiment = 'negative'

        results.append({
            'title': title,
            'content': content[:300],
            'publish_time': pub_time,
            'source': source,
            'sentiment': sentiment,
        })

    return results
