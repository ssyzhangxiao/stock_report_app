import akshare as ak
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class DataFetcher:
    """AkShare 数据采集服务 - 单股深度分析版"""

    def get_daily(self, symbol: str, years: int = 2, adjust: str = "qfq") -> pd.DataFrame:
        """获取历史行情数据"""
        try:
            end = datetime.now().strftime("%Y%m%d")
            start = (datetime.now() - timedelta(days=365 * years)).strftime("%Y%m%d")
            df = ak.stock_zh_a_hist(
                symbol=symbol, period="daily",
                start_date=start, end_date=end, adjust=adjust
            )
            if df.empty:
                return pd.DataFrame()
            
            df.rename(columns={
                '日期': 'date', '开盘': 'open', '收盘': 'close',
                '最高': 'high', '最低': 'low', '成交量': 'volume',
                '成交额': 'amount', '振幅': 'amplitude',
                '涨跌幅': 'pct_chg', '涨跌额': 'change', '换手率': 'turnover'
            }, inplace=True, errors='ignore')
            
            df['date'] = pd.to_datetime(df['date'])
            df.sort_values('date', inplace=True)
            return df
        except Exception as e:
            logger.error(f"获取历史行情失败: {e}")
            return pd.DataFrame()

    def get_financial_indicators(self, symbol: str) -> pd.DataFrame:
        """获取财务分析指标"""
        try:
            return ak.stock_financial_analysis_indicator(symbol=symbol)
        except Exception as e:
            logger.error(f"获取财务指标失败: {e}")
            return pd.DataFrame()

    def get_balance_sheet(self, symbol: str) -> pd.DataFrame:
        """获取资产负债表"""
        try:
            return ak.stock_balance_sheet_by_report_em(symbol=symbol)
        except Exception as e:
            logger.error(f"获取资产负债表失败: {e}")
            return pd.DataFrame()

    def get_cashflow(self, symbol: str) -> pd.DataFrame:
        """获取现金流量表"""
        try:
            return ak.stock_cash_flow_by_report_em(symbol=symbol)
        except Exception as e:
            logger.error(f"获取现金流量表失败: {e}")
            return pd.DataFrame()

    def get_company_info(self, symbol: str) -> Dict[str, Any]:
        """获取个股基本信息"""
        try:
            info = ak.stock_individual_info_em(symbol=symbol)
            return dict(zip(info['item'], info['value']))
        except Exception as e:
            logger.error(f"获取公司信息失败: {e}")
            return {}

    def get_pledge_ratio(self, symbol: str, date: str = None) -> pd.DataFrame:
        """股权质押比例"""
        try:
            if date is None:
                date = datetime.now().strftime("%Y%m%d")
            df = ak.stock_gpzy_pledge_ratio_em(date=date)
            if df.empty:
                return pd.DataFrame()
            return df[df['股票代码'] == symbol]
        except Exception as e:
            logger.error(f"获取质押比例失败: {e}")
            return pd.DataFrame()

    def get_pledge_detail(self, symbol: str) -> pd.DataFrame:
        """股权质押明细"""
        try:
            return ak.stock_gpzy_pledge_em(symbol=symbol)
        except Exception as e:
            logger.error(f"获取质押明细失败: {e}")
            return pd.DataFrame()

    def get_goodwill(self, symbol: str) -> pd.DataFrame:
        """商誉数据"""
        try:
            return ak.stock_sy_em(symbol=symbol)
        except Exception as e:
            logger.error(f"获取商誉数据失败: {e}")
            return pd.DataFrame()

    def get_insider_holdings(self, symbol: str) -> pd.DataFrame:
        """高管持股变动"""
        try:
            if symbol.startswith(('600', '601', '603')):
                return ak.stock_share_hold_change_sse(symbol=symbol)
            elif symbol.startswith(('000', '001', '002', '003', '300')):
                return ak.stock_share_hold_change_szse(symbol=symbol)
            return pd.DataFrame()
        except Exception as e:
            logger.error(f"获取高管持股失败: {e}")
            return pd.DataFrame()

    def get_cyq(self, symbol: str, adjust: str = "") -> pd.DataFrame:
        """筹码分布"""
        try:
            return ak.stock_cyq_em(symbol=symbol, adjust=adjust)
        except Exception as e:
            logger.error(f"获取筹码分布失败: {e}")
            return pd.DataFrame()

    def get_fund_flow(self, symbol: str) -> pd.DataFrame:
        """资金流向"""
        try:
            return ak.stock_individual_fund_flow(symbol=symbol)
        except Exception as e:
            logger.error(f"获取资金流向失败: {e}")
            return pd.DataFrame()

    def get_margin_balance(self, symbol: str) -> pd.DataFrame:
        """融资融券"""
        try:
            sh = ak.stock_margin_sse(start_date='', end_date='')
            sz = ak.stock_margin_szse(start_date='', end_date='')
            df = pd.concat([sh, sz], ignore_index=True)
            return df[df['证券代码'] == symbol]
        except Exception as e:
            logger.error(f"获取融资融券失败: {e}")
            return pd.DataFrame()

    def get_news(self, symbol: str) -> pd.DataFrame:
        """个股新闻"""
        try:
            return ak.stock_news_em(symbol=symbol)
        except Exception as e:
            logger.error(f"获取新闻失败: {e}")
            return pd.DataFrame()

    def get_analyst_rating(self, symbol: str) -> Dict[str, Any]:
        """分析师评级"""
        try:
            df = ak.stock_institute_recommend(symbol="最新投资评级")
            df_stock = df[df['股票代码'] == symbol]
            if df_stock.empty:
                return {"error": "未找到该股票评级数据"}
            latest = df_stock.sort_values('评级日期', ascending=False).iloc[0]
            return {
                "stock_code": str(latest.get('股票代码', '')),
                "stock_name": str(latest.get('股票名称', '')),
                "latest_rating": str(latest.get('最新评级', '')),
                "target_price": float(latest.get('目标价', 0)) if pd.notna(latest.get('目标价')) else None,
                "rating_date": str(latest.get('评级日期', '')),
                "industry": str(latest.get('行业', ''))
            }
        except Exception as e:
            logger.error(f"获取分析师评级失败: {e}")
            return {"error": str(e)}

    def get_profit_forecast(self, symbol: str) -> pd.DataFrame:
        """盈利预测"""
        try:
            return ak.stock_profit_forecast_em(symbol=symbol)
        except Exception as e:
            logger.error(f"获取盈利预测失败: {e}")
            return pd.DataFrame()
