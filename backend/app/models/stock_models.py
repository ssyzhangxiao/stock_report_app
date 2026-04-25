from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class StockAnalysisResponse(BaseModel):
    """完整的股票分析响应模型"""
    symbol: str
    company_info: Dict[str, Any]
    latest_price: float
    technical: Dict[str, Any]
    valuation: Dict[str, Any]
    deep_financial: Dict[str, Any]
    news_analysis: List[Dict[str, Any]]
    analyst_consensus: Dict[str, Any]
    risk_indicators: Dict[str, Any]
    fund_flow: List[Dict[str, Any]]
    history: List[Dict[str, Any]]
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
