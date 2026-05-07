"""
网页抓取服务 - 从财经网站抓取股票相关内容
支持: k.sina.cn, xueqiu.com, www.futunn.com, cn.investing.com,
      news.10jqka.com.cn, quote.eastmoney.com 等
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

import requests
from bs4 import BeautifulSoup

from .common_utils import HTTP_HEADERS, get_stock_name, extract_domain

logger = logging.getLogger(__name__)

_FETCH_TIMEOUT = 8
_MAX_CONTENT_LENGTH = 2000


class FetchedArticle:
    def __init__(
        self, title: str, content: str, url: str, source: str, publish_time: str = ""
    ):
        self.title = title
        self.content = content[:500]
        self.url = url
        self.source = source
        self.publish_time = publish_time or datetime.now().strftime("%Y-%m-%d")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "content": self.content,
            "url": self.url,
            "source": self.source,
            "publish_time": self.publish_time,
        }


class WebFetchService:
    """网页抓取服务"""

    def fetch_stock_pages(self, symbol: str) -> List[FetchedArticle]:
        name = get_stock_name(symbol)
        articles = []
        seen_urls = set()

        fetch_tasks = [
            self._fetch_sina_finance,
            self._fetch_xueqiu,
            self._fetch_eastmoney_quote,
            self._fetch_10jqka_news,
        ]

        for fetch_fn in fetch_tasks:
            try:
                result = fetch_fn(symbol, name)
                if result and result.url not in seen_urls:
                    seen_urls.add(result.url)
                    articles.append(result)
            except Exception as e:
                logger.warning(f"[WebFetch] {fetch_fn.__name__} 失败: {e}")

        logger.info(f"[WebFetch] 共抓取 {len(articles)} 篇文章")
        return articles

    def fetch_url(self, url: str) -> Optional[FetchedArticle]:
        try:
            resp = requests.get(url, headers=HTTP_HEADERS, timeout=_FETCH_TIMEOUT)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"

            soup = BeautifulSoup(resp.text, "html.parser")

            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()

            title = ""
            if soup.title:
                title = soup.title.get_text(strip=True)
            elif soup.find("h1"):
                title = soup.find("h1").get_text(strip=True)

            content = self._extract_text(soup)

            source = extract_domain(url)

            return FetchedArticle(
                title=title[:200],
                content=content[:_MAX_CONTENT_LENGTH],
                url=url,
                source=source,
            )
        except Exception as e:
            logger.warning(f"[WebFetch] 抓取 {url} 失败: {e}")
            return None

    def _fetch_sina_finance(self, symbol: str, name: str) -> Optional[FetchedArticle]:
        try:
            if symbol.startswith("0") or symbol.startswith("3"):
                prefix = "sz"
            elif symbol.startswith("6"):
                prefix = "sh"
            else:
                prefix = "hk"

            url = f"https://finance.sina.com.cn/realstock/company/{prefix}{symbol}/nc.shtml"
            resp = requests.get(url, headers=HTTP_HEADERS, timeout=_FETCH_TIMEOUT)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"

            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer"]):
                tag.decompose()

            title = f"{name}({symbol}) - 新浪财经"
            content = self._extract_text(soup)

            return FetchedArticle(
                title=title,
                content=content[:_MAX_CONTENT_LENGTH],
                url=url,
                source="k.sina.cn",
            )
        except Exception as e:
            logger.warning(f"[WebFetch] 新浪财经抓取失败: {e}")
            return None

    def _fetch_xueqiu(self, symbol: str, name: str) -> Optional[FetchedArticle]:
        try:
            if (
                symbol.startswith("6")
                or symbol.startswith("0")
                or symbol.startswith("3")
            ):
                xq_symbol = f"SH{symbol}" if symbol.startswith("6") else f"SZ{symbol}"
            else:
                xq_symbol = f"HK{symbol}"

            url = f"https://xueqiu.com/S/{xq_symbol}"
            session = requests.Session()
            session.headers.update(HTTP_HEADERS)
            session.get("https://xueqiu.com/", timeout=_FETCH_TIMEOUT)

            resp = session.get(url, timeout=_FETCH_TIMEOUT)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"

            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer"]):
                tag.decompose()

            title = f"{name}({symbol}) - 雪球"
            content = self._extract_text(soup)

            return FetchedArticle(
                title=title,
                content=content[:_MAX_CONTENT_LENGTH],
                url=url,
                source="xueqiu.com",
            )
        except Exception as e:
            logger.warning(f"[WebFetch] 雪球抓取失败: {e}")
            return None

    def _fetch_eastmoney_quote(
        self, symbol: str, name: str
    ) -> Optional[FetchedArticle]:
        try:
            if symbol.startswith("6"):
                em_code = f"1.{symbol}"
            elif symbol.startswith("0") or symbol.startswith("3"):
                em_code = f"0.{symbol}"
            else:
                em_code = f"116.{symbol}"

            url = f"https://quote.eastmoney.com/concept/{em_code}.html"
            resp = requests.get(url, headers=HTTP_HEADERS, timeout=_FETCH_TIMEOUT)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"

            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer"]):
                tag.decompose()

            title = f"{name}({symbol}) - 东方财富"
            content = self._extract_text(soup)

            return FetchedArticle(
                title=title,
                content=content[:_MAX_CONTENT_LENGTH],
                url=url,
                source="quote.eastmoney.com",
            )
        except Exception as e:
            logger.warning(f"[WebFetch] 东方财富行情页抓取失败: {e}")
            return None

    def _fetch_10jqka_news(self, symbol: str, name: str) -> Optional[FetchedArticle]:
        try:
            url = f"https://news.10jqka.com.cn/today_list/"
            resp = requests.get(url, headers=HTTP_HEADERS, timeout=_FETCH_TIMEOUT)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding or "utf-8"

            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer"]):
                tag.decompose()

            title = f"{name} - 同花顺资讯"
            content = self._extract_text(soup)

            return FetchedArticle(
                title=title,
                content=content[:_MAX_CONTENT_LENGTH],
                url=url,
                source="news.10jqka.com.cn",
            )
        except Exception as e:
            logger.warning(f"[WebFetch] 同花顺资讯抓取失败: {e}")
            return None

    def _extract_text(self, soup: BeautifulSoup) -> str:
        text = soup.get_text(separator="\n", strip=True)
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n".join(lines)


_web_fetch_service: Optional[WebFetchService] = None


def get_web_fetch_service() -> WebFetchService:
    global _web_fetch_service
    if _web_fetch_service is None:
        _web_fetch_service = WebFetchService()
    return _web_fetch_service
