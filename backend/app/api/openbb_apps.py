"""
OpenBB Workspace 集成端点。

提供 /widgets.json 和 /apps.json 供 OpenBB Workspace 发现和渲染。
"""

import logging
from typing import Any

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from ..services.data_sources import get_source_manager
from ..services.llm_service import get_llm_service
from ..skills import skill_engine
from .response_models import MetricResponseModel, OmniWidgetResponseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["openbb"])

# 同时创建一个无前缀的 router 供 OpenBB Workspace 根路径调用
root_router = APIRouter(tags=["openbb"])

WIDGETS_JSON: dict[str, Any] = {}
APPS_JSON: list[dict] = []


def _build_widgets_json() -> dict:
    """构建 widgets.json - OpenBB Workspace 的 Widget 注册表。"""
    return {
        "stock_analysis_health": {
            "name": "系统健康检查",
            "description": "检查后端服务状态",
            "endpoint": "/api/openbb/health-widget",
            "widget_type": "metric",
            "category": "系统",
        },
        "stock_analysis_price": {
            "name": "最新股价",
            "description": "显示股票最新价格和涨跌幅",
            "endpoint": "/api/openbb/price-widget",
            "widget_type": "metric",
            "category": "行情",
            "params": {"symbol": "600519"},
        },
        "stock_analysis_valuation": {
            "name": "估值概览",
            "description": "PE/PB/市值等核心估值指标",
            "endpoint": "/api/openbb/valuation-widget",
            "widget_type": "omni",
            "category": "估值分析",
            "params": {"symbol": "600519"},
        },
        "stock_analysis_risk": {
            "name": "风险分析",
            "description": "AI驱动的风险综合评估",
            "endpoint": "/api/openbb/risk-widget",
            "widget_type": "omni",
            "category": "风险监控",
            "params": {"symbol": "600519"},
        },
        "stock_analysis_skills": {
            "name": "技能列表",
            "description": "可用的分析技能和模式",
            "endpoint": "/api/openbb/skills-widget",
            "widget_type": "omni",
            "category": "技能系统",
        },
        "stock_analysis_news": {
            "name": "新闻舆情",
            "description": "最新新闻和舆情分析",
            "endpoint": "/api/openbb/news-widget",
            "widget_type": "omni",
            "category": "舆情分析",
            "params": {"symbol": "600519"},
        },
        "stock_analysis_smart": {
            "name": "智能综合分析",
            "description": "LLM驱动的多维度综合研判",
            "endpoint": "/api/openbb/smart-widget",
            "widget_type": "omni",
            "category": "AI分析",
            "params": {"symbol": "600519"},
        },
    }


def _build_apps_json() -> list[dict]:
    """构建 apps.json - OpenBB Workspace 的 App 模板。"""
    return [
        {
            "name": "A股智能分析系统",
            "description": "多源数据驱动的A股深度分析平台 · Skills驱动LLM · 可视化报告",
            "icon": "📊",
            "allowCustomization": True,
            "tabs": {
                "仪表盘": {
                    "layout": [
                        {"i": "stock_analysis_health", "x": 0, "y": 0, "w": 3, "h": 2},
                        {"i": "stock_analysis_price", "x": 3, "y": 0, "w": 3, "h": 2},
                        {"i": "stock_analysis_valuation", "x": 0, "y": 2, "w": 6, "h": 4},
                        {"i": "stock_analysis_news", "x": 6, "y": 0, "w": 6, "h": 6},
                    ]
                },
                "AI分析": {
                    "layout": [
                        {"i": "stock_analysis_smart", "x": 0, "y": 0, "w": 8, "h": 6},
                        {"i": "stock_analysis_skills", "x": 8, "y": 0, "w": 4, "h": 6},
                    ]
                },
                "风险监控": {
                    "layout": [
                        {"i": "stock_analysis_risk", "x": 0, "y": 0, "w": 12, "h": 6},
                    ]
                },
            },
        }
    ]


WIDGETS_JSON = _build_widgets_json()
APPS_JSON = _build_apps_json()


@router.get("/widgets.json", include_in_schema=False)
@root_router.get("/widgets.json", include_in_schema=False)
async def get_widgets():
    """Widgets 配置文件 - OpenBB Workspace 自动发现。"""
    return JSONResponse(content=WIDGETS_JSON)


@router.get("/apps.json", include_in_schema=False)
@root_router.get("/apps.json", include_in_schema=False)
async def get_apps():
    """Apps 配置文件 - OpenBB Workspace 自动发现。"""
    return JSONResponse(content=APPS_JSON)


@router.get("/openbb/health-widget", response_model=MetricResponseModel)
@root_router.get("/openbb/health-widget", response_model=MetricResponseModel)
async def health_widget():
    """系统健康状态 Widget。"""
    return MetricResponseModel(
        label="系统状态",
        value="运行中 ✅",
        delta="v1.0",
    )


@router.get("/openbb/price-widget", response_model=MetricResponseModel)
@root_router.get("/openbb/price-widget", response_model=MetricResponseModel)
async def price_widget(symbol: str = Query("600519", description="股票代码")):
    """最新股价 Widget。"""
    try:
        manager = get_source_manager()
        data = manager.analyze(symbol, source="auto", years=1)
        price = data.get("latest_price", 0)
        pct_chg = data.get("technical", {}).get("pct_chg", 0) or 0

        return MetricResponseModel(
            label=f"{symbol} 最新价",
            value=f"¥{price:.2f}" if price else "N/A",
            delta=f"{pct_chg:+.2f}%" if pct_chg else None,
        )
    except Exception as e:
        logger.error(f"价格查询失败: {e}")
        return MetricResponseModel(label=f"{symbol}", value="获取失败", delta=str(e)[:50])


@router.get("/openbb/valuation-widget", response_model=OmniWidgetResponseModel)
@root_router.get("/openbb/valuation-widget", response_model=OmniWidgetResponseModel)
async def valuation_widget(symbol: str = Query("600519", description="股票代码")):
    """估值概览 Widget。"""
    try:
        manager = get_source_manager()
        data = manager.analyze(symbol, source="auto", years=1)
        valuation = data.get("valuation", {})

        content = {
            "columns": ["指标", "数值"],
            "rows": [
                ["PE(TTM)", str(valuation.get("pe_ratio", "N/A"))],
                ["PB", str(valuation.get("pb_ratio", "N/A"))],
                ["市值", str(valuation.get("market_cap", "N/A"))],
                ["行业PE", str(valuation.get("industry_pe", "N/A"))],
                ["最新价", f"¥{data.get('latest_price', 0):.2f}" if data.get("latest_price") else "N/A"],
            ],
        }
        return OmniWidgetResponseModel(content=content, parse_as="table")
    except Exception as e:
        logger.error(f"估值查询失败: {e}")
        return OmniWidgetResponseModel(content=f"获取失败: {e}", parse_as="text")


@router.get("/openbb/risk-widget", response_model=OmniWidgetResponseModel)
@root_router.get("/openbb/risk-widget", response_model=OmniWidgetResponseModel)
async def risk_widget(symbol: str = Query("600519", description="股票代码")):
    """风险分析 Widget - 使用 LLM + Skills 驱动。"""
    try:
        manager = get_source_manager()
        data = manager.analyze(symbol, source="auto", years=1)

        llm = get_llm_service()
        if not llm.is_available():
            return OmniWidgetResponseModel(content="LLM服务不可用，请配置API Key", parse_as="text")

        skill_engine.set_llm_service(llm)
        skill_engine.register_all()

        result = skill_engine.execute_skill("pledge-risk", symbol, data)

        if result.status == "completed" and result.data:
            return OmniWidgetResponseModel(content=result.data, parse_as="table")
        else:
            return OmniWidgetResponseModel(content=f"分析失败: {result.error}", parse_as="text")

    except Exception as e:
        logger.error(f"风险分析失败: {e}")
        return OmniWidgetResponseModel(content=f"分析异常: {e}", parse_as="text")


@router.get("/openbb/skills-widget", response_model=OmniWidgetResponseModel)
@root_router.get("/openbb/skills-widget", response_model=OmniWidgetResponseModel)
async def skills_widget():
    """技能系统 Widget - 展示可用技能和分析模式。"""
    # 确保技能引擎已初始化
    try:
        if len(skill_engine.get_all_skills()) == 0:
            skill_engine.register_all()
    except Exception as e:
        logger.warning(f"技能引擎初始化可能已执行过: {e}")

    skills = skill_engine.get_all_skills()
    modes = skill_engine.get_all_modes()

    content = {
        "skills": [s.to_dict() for s in skills],
        "modes": [m.to_dict() for m in modes],
        "total_skills": len(skills),
        "total_modes": len(modes),
    }

    return OmniWidgetResponseModel(content=content, parse_as="table")


@router.get("/openbb/news-widget", response_model=OmniWidgetResponseModel)
@root_router.get("/openbb/news-widget", response_model=OmniWidgetResponseModel)
async def news_widget(symbol: str = Query("600519", description="股票代码")):
    """新闻舆情 Widget。"""
    try:
        manager = get_source_manager()
        data = manager.analyze(symbol, source="auto", years=1)
        news = data.get("news_analysis", [])

        if not news:
            return OmniWidgetResponseModel(content="暂无新闻数据", parse_as="text")

        rows = []
        for item in news[:10]:
            if isinstance(item, dict):
                rows.append([
                    item.get("title", "")[:40],
                    item.get("source", ""),
                    item.get("sentiment", "中性"),
                ])

        content = {
            "columns": ["标题", "来源", "情绪"],
            "rows": rows,
        }
        return OmniWidgetResponseModel(content=content, parse_as="table")
    except Exception as e:
        logger.error(f"新闻查询失败: {e}")
        return OmniWidgetResponseModel(content=f"获取失败: {e}", parse_as="text")


@router.get("/openbb/smart-widget", response_model=OmniWidgetResponseModel)
@root_router.get("/openbb/smart-widget", response_model=OmniWidgetResponseModel)
async def smart_widget(symbol: str = Query("600519", description="股票代码")):
    """智能综合分析 Widget - LLM 多维度研判。"""
    try:
        manager = get_source_manager()
        data = manager.analyze(symbol, source="auto", years=2)

        llm = get_llm_service()
        if not llm.is_available():
            return OmniWidgetResponseModel(content="LLM服务不可用", parse_as="text")

        from ..services.smart_analysis_service import get_smart_analysis_service
        smart = get_smart_analysis_service()
        analysis = smart.analyze(symbol, data)

        return OmniWidgetResponseModel(content=analysis, parse_as="table")
    except Exception as e:
        logger.error(f"智能分析失败: {e}")
        return OmniWidgetResponseModel(content=f"分析异常: {e}", parse_as="text")
