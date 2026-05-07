"""
公共服务工具模块

提取 web_search_service.py 和 web_fetch_service.py 中的公共代码。
"""

import re

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

_STOCK_NAMES = {
    "600519": "贵州茅台", "000858": "五粮液", "000333": "美的集团",
    "601318": "中国平安", "600036": "招商银行", "000001": "平安银行",
    "600900": "长江电力", "601012": "隆基绿能", "300750": "宁德时代",
    "002594": "比亚迪", "600276": "恒瑞医药", "000568": "泸州老窖",
    "00700": "腾讯控股", "09988": "阿里巴巴", "09888": "百度",
}


def get_stock_name(symbol: str) -> str:
    return _STOCK_NAMES.get(symbol, f"股票{symbol}")


def extract_domain(url: str) -> str:
    match = re.search(r'https?://(?:www\.)?([^/]+)', url)
    return match.group(1) if match else url
