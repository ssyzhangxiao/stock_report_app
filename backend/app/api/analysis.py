from fastapi import APIRouter, Query, HTTPException
import logging
from datetime import datetime

from ..services.data_sources import get_source_manager
from ..utils.validators import validate_api_input
from ..services.llm_service import get_llm_service
from ..services.smart_analysis_service import get_smart_analysis_service
from ..services.dexter_client import get_dexter_client
from ..services.dcf_calculator import dcf_calculator

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

        from starlette.concurrency import run_in_threadpool
        manager = get_source_manager()
        logger.info(f"[API] symbol={symbol} source={source} years={years}")
        return await run_in_threadpool(manager.analyze, symbol, source, years)

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


@router.get("/risk/{symbol}")
async def generate_risk_analysis(symbol: str):
    """调用AI生成控制权转让风险分析（使用新版LLMService）"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    llm = get_llm_service()
    if not llm.is_available():
        logger.warning("[RiskAnalysis] AI服务不可用，返回默认模板数据")
        return {
            "overall_risk_level": "中",
            "risk_score": 5,
            "key_risk_factors": [
                "历史沿革需进一步核实",
                "控制权比例有待确认",
                "减持约束条件不明确",
                "业务稳定性需观察",
                "资产注入预期不清晰",
                "掏空风险初步可控"
            ],
            "technical_risk_view": "股价整体平稳，需关注后续量能变化",
            "fundamental_risk_view": "基本面数据尚可，需结合控制权变更进一步评估",
            "market_sentiment_view": "市场对控制权转让关注度适中，暂无异常波动",
            "investment_strategy": "建议观望为主，等待控制权转让事项明确后再决策",
            "additional_notes": "本分析为模板数据，请等待AI服务恢复或手动分析"
        }

    try:
        today = datetime.now().strftime("%Y年%m月%d日")
        system_prompt = f"""你是并购顾问，对股票{symbol}进行控制权转让风险分析。
当前日期：{today}

分析维度：
1. 整体风险等级与控制权转让风险评分
2. 关键风险因素（历史沿革、控制权比例、减持约束、业务稳定性、资产注入、掏空风险等）
3. 技术面风险观点
4. 基本面风险观点
5. 市场情绪观点
6. 投资策略建议
7. 补充说明

必须返回纯JSON（不要任何其他文字）：
{{"overall_risk_level":"低/中/高","risk_score":数值,"key_risk_factors":["因素1","因素2","因素3","因素4","因素5","因素6"],"technical_risk_view":"技术面观点80字内","fundamental_risk_view":"基本面观点80字内","market_sentiment_view":"市场情绪观点80字内","investment_strategy":"投资策略80字内","additional_notes":"补充说明80字内"}}"""

        logger.info(f"[RiskAnalysis] 调用 AI 分析 {symbol}")
        result = llm.call_llm_json(
            system_prompt=system_prompt,
            user_prompt=f"请对 {symbol} 进行控制权转让风险分析",
            temperature=0.3,
        )
        if result:
            logger.info(f"[RiskAnalysis] AI 分析成功: {result.get('overall_risk_level')}")
            return result
        else:
            logger.warning("[RiskAnalysis] AI 返回为空，返回默认数据")
            return {
                "overall_risk_level": "中",
                "risk_score": 5,
                "key_risk_factors": [
                    "历史沿革需进一步核实",
                    "控制权比例有待确认",
                    "减持约束条件不明确",
                    "业务稳定性需观察",
                    "资产注入预期不清晰",
                    "掏空风险初步可控"
                ],
                "technical_risk_view": "股价整体平稳，需关注后续量能变化",
                "fundamental_risk_view": "基本面数据尚可，需结合控制权变更进一步评估",
                "market_sentiment_view": "市场对控制权转让关注度适中，暂无异常波动",
                "investment_strategy": "建议观望为主，等待控制权转让事项明确后再决策",
                "additional_notes": "AI分析暂时失败，已返回默认模板数据"
            }
    except Exception as e:
        logger.error(f"[RiskAnalysis] 调用 AI 失败: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "overall_risk_level": "中",
            "risk_score": 5,
            "key_risk_factors": [
                "历史沿革需进一步核实",
                "控制权比例有待确认",
                "减持约束条件不明确",
                "业务稳定性需观察",
                "资产注入预期不清晰",
                "掏空风险初步可控"
            ],
            "technical_risk_view": "股价整体平稳，需关注后续量能变化",
            "fundamental_risk_view": "基本面数据尚可，需结合控制权变更进一步评估",
            "market_sentiment_view": "市场对控制权转让关注度适中，暂无异常波动",
            "investment_strategy": "建议观望为主，等待控制权转让事项明确后再决策",
            "additional_notes": f"AI分析异常: {str(e)[:50]}，已返回默认模板数据"
        }


@router.get("/control-status/{symbol}")
async def control_status(symbol: str):
    """调用AI获取控制权转让状态信息（使用新版LLMService）"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    try:
        llm = get_llm_service()
        if not llm.is_available():
            raise HTTPException(status_code=503, detail="AI服务不可用，请配置 LLM API Key")

        today = datetime.now().strftime("%Y-%m-%d")
        system_prompt = (
            "当前日期：" + today + "\n"
            "你是一名并购顾问，请搜索并整理股票 " + symbol + " 的控制权转让相关信息。\n"
            "返回以下JSON（不要其他文字）：\n"
            '{"actual_controller":"实际控制人名称或未知","controller_ratio":"持股比例或未知",'
            '"has_transfer_intent":"是否有转让意向(是/否/未知)","transfer_progress":"转让进度描述",'
            '"recent_events":[{"日期":"日期","事件":"事件描述"}],'
            '"exchange_inquiry":"交易所问询状态","price_if_known":"传闻转让价/每股或未知",'
            '"current_price":"当前股价数值或0","potential_buyers":"潜在买家名称或未知",'
            '"buyer_description":"买家背景简介(如有)","premium_rate":"若已知转让价则计算溢价率百分数如25或未知",'
            '"comparable_cases":[{"company":"可比公司名","deal_price":"转让价格","result":"转让后表现简述"}],'
            '"summary":"控制权状态一句话总结80字"}'
        )

        result = llm.call_llm_json(
            system_prompt=system_prompt,
            user_prompt=f"请查询并整理 {symbol} 的控制权转让信息",
            temperature=0.3,
        )
        if not result:
            logger.error(f"[ControlStatus] AI返回为空 symbol={symbol}")
            raise HTTPException(status_code=500, detail="AI未返回有效数据，请检查 API Key 是否有效")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ControlStatus] 控制权状态获取异常: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"AI分析异常: {str(e)[:100]}")


@router.get("/smart-analyze/{symbol}")
async def smart_analysis(symbol: str, years: int = Query(2, ge=1, le=10)):
    """新版综合智能分析：规则计算 + 单次LLM综合研判"""
    try:
        validated = validate_api_input(symbol, years)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    try:
        from starlette.concurrency import run_in_threadpool

        def _do_analysis():
            manager = get_source_manager()
            stock_data = manager.analyze(symbol, source="auto", years=years)

            if stock_data.get("data_source") == "unavailable":
                return {
                    "symbol": symbol,
                    "smart_analysis": {"available": False, "error": "数据不可用"},
                    "stock_data": stock_data,
                }

            smart = get_smart_analysis_service()
            analysis = smart.analyze(symbol, stock_data)

            return {
                "symbol": symbol,
                "smart_analysis": analysis,
                "stock_data": stock_data,
            }

        return await run_in_threadpool(_do_analysis)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"智能分析失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"智能分析失败: {str(e)}")


@router.get("/llm-providers")
async def list_llm_providers():
    """列出所有 LLM 供应商配置状态"""
    llm = get_llm_service()
    providers = llm.list_available_providers()
    current = llm.provider.value if llm.is_available() else None
    return {
        "providers": providers,
        "current_provider": current,
        "available": llm.is_available(),
    }


@router.get("/dexter/health")
async def dexter_health():
    """检查 Dexter Agent API 是否可用"""
    dexter = get_dexter_client()
    available = await dexter.health_check()
    return {"available": available, "url": "http://localhost:3456"}


@router.post("/dexter/dcf/{symbol}")
async def dexter_dcf(symbol: str, name: str = Query("", description="股票名称")):
    """Dexter DCF 估值分析"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    dexter = get_dexter_client()
    if not await dexter.health_check():
        raise HTTPException(status_code=503, detail="Dexter Agent 服务不可用，请先启动 Dexter API Server")

    result = await dexter.analyze_dcf(symbol, name)
    return {"symbol": symbol, "type": "dcf", **result}


@router.post("/dexter/x-sentiment/{symbol}")
async def dexter_x_sentiment(symbol: str, name: str = Query("", description="股票名称")):
    """Dexter X/Twitter 舆情分析"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    dexter = get_dexter_client()
    if not await dexter.health_check():
        raise HTTPException(status_code=503, detail="Dexter Agent 服务不可用，请先启动 Dexter API Server")

    result = await dexter.analyze_x_sentiment(symbol, name)
    return {"symbol": symbol, "type": "x_sentiment", **result}


@router.post("/dexter/insider/{symbol}")
async def dexter_insider(symbol: str, name: str = Query("", description="股票名称")):
    """Dexter 内部人交易分析"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    dexter = get_dexter_client()
    if not await dexter.health_check():
        raise HTTPException(status_code=503, detail="Dexter Agent 服务不可用，请先启动 Dexter API Server")

    result = await dexter.analyze_insider_trades(symbol, name)
    return {"symbol": symbol, "type": "insider_trades", **result}


@router.post("/dexter/report/{symbol}")
async def dexter_report(symbol: str, name: str = Query("", description="股票名称")):
    """Dexter 综合研究报告"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    dexter = get_dexter_client()
    if not await dexter.health_check():
        raise HTTPException(status_code=503, detail="Dexter Agent 服务不可用，请先启动 Dexter API Server")

    result = await dexter.comprehensive_report(symbol, name)
    return {"symbol": symbol, "type": "comprehensive_report", **result}


@router.get("/web-search/{symbol}")
async def web_search(symbol: str, max_results: int = Query(10, ge=1, le=30)):
    """网页搜索股票相关新闻和信息"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    try:
        from ..services.web_search_service import get_web_search_service
        service = get_web_search_service()
        results = service.search_stock_news(symbol, max_results=max_results)
        return {
            "symbol": symbol,
            "total": len(results),
            "results": [r.to_dict() for r in results],
        }
    except Exception as e:
        logger.error(f"[WebSearch] 搜索失败: {e}")
        raise HTTPException(status_code=500, detail=f"网页搜索失败: {str(e)}")


@router.get("/web-fetch/{symbol}")
async def web_fetch(symbol: str):
    """从财经网站抓取股票相关页面内容"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    try:
        from ..services.web_fetch_service import get_web_fetch_service
        service = get_web_fetch_service()
        articles = service.fetch_stock_pages(symbol)
        return {
            "symbol": symbol,
            "total": len(articles),
            "articles": [a.to_dict() for a in articles],
        }
    except Exception as e:
        logger.error(f"[WebFetch] 抓取失败: {e}")
        raise HTTPException(status_code=500, detail=f"网页抓取失败: {str(e)}")


@router.get("/news-aggregate/{symbol}")
async def news_aggregate(symbol: str):
    """多源新闻聚合（东财API + 网页搜索 + 网页抓取）"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    try:
        from ..services.news_aggregator import get_news_aggregator
        aggregator = get_news_aggregator()
        result = aggregator.aggregate(symbol)
        return {
            "symbol": symbol,
            **result,
        }
    except Exception as e:
        logger.error(f"[NewsAggregate] 聚合失败: {e}")
        raise HTTPException(status_code=500, detail=f"新闻聚合失败: {str(e)}")


@router.get("/peer-companies/{symbol}")
async def get_peer_companies(symbol: str):
    """获取可比公司列表（动态生成）"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    try:
        manager = get_source_manager()
        stock_data = manager.analyze(symbol, source="auto", years=2)
        
        company_info = stock_data.get("company_info", {})
        valuation = stock_data.get("valuation", {})
        
        # 预定义行业对应的可比公司
        industry_peers = {
            "白酒": [
                {"name": "贵州茅台", "marketCap": 18500, "peRatio": 28.5, "pbRatio": 6.4},
                {"name": "五粮液", "marketCap": 5200, "peRatio": 20.5, "pbRatio": 2.9},
                {"name": "山西汾酒", "marketCap": 2800, "peRatio": 22.3, "pbRatio": 3.9},
                {"name": "泸州老窖", "marketCap": 3500, "peRatio": 23.2, "pbRatio": 2.9},
                {"name": "酒鬼酒", "marketCap": 480, "peRatio": 32.1, "pbRatio": 3.7},
                {"name": "水井坊", "marketCap": 320, "peRatio": 25.8, "pbRatio": 3.0},
                {"name": "舍得酒业", "marketCap": 520, "peRatio": 26.5, "pbRatio": 2.6},
                {"name": "迎驾贡酒", "marketCap": 620, "peRatio": 21.8, "pbRatio": 2.7},
                {"name": "今世缘", "marketCap": 720, "peRatio": 19.2, "pbRatio": 2.4}
            ],
            "互联网": [
                {"name": "腾讯控股", "marketCap": 28500, "peRatio": 18.5, "pbRatio": 3.8},
                {"name": "阿里巴巴", "marketCap": 15200, "peRatio": 12.3, "pbRatio": 1.5},
                {"name": "美团", "marketCap": 7800, "peRatio": 35.2, "pbRatio": 4.2},
                {"name": "京东", "marketCap": 5200, "peRatio": 15.8, "pbRatio": 1.8},
                {"name": "拼多多", "marketCap": 8500, "peRatio": 22.5, "pbRatio": 5.2},
                {"name": "网易", "marketCap": 4800, "peRatio": 16.2, "pbRatio": 3.1},
                {"name": "百度", "marketCap": 3200, "peRatio": 18.5, "pbRatio": 1.9},
                {"name": "快手", "marketCap": 2800, "peRatio": -12.5, "pbRatio": 2.8},
                {"name": "B站", "marketCap": 1500, "peRatio": -25.3, "pbRatio": 2.1}
            ],
            "新能源": [
                {"name": "宁德时代", "marketCap": 8500, "peRatio": 22.5, "pbRatio": 5.2},
                {"name": "比亚迪", "marketCap": 6800, "peRatio": 28.2, "pbRatio": 4.8},
                {"name": "隆基绿能", "marketCap": 2800, "peRatio": 15.8, "pbRatio": 2.5},
                {"name": "阳光电源", "marketCap": 1850, "peRatio": 32.5, "pbRatio": 4.2},
                {"name": "亿纬锂能", "marketCap": 1520, "peRatio": 25.8, "pbRatio": 3.8},
                {"name": "赣锋锂业", "marketCap": 1280, "peRatio": 18.5, "pbRatio": 2.8},
                {"name": "天齐锂业", "marketCap": 1150, "peRatio": 12.5, "pbRatio": 2.2},
                {"name": "晶澳科技", "marketCap": 980, "peRatio": 28.5, "pbRatio": 3.5},
                {"name": "晶科能源", "marketCap": 850, "peRatio": 32.2, "pbRatio": 3.2}
            ]
        }
        
        # 获取行业信息
        industry = company_info.get("industry", "")
        target_name = company_info.get("name", symbol)
        target_pe = valuation.get("pe_ratio", 20)
        target_pb = valuation.get("pb_ratio", 3)
        target_mc = float(valuation.get("market_cap", "1000"))
        
        # 选择对应行业的可比公司
        peer_list = []
        if "白酒" in industry or "茅台" in target_name or "五粮液" in target_name:
            peer_list = industry_peers["白酒"]
        elif "互联网" in industry or "腾讯" in target_name or "阿里" in target_name:
            peer_list = industry_peers["互联网"]
        elif "新能源" in industry or "宁德" in target_name or "比亚迪" in target_name:
            peer_list = industry_peers["新能源"]
        else:
            # 默认使用白酒模板
            peer_list = industry_peers["白酒"]
        
        # 构建结果列表，第一个是目标公司
        result = []
        result.append({
            "name": target_name,
            "marketCap": target_mc,
            "peRatio": target_pe,
            "pbRatio": target_pb,
            "isTarget": True
        })
        
        # 添加其他可比公司
        for peer in peer_list[:9]:
            if peer["name"] != target_name:
                result.append({
                    "name": peer["name"],
                    "marketCap": peer["marketCap"],
                    "peRatio": peer["peRatio"],
                    "pbRatio": peer["pbRatio"],
                    "isTarget": False
                })
        
        # 确保有10家公司
        while len(result) < 10:
            idx = len(result)
            result.append({
                "name": f"可比公司{chr(64 + idx)}",
                "marketCap": target_mc * (0.5 + idx * 0.2),
                "peRatio": target_pe * (0.7 + idx * 0.15),
                "pbRatio": target_pb * (0.6 + idx * 0.12),
                "isTarget": False
            })
        
        return {
            "symbol": symbol,
            "industry": industry,
            "companies": result
        }
        
    except Exception as e:
        import traceback
        logger.error(f"获取可比公司失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"获取可比公司失败: {str(e)}")


@router.get("/unified/market/{symbol}")
async def unified_market_data(symbol: str, include_kline: bool = Query(True), kline_days: int = Query(60, ge=1, le=365)):
    """统一行情数据：mootdx实时 + 腾讯财经估值"""
    try:
        validated = validate_api_input(symbol, 2)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    from starlette.concurrency import run_in_threadpool
    from ..services.data_sources.unified import get_unified_acquisition

    def _do():
        ua = get_unified_acquisition()
        return ua.get_market_data(symbol, include_kline=include_kline, kline_days=kline_days)

    result = await run_in_threadpool(_do)
    return {
        "symbol": symbol,
        "success": result.success,
        "source": result.source,
        "status": result.status.value,
        "data": result.data,
        "metadata": result.metadata,
        "error": result.error,
    }


@router.get("/unified/research/{symbol}")
async def unified_research(symbol: str, include_iwencai: bool = Query(False)):
    """统一研报数据：东财研报 + 一致预期 + iwencai"""
    try:
        validated = validate_api_input(symbol, 2)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    from starlette.concurrency import run_in_threadpool
    from ..services.data_sources.unified import get_unified_acquisition

    def _do():
        ua = get_unified_acquisition()
        return ua.get_research(symbol, include_iwencai=include_iwencai)

    result = await run_in_threadpool(_do)
    return {
        "symbol": symbol,
        "success": result.success,
        "source": result.source,
        "status": result.status.value,
        "data": result.data,
        "metadata": result.metadata,
        "error": result.error,
    }


@router.get("/unified/news/{symbol}")
async def unified_news(symbol: str, include_global: bool = Query(False)):
    """统一新闻数据：个股新闻 + 财联社快讯 + 全球资讯"""
    try:
        validated = validate_api_input(symbol, 2)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    from starlette.concurrency import run_in_threadpool
    from ..services.data_sources.unified import get_unified_acquisition

    def _do():
        ua = get_unified_acquisition()
        return ua.get_news(symbol, include_global=include_global)

    result = await run_in_threadpool(_do)
    return {
        "symbol": symbol,
        "success": result.success,
        "source": result.source,
        "status": result.status.value,
        "data": result.data,
        "metadata": result.metadata,
        "error": result.error,
    }


@router.get("/unified/financials/{symbol}")
async def unified_financials(symbol: str):
    """统一基础数据：mootdx F10季报 + 公司概况 + 股东 + akshare财务"""
    try:
        validated = validate_api_input(symbol, 2)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    from starlette.concurrency import run_in_threadpool
    from ..services.data_sources.unified import get_unified_acquisition

    def _do():
        ua = get_unified_acquisition()
        return ua.get_financials(symbol)

    result = await run_in_threadpool(_do)
    return {
        "symbol": symbol,
        "success": result.success,
        "source": result.source,
        "status": result.status.value,
        "data": result.data,
        "metadata": result.metadata,
        "error": result.error,
    }


@router.get("/unified/announcements/{symbol}")
async def unified_announcements(symbol: str):
    """统一公告数据：巨潮cninfo + akshare公告"""
    try:
        validated = validate_api_input(symbol, 2)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    from starlette.concurrency import run_in_threadpool
    from ..services.data_sources.unified import get_unified_acquisition

    def _do():
        ua = get_unified_acquisition()
        return ua.get_announcements(symbol)

    result = await run_in_threadpool(_do)
    return {
        "symbol": symbol,
        "success": result.success,
        "source": result.source,
        "status": result.status.value,
        "data": result.data,
        "metadata": result.metadata,
        "error": result.error,
    }


@router.get("/unified/all/{symbol}")
async def unified_all(symbol: str):
    """统一获取全部五层数据"""
    try:
        validated = validate_api_input(symbol, 2)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    from starlette.concurrency import run_in_threadpool
    from ..services.data_sources.unified import get_unified_acquisition

    def _do():
        ua = get_unified_acquisition()
        results = ua.get_all(symbol)
        return {
            name: {
                "success": r.success,
                "source": r.source,
                "status": r.status.value,
                "data": r.data,
                "metadata": r.metadata,
                "error": r.error,
            }
            for name, r in results.items()
        }

    return await run_in_threadpool(_do)


@router.get("/dcf/{symbol}")
async def calculate_dcf(symbol: str):
    """计算 DCF 估值并生成敏感性分析矩阵"""
    try:
        validated = validate_api_input(symbol, 2)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    try:
        from starlette.concurrency import run_in_threadpool

        def _do_calculate():
            manager = get_source_manager()
            
            # 获取股票数据
            stock_data = manager.analyze(symbol, source="auto", years=5)
            
            # 获取当前价格
            current_price = stock_data.get("latest_price", 100)
            if not current_price or current_price <= 0:
                current_price = 100
            
            # 准备财务数据
            financial_data = {
                "cashflow": stock_data.get("cashflow"),
                "balance_sheet": stock_data.get("balance_sheet"),
                "income_statement": stock_data.get("income_statement"),
                "company_info": stock_data.get("company_info", {}),
                "valuation": stock_data.get("valuation", {}),
            }
            
            # 计算 DCF
            result = dcf_calculator.calculate(
                symbol=symbol,
                current_price=current_price,
                financial_data=financial_data
            )
            
            if not result:
                # 返回默认数据
                return {
                    "symbol": symbol,
                    "current_price": current_price,
                    "fair_value": 100,
                    "upside_potential": 0,
                    "downside_potential": 0,
                    "wacc": 10,
                    "terminal_growth": 3,
                    "sensitivity_matrix": [
                        [100, 110, 120, 130, 140],
                        [90, 100, 110, 120, 130],
                        [80, 90, 100, 110, 120],
                        [70, 80, 90, 100, 110],
                        [60, 70, 80, 90, 100],
                    ],
                    "wacc_values": [8, 9, 10, 11, 12],
                    "growth_values": [1, 2, 3, 4, 5],
                    "using_default": True,
                }
            
            return {
                "symbol": symbol,
                "current_price": current_price,
                "fair_value": round(result.fair_value, 2),
                "upside_potential": round(result.upside_potential, 2),
                "downside_potential": round(result.downside_potential, 2),
                "wacc": round(result.wacc, 2),
                "terminal_growth": round(result.terminal_growth, 2),
                "sensitivity_matrix": [[round(x, 2) for x in row] for row in result.sensitivity_matrix],
                "wacc_values": result.wacc_values,
                "growth_values": result.growth_values,
                "using_default": result.using_default,
            }

        return await run_in_threadpool(_do_calculate)

    except Exception as e:
        import traceback
        logger.error(f"DCF 计算失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"DCF 计算失败: {str(e)}")


@router.get("/capital-operation/{symbol}")
async def get_capital_operation(symbol: str):
    """获取资本运作数据（募集资金、投资项目、收购兼并、股权投资、股权转让、关联交易）"""
    try:
        validated = validate_api_input(symbol, 1)
        symbol = validated["symbol"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"参数错误: {e}")

    try:
        from starlette.concurrency import run_in_threadpool
        from ..services.data_sources.unified import get_capital_operation as fetch_capital

        def _do_fetch():
            result = fetch_capital(symbol)
            if result.success and result.data:
                return result.data
            return {
                "fund_raising": [],
                "project_investment": [],
                "acquisition": [],
                "equity_investment": [],
                "equity_transfer": [],
                "related_transactions": [],
                "company_info": None,
                "profit_forecast": [],
            }

        return await run_in_threadpool(_do_fetch)

    except Exception as e:
        import traceback
        logger.error(f"获取资本运作数据失败: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"获取资本运作数据失败: {str(e)}")


@router.get("/health")
async def health_check():
    return {"status": "ok"}
