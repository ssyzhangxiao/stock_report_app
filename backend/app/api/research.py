from fastapi import APIRouter, HTTPException, Query
from dataclasses import asdict
from ..services.research_service import (
    list_research_reports,
    load_research_report,
    search_research_reports,
)

router = APIRouter(prefix="/api/research", tags=["研究报告"])


@router.get("/reports", summary="获取所有研究报告列表")
async def get_research_reports():
    reports = list_research_reports()
    return {
        "total": len(reports),
        "reports": [asdict(r) for r in reports],
    }


@router.get("/reports/{directory}", summary="获取单个研究报告详情")
async def get_research_report(directory: str):
    report = load_research_report(directory)
    if report is None:
        raise HTTPException(status_code=404, detail=f"研究报告 {directory} 不存在")
    return asdict(report)


@router.get("/reports/{directory}/section/{section_name}", summary="获取研究报告特定章节")
async def get_research_section(directory: str, section_name: str):
    report = load_research_report(directory)
    if report is None:
        raise HTTPException(status_code=404, detail=f"研究报告 {directory} 不存在")

    section_map = {
        "executive_summary": report.executive_summary,
        "business_foundation": report.business_foundation,
        "industry_analysis": report.industry_analysis,
        "business_breakdown": report.business_breakdown,
        "financial_quality": report.financial_quality,
        "governance_analysis": report.governance_analysis,
        "market_sentiment": report.market_sentiment,
        "valuation_moat": report.valuation_moat,
        "risk_monitoring": report.risk_monitoring,
        "valuation_history": report.valuation_history,
        "product_lines": report.product_lines,
    }

    if section_name == "financial_data":
        return {"section": "financial_data", "data": report.financial_data}

    section = section_map.get(section_name)
    if section is None:
        raise HTTPException(status_code=404, detail=f"章节 {section_name} 不存在")

    return asdict(section)


@router.get("/search", summary="搜索研究报告")
async def search_reports(q: str = Query(..., description="搜索关键词")):
    results = search_research_reports(q)
    return {
        "query": q,
        "total": len(results),
        "reports": [asdict(r) for r in results],
    }


@router.get("/reports/{directory}/raw/{filepath:path}", summary="获取原始Markdown文件内容")
async def get_raw_markdown(directory: str, filepath: str):
    report = load_research_report(directory)
    if report is None:
        raise HTTPException(status_code=404, detail=f"研究报告 {directory} 不存在")

    content = report.raw_files.get(filepath)
    if content is None:
        raise HTTPException(status_code=404, detail=f"文件 {filepath} 不存在")

    return {"filepath": filepath, "content": content}
