"""
全局异常处理器 - 统一处理所有异常
"""

import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from .exceptions import StockAnalysisError, handle_stock_analysis_error

logger = logging.getLogger(__name__)


def setup_exception_handlers(app: FastAPI) -> None:
    """设置全局异常处理器"""
    
    @app.exception_handler(StockAnalysisError)
    async def stock_analysis_exception_handler(request: Request, exc: StockAnalysisError):
        """处理自定义股票分析异常"""
        logger.error(f"Stock Analysis Error: {exc.message}", extra=exc.details)
        http_exc = handle_stock_analysis_error(exc)
        return JSONResponse(
            status_code=http_exc.status_code,
            content=http_exc.detail
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """处理HTTP异常"""
        logger.warning(f"HTTP Exception: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTP_ERROR",
                "message": str(exc.detail),
                "details": {}
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """处理未捕获的通用异常"""
        logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_SERVER_ERROR",
                "message": "服务器内部错误，请稍后重试",
                "details": {}
            }
        )