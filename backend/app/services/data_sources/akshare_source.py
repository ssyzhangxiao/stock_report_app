import pandas as pd
import numpy as np
import re
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable
import logging
import concurrent.futures
import atexit
import time

from .base import DataSource
from .stock_utils import to_sina_symbol, is_sse, is_szse

logger = logging.getLogger(__name__)

_AK_TIMEOUT = 15

_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=4, thread_name_prefix="ak_fetch"
)
atexit.register(_executor.shutdown, wait=False)


def _fetch(func: Callable, timeout: int = _AK_TIMEOUT):
    future = _executor.submit(func)
    try:
        return future.result(timeout=timeout)
    except concurrent.futures.TimeoutError:
        return None
    except Exception:
        return None


class AkShareDataSource(DataSource):
    @property
    def name(self) -> str:
        return "akshare"

    def is_available(self) -> bool:
        try:
            import akshare as ak

            df = ak.stock_zh_a_spot_em()
            return df is not None and not df.empty
        except Exception:
            return False

    @staticmethod
    def _match_code(df: pd.DataFrame, col: str, symbol: str) -> pd.DataFrame:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            return df[df[col] == symbol]
        return df.iloc[0:0]

    def get_daily(
        self, symbol: str, years: int = 2, adjust: str = "qfq"
    ) -> Optional[pd.DataFrame]:
        end = datetime.now().strftime("%Y%m%d")
        start = (datetime.now() - timedelta(days=365 * years)).strftime("%Y%m%d")
        try:
            result = _fetch(
                lambda: __import__("akshare").stock_zh_a_hist(
                    symbol=symbol,
                    period="daily",
                    start_date=start,
                    end_date=end,
                    adjust=adjust,
                )
            )
            if result is None or (hasattr(result, "empty") and result.empty):
                return None
            result.rename(
                columns={
                    "日期": "date",
                    "开盘": "open",
                    "收盘": "close",
                    "最高": "high",
                    "最低": "low",
                    "成交量": "volume",
                    "成交额": "amount",
                    "振幅": "amplitude",
                    "涨跌幅": "pct_chg",
                    "涨跌额": "change",
                    "换手率": "turnover",
                },
                inplace=True,
                errors="ignore",
            )
            result["date"] = pd.to_datetime(result["date"])
            result.sort_values("date", inplace=True)
            return result
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 行情失败: {e}")
            return None

    def get_daily_sina(
        self, symbol: str, years: int = 2, adjust: str = "qfq"
    ) -> Optional[pd.DataFrame]:
        end = datetime.now().strftime("%Y%m%d")
        start = (datetime.now() - timedelta(days=365 * years)).strftime("%Y%m%d")
        prefix = to_sina_symbol(symbol)
        try:
            import akshare as ak

            df = ak.stock_zh_a_daily(
                symbol=prefix, start_date=start, end_date=end, adjust=adjust
            )
            if df is not None and not df.empty:
                df["date"] = pd.to_datetime(df["date"])
                df.sort_values("date", inplace=True)
                df["date"] = df["date"].dt.strftime("%Y-%m-%d")
                df["pct_chg"] = df["close"].pct_change() * 100
                df["pct_chg"] = df["pct_chg"].replace([np.inf, -np.inf], np.nan)
                return df
        except Exception as e:
            logger.warning(f"[akshare-sina] stock_zh_a_daily 失败: {e}")
        try:
            import akshare as ak

            df = ak.stock_zh_a_hist_tx(symbol=prefix, start_date=start, end_date=end)
            if df is not None and not df.empty:
                df["date"] = pd.to_datetime(df["date"])
                df.sort_values("date", inplace=True)
                df["date"] = df["date"].dt.strftime("%Y-%m-%d")
                df["pct_chg"] = df["close"].pct_change() * 100
                df["pct_chg"] = df["pct_chg"].replace([np.inf, -np.inf], np.nan)
                return df
        except Exception as e:
            logger.warning(f"[akshare-tx] {symbol} 行情也失败: {e}")
        return None

    def get_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            result = _fetch(
                lambda: __import__("akshare").stock_individual_info_em(symbol=symbol)
            )
            if result is None or (hasattr(result, "empty") and result.empty):
                return None
            data = dict(zip(result["item"], result["value"]))
            data["数据来源"] = "akshare"
            return data
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 公司信息失败: {e}")
            return None

    def _scrape_sina_company_info(self, symbol: str) -> Dict[str, str]:
        """从新浪财经抓取详细公司信息"""
        result = {}
        try:
            url = f"https://vip.stock.finance.sina.com.cn/corp/go.php/vCI_CorpInfo/stockid/{symbol}.phtml"
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "zh-CN,zh;q=0.9",
            }
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code != 200:
                return result
            html = r.text

            field_patterns = [
                ("main_business", r"主营业务：.*?<td[^>]*>(.*?)</td>"),
                ("products", r"产品名称：.*?<td[^>]*>(.*?)</td>"),
                ("controlling_shareholder", r"控股股东：.*?<td[^>]*>(.*?)</td>"),
                ("actual_controller", r"实际控制人：.*?<td[^>]*>(.*?)</td>"),
                ("final_controller", r"最终控制人：.*?<td[^>]*>(.*?)</td>"),
                ("chairman", r"董事长：.*?<td[^>]*>(.*?)</td>"),
                ("secretary", r"董.*?秘：.*?<td[^>]*>(.*?)</td>"),
                ("legal_representative", r"法人代表：.*?<td[^>]*>(.*?)</td>"),
                ("general_manager", r"总.*?经理：.*?<td[^>]*>(.*?)</td>"),
                ("registered_capital", r"注册.*?(?:资本|资金)：.*?<td[^>]*>(.*?)</td>"),
                ("employee_count", r"员工人数：.*?<td[^>]*>(.*?)</td>"),
                ("description", r"公司简介：.*?<td[^>]*>(.*?)</td>"),
                ("english_name", r"英文名称：.*?<td[^>]*>(.*?)</td>"),
                ("former_name", r"曾.*?名：.*?<td[^>]*>(.*?)</td>"),
                ("region", r"所属地域：.*?<td[^>]*>(.*?)</td>"),
                ("website", r"公司网址：.*?<td[^>]*>(.*?)</td>"),
                ("business_scope", r"经营范围：.*?<td[^>]*>(.*?)</td>"),
                ("listing_date", r"上市时间：.*?<td[^>]*>(.*?)</td>"),
            ]

            for key, pattern in field_patterns:
                m = re.findall(pattern, html, re.DOTALL)
                if m:
                    val = re.sub(r"<[^>]+>", "", m[0]).strip()
                    val = re.sub(r"\s+", " ", val)
                    if val and val != "--":
                        result[key] = val

            if result:
                logger.info(f"[新浪抓取] {symbol} 获取到 {len(result)} 个字段")
        except Exception as e:
            logger.warning(f"[新浪抓取] {symbol} 失败: {e}")
        return result

    def _fetch_eastmoney_company_profile(self, symbol: str) -> Dict[str, Any]:
        """从东方财富API获取详细公司资料"""
        result = {}
        try:
            market = "SH" if is_sse(symbol) else "SZ"
            url = f"https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/CompanySurveyAjax?code={market}{symbol}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Referer": "https://emweb.securities.eastmoney.com/",
            }
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code != 200:
                return result
            data = r.json()
            jbzl = data.get("jbzl", {})
            fxxg = data.get("fxxg", {})

            if jbzl:
                result = {
                    "name": jbzl.get("gsmc", ""),
                    "short_name": jbzl.get("agjc", ""),
                    "english_name": jbzl.get("ywmc", ""),
                    "industry": jbzl.get("sshy", ""),
                    "industry_detail": jbzl.get("sszjhhy", ""),
                    "former_name": jbzl.get("cym", ""),
                    "region": jbzl.get("qy", ""),
                    "listing_market": jbzl.get("ssjys", ""),
                    "chairman": jbzl.get("dsz", ""),
                    "legal_representative": jbzl.get("frdb", ""),
                    "general_manager": jbzl.get("zjl", ""),
                    "secretary": jbzl.get("dm", ""),
                    "registered_capital": jbzl.get("zczb", ""),
                    "employee_count": jbzl.get("gyrs", ""),
                    "description": jbzl.get("gsjj", ""),
                    "main_business": jbzl.get("jyfw", ""),
                    "business_scope": jbzl.get("jyfw", ""),
                    "website": jbzl.get("gswz", ""),
                    "address": jbzl.get("bgdz", ""),
                    "registered_address": jbzl.get("zcdz", ""),
                    "phone": jbzl.get("lxdh", ""),
                    "email": jbzl.get("dzxx", ""),
                    "fax": jbzl.get("cz", ""),
                    "zip_code": jbzl.get("yzbm", ""),
                    "数据来源": "东方财富",
                }
            if fxxg:
                result["listing_date"] = fxxg.get("ssrq", "")
                result["establishment_date"] = fxxg.get("clrq", "")
                result["issue_price"] = fxxg.get("mgfxj", "")

            if result:
                logger.info(f"[东方财富] {symbol} 获取到 {len(result)} 个字段")
        except Exception as e:
            logger.warning(f"[东方财富] {symbol} 公司资料获取失败: {e}")
        return result

    def _fetch_eastmoney_shareholder_info(self, symbol: str) -> Dict[str, Any]:
        """从东方财富API获取股东信息（控股股东、实际控制人等）"""
        result = {}
        try:
            market = "SH" if is_sse(symbol) else "SZ"
            url = f"https://emweb.securities.eastmoney.com/PC_HSF10/ShareholderResearch/PageAjax?code={market}{symbol}&type=sdltgd"
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Referer": "https://emweb.securities.eastmoney.com/",
            }
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code != 200:
                return result
            data = r.json()

            sjkzr = data.get("sjkzr", [])
            if sjkzr and len(sjkzr) > 0:
                result["actual_controller"] = sjkzr[0].get("HOLDER_NAME", "")
                result["final_controller"] = sjkzr[0].get("HOLDER_NAME", "")

            sdltgd = data.get("sdltgd", [])
            if sdltgd and len(sdltgd) > 0:
                top = sdltgd[0]
                name = top.get("HOLDER_NAME", "")
                ratio = top.get("FREE_HOLDNUM_RATIO")
                if name:
                    if ratio is not None:
                        result["controlling_shareholder"] = (
                            f"{name} (持有比例：{ratio:.2f}%)"
                        )
                    else:
                        result["controlling_shareholder"] = name

            if result:
                logger.info(f"[东方财富股东] {symbol} 获取到 {len(result)} 个字段")
        except Exception as e:
            logger.warning(f"[东方财富股东] {symbol} 股东信息获取失败: {e}")
        return result

    def _fetch_eastmoney_products(self, symbol: str) -> str:
        """从东方财富API获取产品名称列表"""
        try:
            market = "SH" if is_sse(symbol) else "SZ"
            url = f"https://emweb.securities.eastmoney.com/PC_HSF10/BusinessAnalysis/PageAjax?code={market}{symbol}&type=zysr"
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Referer": "https://emweb.securities.eastmoney.com/",
            }
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code != 200:
                return ""
            data = r.json()
            zygcfx = data.get("zygcfx", [])
            if not zygcfx:
                return ""
            latest_date = max(item.get("REPORT_DATE", "") for item in zygcfx)
            products = []
            seen = set()
            skip_keywords = {"其他(补充)", "其他业务", "其他(其他)"}
            for item in zygcfx:
                if item.get("REPORT_DATE", "") != latest_date:
                    continue
                mainop_type = item.get("MAINOP_TYPE", "")
                item_name = item.get("ITEM_NAME", "").strip()
                if (
                    mainop_type == "2"
                    and item_name
                    and item_name not in seen
                    and item_name not in skip_keywords
                ):
                    seen.add(item_name)
                    products.append(item_name)
            if products:
                result = "、".join(products)
                logger.info(f"[东方财富产品] {symbol}: {result}")
                return result
        except Exception as e:
            logger.warning(f"[东方财富产品] {symbol} 产品获取失败: {e}")
        return ""

    def get_company_profile(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取详细公司简介，映射为前端期望的字段格式"""
        profile = {}

        em_info = self._fetch_eastmoney_company_profile(symbol)
        if em_info:
            profile = em_info

        shareholder_info = self._fetch_eastmoney_shareholder_info(symbol)
        for key, val in shareholder_info.items():
            if val and not profile.get(key):
                profile[key] = val

        if not profile.get("products"):
            products = self._fetch_eastmoney_products(symbol)
            if products:
                profile["products"] = products

        if not profile.get("name") or not profile.get("main_business"):
            try:
                result = _fetch(
                    lambda: __import__("akshare").stock_individual_info_em(
                        symbol=symbol
                    )
                )
                if result is not None and not (
                    hasattr(result, "empty") and result.empty
                ):
                    raw = dict(zip(result["item"], result["value"]))
                    akshare_fields = {
                        "name": raw.get("股票简称", "") or profile.get("name", ""),
                        "region": profile.get("region", "")
                        or raw.get("省份", "")
                        or raw.get("所属地域", ""),
                        "english_name": profile.get("english_name", "")
                        or raw.get("英文名称", ""),
                        "industry": profile.get("industry", "") or raw.get("行业", ""),
                        "former_name": profile.get("former_name", "")
                        or raw.get("曾用名", ""),
                        "main_business": profile.get("main_business", "")
                        or raw.get("主营业务", ""),
                        "products": profile.get("products", "")
                        or raw.get("产品名称", ""),
                        "controlling_shareholder": profile.get(
                            "controlling_shareholder", ""
                        )
                        or raw.get("控股股东", ""),
                        "actual_controller": profile.get("actual_controller", "")
                        or raw.get("实际控制人", ""),
                        "final_controller": profile.get("final_controller", "")
                        or raw.get("最终控制人", ""),
                        "chairman": profile.get("chairman", "")
                        or raw.get("董事长", ""),
                        "secretary": profile.get("secretary", "")
                        or raw.get("董事会秘书", ""),
                        "legal_representative": profile.get("legal_representative", "")
                        or raw.get("法人代表", ""),
                        "general_manager": profile.get("general_manager", "")
                        or raw.get("总经理", ""),
                        "registered_capital": profile.get("registered_capital", "")
                        or raw.get("注册资本", "")
                        or raw.get("总股本", ""),
                        "employee_count": profile.get("employee_count", "")
                        or raw.get("员工人数", ""),
                        "description": profile.get("description", "")
                        or raw.get("公司简介", ""),
                        "listing_date": profile.get("listing_date", "")
                        or raw.get("上市时间", ""),
                        "total_market_cap": profile.get("total_market_cap", "")
                        or raw.get("总市值", ""),
                        "circulating_market_cap": profile.get(
                            "circulating_market_cap", ""
                        )
                        or raw.get("流通市值", ""),
                        "total_shares": profile.get("total_shares", "")
                        or raw.get("总股本", ""),
                        "circulating_shares": profile.get("circulating_shares", "")
                        or raw.get("流通股", ""),
                        "website": profile.get("website", "")
                        or raw.get("公司网址", ""),
                        "business_scope": profile.get("business_scope", "")
                        or raw.get("经营范围", ""),
                    }
                    for k, v in akshare_fields.items():
                        if v and not profile.get(k):
                            profile[k] = v
                    if not profile.get("数据来源"):
                        profile["数据来源"] = "akshare"
            except Exception as e:
                logger.warning(f"[akshare] 获取 {symbol} 公司基本信息失败: {e}")

        sina_info = self._scrape_sina_company_info(symbol)
        for key, val in sina_info.items():
            if val and not profile.get(key):
                profile[key] = val

        if not profile:
            profile = {**sina_info}
            if profile:
                profile["数据来源"] = "新浪财经"

        for key in list(profile.keys()):
            val = profile[key]
            if isinstance(val, float) and (val != val):
                profile[key] = ""

        if profile:
            logger.info(f"[公司简介] {symbol} 共 {len(profile)} 个字段")
        return profile if profile else None

    def get_company_info_sina(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak

            df = ak.stock_zh_a_spot()
            if df is None or df.empty:
                return None
            sina_code = to_sina_symbol(symbol)
            df["代码"] = df["代码"].astype(str).str.strip()
            row = df[df["代码"] == sina_code]
            if row.empty:
                return None
            s = row.iloc[0]
            return {
                "股票简称": str(s.get("名称", "")),
                "最新价": s.get("最新价", None),
                "涨跌幅": s.get("涨跌幅", None),
                "昨收": s.get("昨收", None),
                "今开": s.get("今开", None),
                "最高": s.get("最高", None),
                "最低": s.get("最低", None),
                "成交量": s.get("成交量", None),
                "数据来源": "akshare-sina",
            }
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 新浪公司信息失败: {e}")
            return None

    def get_financial_indicators(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            result = _fetch(
                lambda: __import__("akshare").stock_financial_analysis_indicator(
                    symbol=symbol, start_year="2020"
                )
            )
            return (
                result
                if isinstance(result, pd.DataFrame) and not result.empty
                else None
            )
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 财务指标失败: {e}")
            return None

    def get_balance_sheet(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            result = _fetch(
                lambda: __import__("akshare").stock_balance_sheet_by_report_em(
                    symbol=symbol
                )
            )
            return (
                result
                if isinstance(result, pd.DataFrame) and not result.empty
                else None
            )
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 资产负债表失败: {e}")
            return None

    def get_cashflow(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            result = _fetch(
                lambda: __import__("akshare").stock_cash_flow_by_report_em(
                    symbol=symbol
                )
            )
            return (
                result
                if isinstance(result, pd.DataFrame) and not result.empty
                else None
            )
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 现金流量表失败: {e}")
            return None

    def get_income_statement(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            result = _fetch(
                lambda: __import__("akshare").stock_profit_sheet_by_report_em(
                    symbol=symbol
                )
            )
            return (
                result
                if isinstance(result, pd.DataFrame) and not result.empty
                else None
            )
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 利润表失败: {e}")
            return None

    def get_insider_holdings(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            if is_sse(symbol):
                return _fetch(
                    lambda: __import__("akshare").stock_share_hold_change_sse(
                        symbol=symbol
                    )
                )
            elif is_szse(symbol):
                return _fetch(
                    lambda: __import__("akshare").stock_share_hold_change_szse(
                        symbol=symbol
                    )
                )
            return None
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 高管持股失败: {e}")
            return None

    def get_margin_balance(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            today = datetime.now().strftime("%Y%m%d")
            frames = []
            sh = _fetch(lambda: ak.stock_margin_sse())
            if (
                isinstance(sh, pd.DataFrame)
                and not sh.empty
                and "证券代码" in sh.columns
            ):
                frames.append(self._match_code(sh, "证券代码", symbol))
            sz = _fetch(lambda: ak.stock_margin_szse(date=today))
            if isinstance(sz, pd.DataFrame) and not sz.empty:
                sz = sz.rename(
                    columns={
                        "融资余额": "融资余额(元)",
                        "融券余额": "融券余额(元)",
                    },
                    errors="ignore",
                )
                if "证券代码" in sz.columns:
                    frames.append(self._match_code(sz, "证券代码", symbol))
            if frames:
                result = pd.concat(frames, ignore_index=True)
                return result if not result.empty else None
            return None
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 融资融券失败: {e}")
            return None

    def get_margin_history(self, symbol: str, days: int = 10) -> Optional[List]:
        if not is_sse(symbol) and not is_szse(symbol):
            return None
        import akshare as ak

        base = datetime.now()
        dates = [
            (base - timedelta(days=i)).strftime("%Y%m%d") for i in range(1, days + 1)
        ][:5]
        rows = []
        seen = set()
        for d in dates:
            if d in seen:
                continue
            seen.add(d)
            try:
                if is_sse(symbol):
                    df = _fetch(
                        lambda date=d: ak.stock_margin_detail_sse(date=date), timeout=5
                    )
                else:
                    df = _fetch(
                        lambda date=d: ak.stock_margin_detail_szse(date=date), timeout=5
                    )
                if df is None or not isinstance(df, pd.DataFrame) or df.empty:
                    continue
                code_col = [c for c in df.columns if "标的证券代码" in c][:1]
                if not code_col:
                    continue
                sub = df[df[code_col[0]].astype(str).str.strip() == symbol]
                if not sub.empty:
                    row = sub.iloc[0]
                    rows.append(
                        {
                            "日期": d[:4] + "-" + d[4:6] + "-" + d[6:],
                            "融资余额": float(row.get("融资余额", 0)),
                            "融券余量": float(row.get("融券余量", 0)),
                        }
                    )
                    if len(rows) >= days:
                        break
            except Exception:
                continue
        return rows if len(rows) >= 3 else None

    def get_pledge_ratio(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            date = datetime.now().strftime("%Y%m%d")
            result = _fetch(lambda: ak.stock_gpzy_pledge_ratio_em(date=date))
            if result is None:
                return None
            if isinstance(result, pd.DataFrame):
                if result.empty:
                    return None
                return self._match_code(result, "股票代码", symbol)
            return None
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 质押比例失败: {e}")
            return None

    def get_cyq(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_cyq_em(symbol=symbol, adjust=""))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 筹码分布失败: {e}")
            return None

    def get_fund_flow(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            market = "sh" if is_sse(symbol) else "sz"
            return _fetch(
                lambda: ak.stock_individual_fund_flow(stock=symbol, market=market)
            )
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 资金流向失败: {e}")
            return None

    def get_northbound_quarterly_holdings(self, symbol: str) -> Optional[pd.DataFrame]:
        """获取北向资金季度持股数据（最近5个季度）
        
        由于2024年8月19日起北向资金每日数据不再披露，此方法返回历史季度末的持股情况。
        
        Args:
            symbol: 股票代码
            
        Returns:
            DataFrame包含季度末的持股数据，或None
        """
        try:
            import akshare as ak
            import pandas as pd
            from datetime import datetime

            # 获取个股的北向资金持股历史
            df = _fetch(lambda: ak.stock_hsgt_individual_em(symbol=symbol))
            if df is None or df.empty:
                return None

            # 转换日期列
            df['持股日期'] = pd.to_datetime(df['持股日期'])

            # 提取季度末数据（3月31日、6月30日、9月30日、12月31日）
            def get_quarter_end_date(date):
                month = date.month
                year = date.year
                if month <= 3:
                    return pd.Timestamp(year=year, month=3, day=31)
                elif month <= 6:
                    return pd.Timestamp(year=year, month=6, day=30)
                elif month <= 9:
                    return pd.Timestamp(year=year, month=9, day=30)
                else:
                    return pd.Timestamp(year=year, month=12, day=31)

            df['quarter_end'] = df['持股日期'].apply(get_quarter_end_date)

            # 按季度分组，取每个季度最后一条记录
            quarterly_data = df.groupby('quarter_end').last().reset_index()
            quarterly_data = quarterly_data.sort_values('quarter_end', ascending=False).head(5)

            # 重命名列以便前端使用
            quarterly_data.rename(columns={
                'quarter_end': '日期',
                '持股数量': '持股数量',
                '持股市值': '持股市值',
                '持股数量占A股百分比': '持股比例',
                '今日增持股数': '季度增持数量',
                '今日增持资金': '季度增持市值'
            }, inplace=True)

            logger.info(f"[北向资金] 获取 {symbol} 季度持股数据成功，共 {len(quarterly_data)} 个季度")
            return quarterly_data

        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 北向资金季度持股失败: {e}")
            return None

    def get_news(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_news_em(symbol=symbol))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 新闻失败: {e}")
            return None

    def get_analyst_rating(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak

            df = _fetch(lambda: ak.stock_profit_forecast_ths(symbol=symbol))
            if df is None or not isinstance(df, pd.DataFrame) or df.empty:
                return None

            latest = df.iloc[0]
            return {
                "stock_code": symbol,
                "stock_name": "",
                "latest_rating": None,
                "target_price": float(latest.get("均值", 0))
                if pd.notna(latest.get("均值"))
                else None,
                "rating_date": str(latest.get("年度", "")),
                "industry": "",
                "data_source": "akshare_ths",
                "forecast_year": str(latest.get("年度", "")),
                "org_count": int(latest.get("预测机构数", 0))
                if pd.notna(latest.get("预测机构数"))
                else None,
                "eps_mean": float(latest.get("均值", 0))
                if pd.notna(latest.get("均值"))
                else None,
                "eps_min": float(latest.get("最小值", 0))
                if pd.notna(latest.get("最小值"))
                else None,
                "eps_max": float(latest.get("最大值", 0))
                if pd.notna(latest.get("最大值"))
                else None,
                "industry_avg": float(latest.get("行业平均数", 0))
                if pd.notna(latest.get("行业平均数"))
                else None,
            }
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 分析师评级失败: {e}")
            return None

    def get_profit_forecast(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_profit_forecast_em(symbol=symbol))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 盈利预测失败: {e}")
            return None

    def get_industry_index(
        self, industry_code: str = None, days: int = 180
    ) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            if industry_code is None:
                return None
            end = datetime.now().strftime("%Y%m%d")
            start = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")
            result = _fetch(
                lambda: ak.stock_zh_index_hist_em(
                    symbol=industry_code, period="daily", start_date=start, end_date=end
                )
            )
            if result is None or (hasattr(result, "empty") and result.empty):
                return None
            result.rename(
                columns={
                    "日期": "date",
                    "开盘": "open",
                    "收盘": "close",
                    "最高": "high",
                    "最低": "low",
                    "成交量": "volume",
                    "成交额": "amount",
                    "涨跌幅": "pct_chg",
                },
                inplace=True,
                errors="ignore",
            )
            result["date"] = pd.to_datetime(result["date"])
            result.sort_values("date", inplace=True)
            return result
        except Exception as e:
            logger.warning(f"[akshare] 获取行业指数 {industry_code} 失败: {e}")
            return None

    def get_industry_class(self, symbol: str) -> Optional[Dict[str, str]]:
        try:
            info = self.get_company_info(symbol)
            if info:
                industry = info.get("行业") or info.get("行业类别")
                if industry:
                    return {
                        "industry": industry,
                        "industry_code": self._get_industry_code(industry),
                        "source": "akshare",
                    }
            return None
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 行业分类失败: {e}")
            return None

    def _get_industry_code(self, industry_name: str) -> Optional[str]:
        industry_map = {
            "白酒": "801120",
            "饮料制造": "801120",
            "食品饮料": "801110",
            "银行": "801780",
            "证券": "801790",
            "保险": "801800",
            "房地产": "801180",
            "建筑材料": "801710",
            "建筑装饰": "801720",
            "医药生物": "801150",
            "医疗器械": "801150",
            "中药": "801150",
            "汽车": "801880",
            "新能源汽车": "801880",
            "电子": "801080",
            "半导体": "801080",
            "计算机": "801750",
            "软件服务": "801750",
            "通信": "801770",
            "5G": "801770",
            "传媒": "801760",
            "互联网": "801760",
            "电力设备": "801730",
            "新能源": "801730",
            "机械设备": "801890",
            "工业": "801890",
            "化工": "801890",
            "石油化工": "801890",
            "煤炭": "801950",
            "钢铁": "801960",
            "有色金属": "801050",
            "稀土": "801050",
            "纺织服装": "801130",
            "轻工制造": "801140",
            "家用电器": "801110",
            "农林牧渔": "801010",
        }
        for key, code in industry_map.items():
            if key in industry_name:
                return code
        return None

    def get_capital_operation(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak

            result = {
                "fund_raising": [],
                "project_investment": [],
                "acquisition": [],
                "equity_investment": [],
                "equity_transfer": [],
                "related_transactions": [],
                "company_info": None,
                "profit_forecast": [],
            }
            
            # 获取一致预期数据
            try:
                df_forecast = _fetch(
                    lambda: ak.stock_profit_forecast_ths(symbol=symbol)
                )
                if df_forecast is not None and not df_forecast.empty:
                    result["profit_forecast"] = df_forecast.to_dict("records")
            except Exception:
                pass
            
            # 获取募集资金数据 - 使用东方财富募集资金 API
            try:
                # 尝试多个可能的 API
                df_mllist = None
                try:
                    df_mllist = _fetch(
                        lambda: ak.stock_em_mllist(symbol=symbol)
                    )
                except Exception:
                    pass
                
                if df_mllist is None or df_mllist.empty:
                    try:
                        df_mllist = _fetch(
                            lambda: ak.stock_margin_szse(symbol=symbol)
                        )
                    except Exception:
                        pass
                        
                if df_mllist is not None and not df_mllist.empty:
                    # 映射字段
                    fund_raising = []
                    for _, row in df_mllist.iterrows():
                        fund_raising.append({
                            "announcement_date": str(row.get("公告日期", row.get("公告时间", ""))),
                            "issue_type": str(row.get("发行类别", row.get("发行类型", ""))),
                            "start_date": str(row.get("发行起始日期", row.get("发行日期", ""))),
                            "net_raised": str(row.get("实际募集资金净额", row.get("募集资金净额", ""))),
                            "remaining_end_date": str(row.get("剩余募集资金截止时间", row.get("截止日期", ""))),
                            "remaining": str(row.get("剩余募集资金", "")),
                            "utilization_rate": str(row.get("募集资金使用率", row.get("使用率", ""))),
                        })
                    result["fund_raising"] = fund_raising
            except Exception as e:
                logger.debug(f"募集资金数据获取失败: {e}")
            
            # 获取收购兼并数据 - 使用并购重组 API
            try:
                df_cg = _fetch(
                    lambda: ak.stock_cg_equity_mortgage_em(symbol=symbol)
                )
                if df_cg is not None and not df_cg.empty:
                    acquisitions = []
                    for _, row in df_cg.iterrows():
                        acquisitions.append({
                            "announcement_date": str(row.get("公告日期", "")),
                            "transaction_amount": str(row.get("交易金额", "")),
                            "progress": str(row.get("进度", "")),
                            "target": str(row.get("标的", "")),
                            "buyer": str(row.get("买方", "")),
                            "seller": str(row.get("卖方", "")),
                            "overview": str(row.get("概述", "")),
                        })
                    result["acquisition"] = acquisitions
            except Exception as e:
                logger.debug(f"收购兼并数据获取失败: {e}")
            
            # 获取关联交易数据 - 使用关联交易 API
            try:
                df_related = _fetch(
                    lambda: ak.stock_gszl_em(symbol=symbol)
                )
                if df_related is not None and not df_related.empty:
                    related = []
                    for _, row in df_related.iterrows():
                        related.append({
                            "announcement_date": str(row.get("公告日期", "")),
                            "transaction_amount": str(row.get("交易金额", "")),
                            "payment_method": str(row.get("支付方式", "")),
                            "counterparty": str(row.get("关联方", "")),
                            "transaction_type": str(row.get("交易类型", "")),
                            "related_relation": str(row.get("关联关系", "")),
                            "description": str(row.get("概述", "")),
                        })
                    result["related_transactions"] = related
            except Exception as e:
                logger.debug(f"关联交易数据获取失败: {e}")
            
            # 获取公司基本信息
            try:
                df_company = _fetch(
                    lambda: ak.stock_profile_cninfo(symbol=symbol)
                )
                if df_company is not None and not df_company.empty:
                    result["company_info"] = df_company.to_dict("records")
            except Exception:
                pass
            
            return result
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 资本运作数据失败: {e}")
            return None

    def get_spot_em(self) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_zh_a_spot_em())
        except Exception as e:
            logger.warning(f"[akshare] 获取全市场数据失败: {e}")
            return None

    def get_index_spot(self) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_zh_index_spot_em())
        except Exception as e:
            logger.warning(f"[akshare] 获取指数数据失败: {e}")
            return None

    def get_research_report(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_research_report_em(symbol=symbol))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 研报失败: {e}")
            return None

    def get_profit_forecast_ths(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_profit_forecast_ths(symbol=symbol))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 一致预期失败: {e}")
            return None

    def get_board_industry_name(self) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_board_industry_name_em())
        except Exception as e:
            logger.warning(f"[akshare] 获取行业板块失败: {e}")
            return None

    def get_board_industry_hist(
        self, industry_name: str, start_date: str = None, end_date: str = None
    ) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            if not start_date:
                start_date = (datetime.now() - timedelta(days=180)).strftime("%Y%m%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y%m%d")
            return _fetch(
                lambda: ak.stock_board_industry_hist_em(
                    symbol=industry_name,
                    period="日k",
                    start_date=start_date,
                    end_date=end_date,
                )
            )
        except Exception as e:
            logger.warning(f"[akshare] 获取行业 {industry_name} 历史失败: {e}")
            return None

    def get_board_industry_cons(self, industry_name: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_board_industry_cons_em(symbol=industry_name))
        except Exception as e:
            logger.warning(f"[akshare] 获取行业 {industry_name} 成分股失败: {e}")
            return None

    def get_info_global_cls(self) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_info_global_cls())
        except Exception as e:
            logger.warning(f"[akshare] 获取财联社快讯失败: {e}")
            return None

    def get_info_global_em(self) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_info_global_em())
        except Exception as e:
            logger.warning(f"[akshare] 获取全球资讯失败: {e}")
            return None

    def get_financial_abstract(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_financial_abstract(symbol=symbol))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 财务摘要失败: {e}")
            return None

    def get_currency_boc_sina(self) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.currency_boc_sina())
        except Exception as e:
            logger.warning(f"[akshare] 获取外汇数据失败: {e}")
            return None

    def get_notice_report(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_notice_report(symbol=symbol))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 公告失败: {e}")
            return None

    def get_history_dividend_detail(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_history_dividend_detail(symbol=symbol))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 分红历史失败: {e}")
            return None

    def get_share_buyback(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_share_buyback_em(symbol=symbol))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 回购数据失败: {e}")
            return None

    def get_disclosure_report_cninfo(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(lambda: ak.stock_zh_a_disclosure_report_cninfo(symbol=symbol))
        except Exception as e:
            logger.warning(f"[akshare] 获取 {symbol} 巨潮公告失败: {e}")
            return None

    def get_shares_outstanding(self, symbol: str) -> Optional[float]:
        try:
            import akshare as ak

            prefix = to_sina_symbol(symbol)
            end = datetime.now().strftime("%Y%m%d")
            start = (datetime.now() - timedelta(days=5)).strftime("%Y%m%d")
            df = ak.stock_zh_a_daily(
                symbol=prefix, start_date=start, end_date=end, adjust="qfq"
            )
            if df is not None and not df.empty and "outstanding_share" in df.columns:
                shares = df["outstanding_share"].iloc[-1]
                if pd.notna(shares) and shares > 0:
                    return float(shares)
            return None
        except Exception:
            return None

    def get_financial_report_sina(
        self, symbol: str, report_type: str
    ) -> Optional[pd.DataFrame]:
        try:
            import akshare as ak

            return _fetch(
                lambda: ak.stock_financial_report_sina(
                    stock=symbol, symbol=report_type
                ),
                10,
            )
        except Exception:
            return None
