from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import pandas as pd


class MarketDataSource(ABC):
    """行情数据源接口"""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def is_available(self) -> bool: ...

    @abstractmethod
    def get_daily(
        self, symbol: str, years: int = 2, adjust: str = "qfq"
    ) -> Optional[pd.DataFrame]: ...

    @abstractmethod
    def get_company_info(self, symbol: str) -> Optional[Dict[str, Any]]: ...

    def get_cyq(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_fund_flow(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_news(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_industry_index(
        self, industry_code: str = None, days: int = 180
    ) -> Optional[pd.DataFrame]:
        return None


class FundamentalDataSource(ABC):
    """基本面数据源接口"""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def is_available(self) -> bool: ...

    def get_financial_indicators(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_balance_sheet(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_cashflow(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_free_cashflow(self, symbol: str, years: int = 5) -> Optional[pd.DataFrame]:
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

    def get_analyst_rating(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    def get_profit_forecast(self, symbol: str) -> Optional[pd.DataFrame]:
        return None

    def get_industry_class(self, symbol: str) -> Optional[Dict[str, str]]:
        return None

    def get_capital_operation(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None


class AIDataSource(ABC):
    """AI 分析数据源接口"""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def is_available(self) -> bool: ...

    def generate_smart_analysis(
        self, symbol: str, stock_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        return None

    def generate_analysis_from_knowledge(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None


class DataSource(MarketDataSource, FundamentalDataSource, AIDataSource):
    """数据源抽象基类（向后兼容，合并三个接口）"""

    pass
