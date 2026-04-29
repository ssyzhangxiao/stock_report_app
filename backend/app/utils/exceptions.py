"""
自定义异常类 - 股票分析系统专用异常处理
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, status


class StockAnalysisError(Exception):
    """股票分析系统基础异常类"""
    
    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class DataFetchError(StockAnalysisError):
    """数据获取异常"""
    
    def __init__(self, message: str, symbol: Optional[str] = None, data_source: Optional[str] = None):
        details = {
            "symbol": symbol,
            "data_source": data_source,
            "error_type": "DATA_FETCH_ERROR"
        }
        super().__init__(message, "DATA_FETCH_ERROR", details)


class ValidationError(StockAnalysisError):
    """数据验证异常"""
    
    def __init__(self, message: str, field: Optional[str] = None, value: Optional[str] = None):
        details = {
            "field": field,
            "value": value,
            "error_type": "VALIDATION_ERROR"
        }
        super().__init__(message, "VALIDATION_ERROR", details)


class AnalysisError(StockAnalysisError):
    """分析处理异常"""
    
    def __init__(self, message: str, analysis_type: Optional[str] = None):
        details = {
            "analysis_type": analysis_type,
            "error_type": "ANALYSIS_ERROR"
        }
        super().__init__(message, "ANALYSIS_ERROR", details)


class ExternalServiceError(StockAnalysisError):
    """外部服务异常"""
    
    def __init__(self, message: str, service_name: Optional[str] = None):
        details = {
            "service_name": service_name,
            "error_type": "EXTERNAL_SERVICE_ERROR"
        }
        super().__init__(message, "EXTERNAL_SERVICE_ERROR", details)


def handle_stock_analysis_error(error: StockAnalysisError) -> HTTPException:
    """将自定义异常转换为HTTP异常"""
    
    error_mapping = {
        "DATA_FETCH_ERROR": status.HTTP_503_SERVICE_UNAVAILABLE,
        "VALIDATION_ERROR": status.HTTP_400_BAD_REQUEST,
        "ANALYSIS_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "EXTERNAL_SERVICE_ERROR": status.HTTP_502_BAD_GATEWAY,
    }
    
    status_code = error_mapping.get(error.error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return HTTPException(
        status_code=status_code,
        detail={
            "error": error.error_code,
            "message": error.message,
            "details": error.details
        }
    )