"""
数据源接口定义
"""
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod


class DataSource(ABC):
    """数据源基类"""
    
    @abstractmethod
    def is_available(self) -> bool:
        """检查数据源是否可用"""
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """获取数据源名称"""
        pass


class StockDataSource(DataSource):
    """股票数据源接口"""
    
    @abstractmethod
    def get_daily_data(self, symbol: str, years: int = 2) -> Optional[Any]:
        """获取日线数据"""
        pass
    
    @abstractmethod
    def get_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取公司信息"""
        pass
    
    @abstractmethod
    def get_financial_indicators(self, symbol: str) -> Optional[Any]:
        """获取财务指标"""
        pass
    
    @abstractmethod
    def get_pledge_ratio(self, symbol: str) -> Optional[Any]:
        """获取质押比例"""
        pass
    
    @abstractmethod
    def get_margin_balance(self, symbol: str) -> Optional[Any]:
        """获取融资融券"""
        pass
    
    @abstractmethod
    def get_cyq(self, symbol: str) -> Optional[Any]:
        """获取筹码分布"""
        pass
    
    @abstractmethod
    def get_insider_holdings(self, symbol: str) -> Optional[Any]:
        """获取高管持股"""
        pass
    
    @abstractmethod
    def get_news(self, symbol: str) -> Optional[Any]:
        """获取新闻"""
        pass
    
    @abstractmethod
    def get_analyst_rating(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取分析师评级"""
        pass
    
    @abstractmethod
    def get_fund_flow(self, symbol: str) -> Optional[Any]:
        """获取资金流向"""
        pass


class AIAnalysisSource(DataSource):
    """AI 分析数据源接口"""
    
    @abstractmethod
    def generate_comprehensive_analysis(self, symbol: str) -> Optional[Dict[str, Any]]:
        """生成综合分析"""
        pass
    
    @abstractmethod
    def generate_smart_analysis(self, symbol: str, stock_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """基于已有数据生成智能分析"""
        pass