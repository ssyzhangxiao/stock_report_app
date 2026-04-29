from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any
import logging

from ..services.data_sources import get_source_manager
from ..utils.validators import validate_api_input

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/stock/{symbol}")
async def full_analysis(
    symbol: str,
    source: str = Query("auto", description="数据源: auto/sina/eastmoney/qwen/deepseek"),
    years: int = Query(2, ge=1, le=10),
):
    try:
        validated = validate_api_input(symbol, years)
        symbol = validated["symbol"]
        years = validated["years"]

        manager = get_source_manager()
        logger.info(f"[API] symbol={symbol} source={source} years={years}")
        return manager.analyze(symbol, source=source, years=years)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"分析失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.get("/sources")
async def list_sources():
    manager = get_source_manager()
    return {"sources": manager.list_sources()}


@router.get("/health")
async def health_check():
    return {"status": "ok"}
