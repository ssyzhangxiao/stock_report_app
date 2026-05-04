"""
网页搜索服务 - 通过搜索引擎搜索股票相关信息
支持 Bing/Google 搜索，获取新闻、研报、公告等
"""

import logging
import re
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

_SEARCH_TIMEOUT = 8


def _get_stock_name(symbol: str) -> str:
    _NAMES = {
        "600519": "贵州茅台", "000858": "五粮液", "000333": "美的集团",
        "601318": "中国平安", "600036": "招商银行", "000001": "平安银行",
        "600900": "长江电力", "601012": "隆基绿能", "300750": "宁德时代",
        "002594": "比亚迪", "600276": "恒瑞医药", "000568": "泸州老窖",
        "00700": "腾讯控股", "09988": "阿里巴巴", "09888": "百度",
    }
    return _NAMES.get(symbol, f"股票{symbol}")


class WebSearchResult:
    def __init__(self, title: str, url: str, snippet: str, source: str = "web_search"):
        self.title = title
        self.url = url
        self.snippet = snippet
        self.source = source

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "url": self.url,
            "snippet": self.snippet,
            "source": self.source,
        }


class WebSearchService:
    """网页搜索服务"""

    def search_stock_news(self, symbol: str, max_results: int = 10) -> List[WebSearchResult]:
        name = _get_stock_name(symbol)
        year = datetime.now().year
        queries = [
            f"{name} {symbol} 股价 财报 业绩 2026",
            f"{name} {symbol} 机构评级 目标价 买入",
        ]

        all_results = []
        seen_urls = set()
        for query in queries:
            results = self._search_bing(query, max_results=5)
            for r in results:
                if r.url not in seen_urls:
                    seen_urls.add(r.url)
                    all_results.append(r)
            if len(all_results) >= max_results:
                break

        return all_results[:max_results]

    def _search_bing(self, query: str, max_results: int = 5) -> List[WebSearchResult]:
        try:
            url = f"https://www.bing.com/search?q={quote_plus(query)}&setlang=zh-CN"
            resp = requests.get(url, headers=_HEADERS, timeout=_SEARCH_TIMEOUT)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "html.parser")
            results = []

            for li in soup.select("li.b_algo"):
                title_el = li.select_one("h2 a")
                snippet_el = li.select_one(".b_caption p") or li.select_one("p")

                if not title_el:
                    continue

                title = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                snippet = snippet_el.get_text(strip=True) if snippet_el else ""

                if title and href:
                    source = self._extract_source(href)
                    results.append(WebSearchResult(title=title, url=href, snippet=snippet, source=source))

                if len(results) >= max_results:
                    break

            logger.info(f"[WebSearch] Bing搜索 '{query[:30]}...' 获取 {len(results)} 条结果")
            return results

        except Exception as e:
            logger.warning(f"[WebSearch] Bing搜索失败: {e}")
            return []

    def _extract_source(self, url: str) -> str:
        domain_match = re.search(r'https?://(?:www\.)?([^/]+)', url)
        if domain_match:
            return domain_match.group(1)
        return "web_search"


_web_search_service: Optional[WebSearchService] = None


def get_web_search_service() -> WebSearchService:
    global _web_search_service
    if _web_search_service is None:
        _web_search_service = WebSearchService()
    return _web_search_service
