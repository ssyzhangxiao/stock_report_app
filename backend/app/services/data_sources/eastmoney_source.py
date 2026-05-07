import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable, List
import logging
import concurrent.futures
import atexit

from .base import DataSource
from .stock_utils import is_sse, is_szse

logger = logging.getLogger(__name__)

_EM_TIMEOUT = 15

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="em_fetch")
atexit.register(_executor.shutdown, wait=False)


def _fetch(func: Callable, timeout: int = _EM_TIMEOUT):
    future = _executor.submit(func)
    try:
        return future.result(timeout=timeout)
    except concurrent.futures.TimeoutError:
        return None
    except Exception:
        return None


class EastMoneyDataSource(DataSource):
    """东方财富数据源"""

    def __init__(self):
        self._ak = None

    @property
    def _akshare(self):
        if self._ak is None:
            from .akshare_source import AkShareDataSource
            self._ak = AkShareDataSource()
        return self._ak

    @property
    def name(self) -> str:
        return "eastmoney"

    def is_available(self) -> bool:
        return True

    def get_daily(self, symbol: str, years: int = 2, adjust: str = "qfq") -> Optional[pd.DataFrame]:
        return self._akshare.get_daily(symbol, years, adjust)

    def get_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        return self._akshare.get_company_info(symbol)

    def get_company_profile(self, symbol: str) -> Optional[Dict[str, Any]]:
        return self._akshare.get_company_profile(symbol)

    def get_financial_indicators(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_financial_indicators(symbol)

    def get_balance_sheet(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_balance_sheet(symbol)

    def get_cashflow(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_cashflow(symbol)

    def get_free_cashflow(self, symbol: str, years: int = 5) -> Optional[pd.DataFrame]:
        try:
            cashflow_df = self.get_cashflow(symbol)
            if cashflow_df is None or cashflow_df.empty:
                return None

            result_df = cashflow_df.copy()

            operating_cf_col = None
            capex_col = None

            for col in cashflow_df.columns:
                col_lower = col.lower()
                if '经营活动现金净额' in col or '经营活动产生的现金流量净额' in col:
                    operating_cf_col = col
                elif '投资活动现金净额' in col or '购建固定资产' in col or '资本支出' in col:
                    capex_col = col

            if operating_cf_col is None:
                for col in cashflow_df.columns:
                    if '经营' in col and '现金' in col:
                        operating_cf_col = col
                        break

            if capex_col is None:
                for col in cashflow_df.columns:
                    if '投资' in col and '现金' in col and '净额' in col:
                        capex_col = col
                        break

            if operating_cf_col is None:
                logger.warning(f"[东财] {symbol} 找不到经营活动现金流列")
                return None

            result_df['报告日期'] = cashflow_df.iloc[:, 0]
            result_df['经营活动现金流净额'] = cashflow_df[operating_cf_col] if operating_cf_col else 0

            if capex_col:
                capex_values = cashflow_df[capex_col].abs()
            else:
                capex_values = 0

            result_df['资本支出'] = capex_values
            result_df['自由现金流'] = result_df['经营活动现金流净额'] - result_df['资本支出']

            if '报告日期' in result_df.columns:
                result_df = result_df.sort_values('报告日期', ascending=False)

            if years > 0:
                result_df = result_df.head(years)

            logger.info(f"[东财] {symbol} 自由现金流计算完成，共 {len(result_df)} 期")
            return result_df

        except Exception as e:
            logger.warning(f"[东财] 计算 {symbol} 自由现金流失败: {e}")
            return None

    def get_income_statement(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_income_statement(symbol)

    def get_insider_holdings(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_insider_holdings(symbol)

    def get_margin_history(self, symbol: str, days: int = 10) -> Optional[List]:
        return self._akshare.get_margin_history(symbol, days)

    def get_margin_balance(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_margin_balance(symbol)

    def get_pledge_ratio(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_pledge_ratio(symbol)

    def get_cyq(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_cyq(symbol)

    def get_fund_flow(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_fund_flow(symbol)

    def get_news(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_news(symbol)

    def get_analyst_rating(self, symbol: str) -> Optional[Dict[str, Any]]:
        return self._akshare.get_analyst_rating(symbol)

    def get_profit_forecast(self, symbol: str) -> Optional[pd.DataFrame]:
        return self._akshare.get_profit_forecast(symbol)

    def get_industry_index(self, industry_code: str = None, days: int = 180) -> Optional[pd.DataFrame]:
        return self._akshare.get_industry_index(industry_code, days)

    def get_industry_class(self, symbol: str) -> Optional[Dict[str, str]]:
        return self._akshare.get_industry_class(symbol)

    def get_capital_operation(self, symbol: str) -> Optional[Dict[str, Any]]:
        return self._akshare.get_capital_operation(symbol)
