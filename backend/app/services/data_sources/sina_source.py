import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable
import logging
import time
import concurrent.futures
import atexit

from .base import DataSource
from .stock_utils import to_sina_symbol

logger = logging.getLogger(__name__)

_spot_cache = {"data": None, "time": 0.0}
_SPOT_CACHE_TTL = 180

_SINA_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="sina_fin")
atexit.register(_SINA_POOL.shutdown, wait=False)


def _fetch(func: Callable, timeout: int):
    future = _SINA_POOL.submit(func)
    try:
        return future.result(timeout=timeout)
    except concurrent.futures.TimeoutError:
        return None
    except Exception:
        return None


class SinaDataSource(DataSource):
    """新浪财经数据源（仅提供快速可靠的行情数据）"""

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
        return "sina"

    def is_available(self) -> bool:
        return True

    def get_daily(self, symbol: str, years: int = 2, adjust: str = "qfq") -> Optional[pd.DataFrame]:
        return self._akshare.get_daily_sina(symbol, years, adjust)

    def get_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            global _spot_cache
            now = time.time()
            if _spot_cache["data"] is None or (now - _spot_cache["time"]) > _SPOT_CACHE_TTL:
                _spot_cache["data"] = self._akshare.get_spot_em()
                _spot_cache["time"] = now
            df = _spot_cache["data"]
            if df is None or df.empty:
                return None
            sina_code = to_sina_symbol(symbol)
            df['代码'] = df['代码'].astype(str).str.strip()
            row = df[df['代码'] == sina_code]
            if row.empty:
                return None
            s = row.iloc[0]
            return {
                "股票简称": str(s.get('名称', '')),
                "最新价": s.get('最新价', None),
                "涨跌幅": s.get('涨跌幅', None),
                "昨收": s.get('昨收', None),
                "今开": s.get('今开', None),
                "最高": s.get('最高', None),
                "最低": s.get('最低', None),
                "成交量": s.get('成交量', None),
                "数据来源": "新浪",
            }
        except Exception as e:
            logger.warning(f"[新浪] 获取 {symbol} 公司信息失败: {e}")
            return None

    def get_financial_indicators(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            df = _fetch(lambda: self._akshare.get_financial_indicators(symbol), 12)
            if not isinstance(df, pd.DataFrame) or df.empty:
                return None
            col_map = {
                '摊薄每股收益(元)': '每股收益',
                '资产负债率(%)': '资产负债率',
            }
            df.rename(columns=col_map, inplace=True, errors='ignore')
            if '营业总收入(元)' not in df.columns and '主营业务利润(元)' in df.columns:
                df['营业总收入(元)'] = df['主营业务利润(元)']
            if '净利润(元)' not in df.columns and '扣除非经常性损益后的净利润(元)' in df.columns:
                df['净利润(元)'] = df['扣除非经常性损益后的净利润(元)']
            if '销售毛利率(%)' in df.columns and df['销售毛利率(%)'].isna().all() and '主营业务利润率(%)' in df.columns:
                df['销售毛利率(%)'] = df['主营业务利润率(%)']
            return df
        except Exception:
            return None

    def get_shares_outstanding(self, symbol: str) -> Optional[float]:
        return self._akshare.get_shares_outstanding(symbol)

    def get_balance_sheet(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            df = _fetch(lambda: self._akshare.get_financial_report_sina(symbol, "资产负债表"), 10)
            if isinstance(df, pd.DataFrame) and not df.empty:
                col_map = {
                    '报告日': 'report_date',
                    '资产总计': 'total_assets',
                    '负债合计': 'total_liability',
                    '所有者权益(或股东权益)合计': 'total_holders_equity',
                    '货币资金': 'cash_and_equivalents',
                }
                df.rename(columns=col_map, inplace=True, errors='ignore')
                return df
            return None
        except Exception:
            return None

    def get_cashflow(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            df = _fetch(lambda: self._akshare.get_financial_report_sina(symbol, "现金流量表"), 10)
            if isinstance(df, pd.DataFrame) and not df.empty:
                col_map = {
                    '报告日': 'report_date',
                    '经营活动产生的现金流量净额': 'net_operate_cash_flow',
                    '投资活动产生的现金流量净额': 'net_invest_cash_flow',
                    '筹资活动产生的现金流量净额': 'net_finance_cash_flow',
                    '现金及现金等价物净增加额': 'net_increase_in_cash',
                }
                df.rename(columns=col_map, inplace=True, errors='ignore')
                return df
            return None
        except Exception:
            return None

    def get_income_statement(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            df = _fetch(lambda: self._akshare.get_financial_report_sina(symbol, "利润表"), 10)
            if isinstance(df, pd.DataFrame) and not df.empty:
                col_map = {
                    '报告日': 'report_date',
                    '营业总收入': 'total_operating_revenue',
                    '营业收入': 'operating_revenue',
                    '营业总成本': 'total_operating_cost',
                    '营业成本': 'operating_cost',
                    '销售费用': 'sales_expense',
                    '管理费用': 'admin_expense',
                    '财务费用': 'financial_expense',
                    '研发费用': 'rnd_expense',
                    '营业利润': 'operating_profit',
                    '利润总额': 'total_profit',
                    '净利润': 'net_profit',
                    '归属于母公司所有者的净利润': 'net_profit_parent',
                    '每股收益': 'eps',
                    '基本每股收益': 'basic_eps',
                    '稀释每股收益': 'diluted_eps',
                }
                df.rename(columns=col_map, inplace=True, errors='ignore')
                return df
            return None
        except Exception:
            return None
