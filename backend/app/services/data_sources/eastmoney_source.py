import akshare as ak
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable
import logging
import concurrent.futures

from .base import DataSource

logger = logging.getLogger(__name__)

_EM_TIMEOUT = 25  # 每个东财API调用的超时秒数


def _is_sse_stock(symbol: str) -> bool:
    return symbol.startswith(('600', '601', '603', '605', '688', '689'))


def _is_szse_stock(symbol: str) -> bool:
    return symbol.startswith(('000', '001', '002', '003', '300', '301'))


_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="em_fetch")


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

    @property
    def name(self) -> str:
        return "eastmoney"

    def is_available(self) -> bool:
        return True

    @staticmethod
    def _match_code(df: pd.DataFrame, col: str, symbol: str) -> pd.DataFrame:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            return df[df[col] == symbol]
        return df.iloc[0:0]

    def get_daily(self, symbol: str, years: int = 2, adjust: str = "qfq") -> Optional[pd.DataFrame]:
        try:
            end = datetime.now().strftime("%Y%m%d")
            start = (datetime.now() - timedelta(days=365 * years)).strftime("%Y%m%d")
            result = _fetch(lambda: ak.stock_zh_a_hist(
                symbol=symbol, period="daily",
                start_date=start, end_date=end, adjust=adjust
            ))
            if result is None or (hasattr(result, 'empty') and result.empty):
                return None
            result.rename(columns={
                '日期': 'date', '开盘': 'open', '收盘': 'close',
                '最高': 'high', '最低': 'low', '成交量': 'volume',
                '成交额': 'amount', '振幅': 'amplitude',
                '涨跌幅': 'pct_chg', '涨跌额': 'change', '换手率': 'turnover'
            }, inplace=True, errors='ignore')
            result['date'] = pd.to_datetime(result['date'])
            result.sort_values('date', inplace=True)
            return result
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 行情失败: {e}")
            return None

    def get_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            result = _fetch(lambda: ak.stock_individual_info_em(symbol=symbol))
            if result is None or (hasattr(result, 'empty') and result.empty):
                return None
            data = dict(zip(result['item'], result['value']))
            data["数据来源"] = "东方财富"
            return data
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 公司信息失败: {e}")
            return None

    def get_financial_indicators(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            result = _fetch(lambda: ak.stock_financial_analysis_indicator(symbol=symbol, start_year="2020"))
            return result if isinstance(result, pd.DataFrame) and not result.empty else None
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 财务指标失败: {e}")
            return None

    def get_balance_sheet(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            result = _fetch(lambda: ak.stock_balance_sheet_by_report_em(symbol=symbol))
            return result if isinstance(result, pd.DataFrame) and not result.empty else None
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 资产负债表失败: {e}")
            return None

    def get_cashflow(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            result = _fetch(lambda: ak.stock_cash_flow_by_report_em(symbol=symbol))
            return result if isinstance(result, pd.DataFrame) and not result.empty else None
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 现金流量表失败: {e}")
            return None

    def get_insider_holdings(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            if _is_sse_stock(symbol):
                return _fetch(lambda: ak.stock_share_hold_change_sse(symbol=symbol))
            elif _is_szse_stock(symbol):
                return _fetch(lambda: ak.stock_share_hold_change_szse(symbol=symbol))
            return None
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 高管持股失败: {e}")
            return None

    def get_margin_balance(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            today = datetime.now().strftime('%Y%m%d')
            frames = []
            sh = _fetch(lambda: ak.stock_margin_sse())
            if isinstance(sh, pd.DataFrame) and not sh.empty and '证券代码' in sh.columns:
                frames.append(self._match_code(sh, '证券代码', symbol))
            sz = _fetch(lambda: ak.stock_margin_szse(date=today))
            if isinstance(sz, pd.DataFrame) and not sz.empty:
                sz = sz.rename(columns={
                    '融资余额': '融资余额(元)', '融券余额': '融券余额(元)',
                }, errors='ignore')
                if '证券代码' in sz.columns:
                    frames.append(self._match_code(sz, '证券代码', symbol))
            if frames:
                result = pd.concat(frames, ignore_index=True)
                return result if not result.empty else None
            return None
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 融资融券失败: {e}")
            return None

    def get_pledge_ratio(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            date = datetime.now().strftime("%Y%m%d")
            result = _fetch(lambda: ak.stock_gpzy_pledge_ratio_em(date=date))
            if result is None:
                return None
            if isinstance(result, pd.DataFrame):
                if result.empty:
                    return None
                return self._match_code(result, '股票代码', symbol)
            return None
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 质押比例失败: {e}")
            return None

    def get_cyq(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            return _fetch(lambda: ak.stock_cyq_em(symbol=symbol, adjust=""))
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 筹码分布失败: {e}")
            return None

    def get_fund_flow(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            market = 'sh' if symbol.startswith(('6', '9')) else 'sz'
            return _fetch(lambda: ak.stock_individual_fund_flow(stock=symbol, market=market))
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 资金流向失败: {e}")
            return None

    def get_news(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            return _fetch(lambda: ak.stock_news_em(symbol=symbol))
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 新闻失败: {e}")
            return None

    def get_analyst_rating(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            df = _fetch(lambda: ak.stock_institute_recommend(symbol="最新投资评级"))
            if df is None or not isinstance(df, pd.DataFrame) or df.empty:
                return {"error": "未找到评级数据"}
            df_stock = self._match_code(df, '股票代码', symbol)
            if df_stock.empty:
                return {"error": "未找到该股票评级数据"}
            sorted_df = df_stock.sort_values('评级日期', ascending=False)
            latest = sorted_df.iloc[0]
            # 收集所有目标价数据（用于前端散点图）
            price_history = []
            for _, row in sorted_df.iterrows():
                tp = row.get('目标价')
                if pd.notna(tp):
                    price_history.append({
                        "日期": str(row.get('评级日期', '')),
                        "目标价": float(tp),
                        "评级": str(row.get('最新评级', '')),
                        "机构": str(row.get('评级机构', '')),
                    })
            return {
                "stock_code": str(latest.get('股票代码', '')),
                "stock_name": str(latest.get('股票名称', '')),
                "latest_rating": str(latest.get('最新评级', '')),
                "target_price": float(latest.get('目标价', 0)) if pd.notna(latest.get('目标价')) else None,
                "rating_date": str(latest.get('评级日期', '')),
                "industry": str(latest.get('行业', '')),
                "data_source": "东方财富",
                "target_price_history": price_history[:30],
            }
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 分析师评级失败: {e}")
            return None

    def get_profit_forecast(self, symbol: str) -> Optional[pd.DataFrame]:
        try:
            return _fetch(lambda: ak.stock_profit_forecast_em(symbol=symbol))
        except Exception as e:
            logger.warning(f"[东财] 获取 {symbol} 盈利预测失败: {e}")
            return None
