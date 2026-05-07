import pandas as pd
import numpy as np
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

            df = _fetch(lambda: ak.stock_institute_recommend(symbol="最新投资评级"))
            if df is None or not isinstance(df, pd.DataFrame) or df.empty:
                return {"error": "未找到评级数据"}
            df_stock = self._match_code(df, "股票代码", symbol)
            if df_stock.empty:
                return {"error": "未找到该股票评级数据"}
            sorted_df = df_stock.sort_values("评级日期", ascending=False)
            latest = sorted_df.iloc[0]
            price_history = []
            for _, row in sorted_df.iterrows():
                tp = row.get("目标价")
                if pd.notna(tp):
                    price_history.append(
                        {
                            "日期": str(row.get("评级日期", "")),
                            "目标价": float(tp),
                            "评级": str(row.get("最新评级", "")),
                            "机构": str(row.get("评级机构", "")),
                        }
                    )
            return {
                "stock_code": str(latest.get("股票代码", "")),
                "stock_name": str(latest.get("股票名称", "")),
                "latest_rating": str(latest.get("最新评级", "")),
                "target_price": float(latest.get("目标价", 0))
                if pd.notna(latest.get("目标价"))
                else None,
                "rating_date": str(latest.get("评级日期", "")),
                "industry": str(latest.get("行业", "")),
                "data_source": "akshare",
                "target_price_history": price_history[:30],
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
                "dividend": None,
                "buyback": None,
                "insider_trading": None,
                "pledge": None,
            }
            try:
                df_dividend = _fetch(
                    lambda: ak.stock_dividend_details_em(symbol=symbol)
                )
                if df_dividend is not None and not df_dividend.empty:
                    result["dividend"] = df_dividend.to_dict("records")
            except Exception:
                pass
            try:
                df_insider = self.get_insider_holdings(symbol)
                if df_insider is not None:
                    result["insider_trading"] = (
                        df_insider.to_dict("records")
                        if hasattr(df_insider, "to_dict")
                        else df_insider
                    )
            except Exception:
                pass
            try:
                df_pledge = self.get_pledge_ratio(symbol)
                if df_pledge is not None:
                    result["pledge"] = (
                        df_pledge.to_dict("records")
                        if hasattr(df_pledge, "to_dict")
                        else df_pledge
                    )
            except Exception:
                pass
            return result if any(v is not None for v in result.values()) else None
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
