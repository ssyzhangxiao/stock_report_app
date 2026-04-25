import pandas as pd
from typing import List, Dict


def classify_news(news_df: pd.DataFrame) -> List[Dict]:
    """新闻情感分类"""
    if news_df.empty:
        return []
    
    positive_kw = ['增长', '新高', '买入', '增持', '利好', '超预期', '突破', '上涨', '盈利']
    negative_kw = ['下跌', '风险', '减持', '利空', '调查', '诉讼', '亏损', '下滑', '违规']
    
    results = []
    for _, row in news_df.head(20).iterrows():
        title = str(row.get('标题', ''))
        content = str(row.get('内容', ''))
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
            'content': content[:200],
            'publish_time': str(row.get('发布时间', '')),
            'source': str(row.get('来源', '')),
            'sentiment': sentiment
        })
    
    return results
