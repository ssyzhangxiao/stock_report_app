from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import pandas as pd


class DataSource(ABC):
    """数据源抽象基类"""

    @property
    @abstractmethod
    def name(self) -> str:
        """数据源标识符"""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """数据源是否可用"""
        ...

    # ---- 必选接口（每个数据源都必须实现） ----

    @abstractmethod
    def get_daily(self, symbol: str, years: int = 2, adjust: str = "qfq") -> Optional[pd.DataFrame]:
        """历史行情"""
        ...

    @abstractmethod
    def get_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """公司信息"""
        ...

    # ---- 可选接口（不支持的返回 None） ----

    def get_financial_indicators(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_balance_sheet(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_cashflow(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_income_statement(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_insider_holdings(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_margin_balance(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_pledge_ratio(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_pledge_detail(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_goodwill(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_cyq(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_fund_flow(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_news(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_analyst_rating(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    def get_profit_forecast(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    # ---- AI 分析接口（仅 AI 数据源实现） ----

    def generate_smart_analysis(self, symbol: str, stock_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return None

    def generate_analysis_from_knowledge(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None
