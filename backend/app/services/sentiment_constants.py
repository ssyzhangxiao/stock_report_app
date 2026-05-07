"""
情感分析公共常量

统一管理正面/负面关键词和情感分类逻辑，
避免 news_aggregator.py 和 news_analyzer.py 中的重复定义。
"""

POSITIVE_KW = [
    '增长', '新高', '买入', '增持', '利好', '超预期', '突破', '上涨', '盈利',
    '回购', '分红', '业绩预增', '订单', '扩产', '创新高', '机构买入',
]

NEGATIVE_KW = [
    '下跌', '风险', '减持', '利空', '调查', '诉讼', '亏损', '下滑', '违规',
    '退市', '质押', '爆仓', '处罚', '警示', '问询', '监管',
]


def classify_sentiment(text: str) -> str:
    pos = sum(1 for kw in POSITIVE_KW if kw in text)
    neg = sum(1 for kw in NEGATIVE_KW if kw in text)
    if pos > neg:
        return "positive"
    elif neg > pos:
        return "negative"
    return "neutral"
