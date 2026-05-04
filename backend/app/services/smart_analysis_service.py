"""
Smart Analysis Service - 综合智能分析服务
借鉴 QuantDinger 的 FastAnalysisService 模式：
1. 规则计算先行 (技术指标、估值对比) → 数据准备
2. 单次综合 LLM 调用 (包含所有上下文)
3. JSON mode 强约束输出
4. 价格边界验证
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from .llm_service import LLMService, get_llm_service

logger = logging.getLogger(__name__)


class SmartAnalysisService:
    """
    综合智能分析服务
    
    架构：
    1. Data Preparation Layer - 规则计算技术指标、估值对比等
    2. Prompt Engineering Layer - 构建综合 prompt
    3. LLM Call Layer - 单次调用 + JSON 解析
    4. Validation Layer - 价格边界验证、结构化输出
    """

    def __init__(self, llm_service: LLMService = None):
        self.llm = llm_service or get_llm_service()

    # ==================== 规则计算层 ====================

    def _prepare_analysis_context(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        规则计算：技术指标解读、估值对比、风险评分
        这些在 LLM 调用前完成，LLM 只做综合研判
        """
        context = {
            "technical_signals": self._analyze_technical(data),
            "valuation_signals": self._analyze_valuation(data),
            "risk_signals": self._analyze_risk(data),
            "fund_flow_signals": self._analyze_fund_flow(data),
            "news_summary": self._summarize_news(data),
            "web_data_summary": self._summarize_web_data(data),
        }
        return context

    def _analyze_technical(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """规则计算：技术面信号（不依赖 LLM）"""
        tech = data.get("technical", {})
        history = data.get("history", [])
        signals = {
            "trend": "neutral",
            "rsi_signal": "neutral",
            "macd_signal": "neutral",
            "ma_signal": "neutral",
            "volatility": "normal",
            "score": 0,
        }

        # RSI 信号
        rsi = tech.get("rsi")
        if rsi is not None:
            if rsi > 70:
                signals["rsi_signal"] = "overbought"
                signals["score"] -= 1
            elif rsi < 30:
                signals["rsi_signal"] = "oversold"
                signals["score"] += 1
            else:
                signals["rsi_signal"] = "neutral"

        # 价格趋势
        if history and len(history) > 20:
            closes = [h.get("close", 0) for h in history[-20:] if h.get("close")]
            if closes:
                ma5 = sum(closes[-5:]) / 5
                ma20 = sum(closes) / 20
                current = closes[-1]
                if current > ma5 > ma20:
                    signals["trend"] = "uptrend"
                    signals["score"] += 1
                elif current < ma5 < ma20:
                    signals["trend"] = "downtrend"
                    signals["score"] -= 1
                # MA 信号
                if ma5 > ma20:
                    signals["ma_signal"] = "bullish"
                    signals["score"] += 1
                elif ma5 < ma20:
                    signals["ma_signal"] = "bearish"
                    signals["score"] -= 1

        return signals

    def _analyze_valuation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """规则计算：估值对比"""
        val = data.get("valuation", {})
        signals = {
            "pe_vs_industry": "normal",
            "score": 0,
        }

        pe = val.get("pe_ratio")
        ind_pe = val.get("industry_pe")
        if pe and ind_pe and ind_pe > 0:
            ratio = pe / ind_pe
            if ratio > 2:
                signals["pe_vs_industry"] = "significantly_higher"
                signals["score"] -= 2
            elif ratio > 1.3:
                signals["pe_vs_industry"] = "slightly_higher"
                signals["score"] -= 1
            elif ratio < 0.7:
                signals["pe_vs_industry"] = "lower"
                signals["score"] += 1
            else:
                signals["pe_vs_industry"] = "in_line"

        return signals

    def _analyze_risk(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """规则计算：风险信号"""
        risk = data.get("risk_indicators", {})
        signals = {
            "pledge_risk": "low",
            "margin_risk": "low",
            "score": 0,
        }

        # 质押风险
        pledge = risk.get("pledge_ratio", [])
        if pledge:
            try:
                ratio = float(pledge[0].get("质押比例(%)", 0))
                if ratio > 50:
                    signals["pledge_risk"] = "high"
                    signals["score"] -= 2
                elif ratio > 30:
                    signals["pledge_risk"] = "medium"
                    signals["score"] -= 1
            except (ValueError, TypeError):
                pass

        return signals

    def _analyze_fund_flow(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """规则计算：资金流向信号"""
        fund_flow = data.get("fund_flow", [])
        signals = {
            "main_force_trend": "neutral",
            "score": 0,
        }
        if fund_flow and len(fund_flow) > 1:
            try:
                recent = fund_flow[0]
                if isinstance(recent, dict):
                    net_inflow = recent.get("主力净流入", 0) or recent.get("net_main_force", 0)
                    try:
                        if float(net_inflow) > 0:
                            signals["main_force_trend"] = "inflow"
                            signals["score"] += 1
                        elif float(net_inflow) < 0:
                            signals["main_force_trend"] = "outflow"
                            signals["score"] -= 1
                    except (ValueError, TypeError):
                        pass
            except (IndexError, TypeError):
                pass
        return signals

    def _summarize_news(self, data: Dict[str, Any]) -> str:
        """规则计算：新闻摘要（含多源新闻）"""
        news = data.get("news_analysis", [])
        if not news:
            return "暂无近期新闻"

        pos = sum(1 for n in news if n.get("sentiment") == "positive")
        neg = sum(1 for n in news if n.get("sentiment") == "negative")
        total = len(news)

        api_count = sum(1 for n in news if not n.get("source_type") or n.get("source_type") == "api")
        search_count = sum(1 for n in news if n.get("source_type") == "web_search")
        fetch_count = sum(1 for n in news if n.get("source_type") == "web_fetch")

        top_news = []
        for n in news[:8]:
            title = n.get("title", "")
            sentiment = n.get("sentiment", "neutral")
            source_type = n.get("source_type", "api")
            src = n.get("source", "")
            top_news.append(f"[{sentiment}][{source_type}][{src}] {title}")

        source_info = f"API={api_count}, 搜索={search_count}, 抓取={fetch_count}"
        return (
            f"共 {total} 条新闻 (正面 {pos}, 负面 {neg}, 中性 {total - pos - neg}) | 来源: {source_info}\n"
            + "\n".join(top_news)
        )

    def _summarize_web_data(self, data: Dict[str, Any]) -> str:
        """汇总网页搜索和抓取的关键信息"""
        web_search = data.get("web_search_results", [])
        web_fetch = data.get("web_fetch_results", [])

        if not web_search and not web_fetch:
            return ""

        parts = []
        if web_search:
            parts.append("=== 网页搜索结果 ===")
            for r in web_search[:5]:
                parts.append(f"- [{r.get('source', '')}] {r.get('title', '')}: {r.get('snippet', '')[:150]}")

        if web_fetch:
            parts.append("=== 网页抓取内容 ===")
            for a in web_fetch[:3]:
                content_preview = a.get("content", "")[:200]
                parts.append(f"- [{a.get('source', '')}] {a.get('title', '')}: {content_preview}")

        return "\n".join(parts)

    # ==================== Prompt 工程层 ====================

    def _build_smart_analysis_prompt(
        self, symbol: str, data: Dict[str, Any], context: Dict[str, Any]
    ) -> tuple:
        """构建单一综合 prompt：包含所有数据上下文 + 强约束输出格式"""

        company_info = data.get("company_info", {})
        latest_price = data.get("latest_price")
        technical = data.get("technical", {})
        valuation = data.get("valuation", {})
        financial = data.get("deep_financial", {})

        # 格式化价格
        price_str = f"¥{latest_price:.2f}" if latest_price else "N/A"
        pct_chg = technical.get("pct_chg")
        chg_str = f"{pct_chg:+.2f}%" if pct_chg is not None else "N/A"

        # 格式化基本面数据
        fi_list = financial.get("financial_indicators", [])
        fin_str = "暂无"
        if fi_list:
            latest_fi = fi_list[0]
            parts = []
            for k, label in [
                ("营业总收入(元)", "营收"),
                ("净利润(元)", "净利"),
                ("净资产收益率(%)", "ROE"),
                ("资产负债率", "负债率"),
            ]:
                v = latest_fi.get(k)
                if v is not None:
                    try:
                        if "元" in k:
                            parts.append(f"{label}={float(v)/1e8:.1f}亿")
                        else:
                            parts.append(f"{label}={v}%")
                    except (ValueError, TypeError):
                        parts.append(f"{label}={v}")
            fin_str = ", ".join(parts) if parts else "有财务数据"

        # 信号摘要
        tech_sig = context["technical_signals"]
        val_sig = context["valuation_signals"]
        risk_sig = context["risk_signals"]
        flow_sig = context["fund_flow_signals"]

        web_data_section = ""
        if context.get("web_data_summary"):
            web_data_section = f"\n🌐 网页搜索与抓取数据（多源聚合）：\n{context['web_data_summary']}\n"

        system_prompt = f"""你是资深股票分析师，专注于深度分析。你保守、客观，所有判断基于数据。

分析标的：{symbol}
最新价：{price_str}（{chg_str}）
公司：{company_info.get('股票简称', '')} | 行业：{company_info.get('行业', '')} | 主营：{company_info.get('主营业务', '')}

📊 规则计算信号（LLM调用前已完成）：
技术面：趋势={tech_sig['trend']}, RSI={tech_sig['rsi_signal']}, MA={tech_sig['ma_signal']}, 综合评分={tech_sig['score']}
估值面：PE vs 行业={val_sig['pe_vs_industry']}, 评分={val_sig['score']}
风险面：质押={risk_sig['pledge_risk']}, 评分={risk_sig['score']}
资金面：主力={flow_sig['main_force_trend']}, 评分={flow_sig['score']}

📈 技术指标：
RSI(14)={technical.get('rsi', 'N/A')} | PE={valuation.get('pe_ratio', 'N/A')} | PB={valuation.get('pb_ratio', 'N/A')}
市值={valuation.get('market_cap', 'N/A')} | 行业PE={valuation.get('industry_pe', 'N/A')}

💰 财务概览：{fin_str}

📰 新闻舆情（多源聚合）：
{context['news_summary']}
{web_data_section}
⚠️ 分析要求：
1. 综合所有信号和数据给出判断（不要只看单一指标）
2. 充分利用网页搜索和抓取获取的最新信息，补充实时市场动态
3. 如果技术面+资金面+估值面同时看多 OR 同时看空，给出明确方向
4. 信号矛盾时（如技术面看多但估值过高），以"中性偏多/偏空"表述
5. 用简体中文回复，所有字段用中文
6. stop_loss 必须低于当前价，take_profit 必须高于当前价
7. score 范围 1-10：1-3(卖出), 4-5(偏空), 6(中性), 7-8(偏多), 9-10(买入)
8. market_outlook 需结合网页搜索的最新市场观点和机构评级
9. risk_factors 需包含监管、竞争、宏观等多维度风险

必须返回纯 JSON（不要 markdown 代码块），schema：
{{
  "score": 整数1-10,
  "suggestion": "买入/增持/持有/减持/卖出",
  "summary": "一句话总结20字内",
  "key_points": ["要点1", "要点2", "要点3", "要点4", "要点5"],
  "fundamental_analysis": "基本面分析150字内，含业绩增长、盈利质量、业务亮点",
  "technical_analysis": "技术面分析150字内，含趋势、支撑阻力、量价关系",
  "valuation_analysis": "估值分析100字内，含PE/PB水平、行业对比、估值空间",
  "risk_warning": "风险提示100字内，含监管、竞争、宏观等风险",
  "capital_analysis": "资金面分析80字内",
  "market_outlook": "市场前景展望100字内，结合网页搜索的最新机构观点和市场动态",
  "risk_factors": ["风险1", "风险2", "风险3"],
  "investment_strategy": "投资策略建议100字内，含入场点、止损止盈、仓位建议",
  "target_price": "目标价(数字或null)",
  "stop_loss": "止损价(数字或null)",
  "position_advice": "仓位建议30字内"
}}"""

        user_prompt = f"""请对 {symbol} ({company_info.get('股票简称', '')}) 进行综合研判分析。
当前价格 {price_str}，请基于以上所有数据给出判断。"""

        return system_prompt, user_prompt

    # ==================== 综合调用入口 ====================

    def analyze(
        self, symbol: str, stock_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        综合智能分析入口
        1. 规则计算 → 2. 构建 prompt → 3. LLM 调用 → 4. 输出结构化
        LLM调用有超时保护，失败则降级到规则计算
        """
        context = self._prepare_analysis_context(stock_data)

        if not self.llm.is_available():
            logger.info("[SmartAnalysis] LLM不可用，使用规则计算结果")
            return self._fallback_rule_based(symbol, stock_data)

        try:
            system_prompt, user_prompt = self._build_smart_analysis_prompt(symbol, stock_data, context)

            llm_result = self.llm.call_llm_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=2048,
            )

            if llm_result:
                logger.info("[SmartAnalysis] LLM分析成功 ✅")
                return self._format_llm_result(symbol, stock_data, llm_result, context)
            else:
                logger.warning("[SmartAnalysis] LLM返回空结果，降级到规则计算")
                return self._fallback_rule_based(symbol, stock_data)

        except Exception as e:
            logger.warning(f"[SmartAnalysis] LLM调用失败: {e}，降级到规则计算")
            return self._fallback_rule_based(symbol, stock_data)

    def _format_llm_result(
        self, symbol: str, stock_data: Dict[str, Any], llm_result: Dict, context: Dict
    ) -> Dict[str, Any]:
        """格式化LLM返回结果为统一结构"""
        ci = stock_data.get("company_info", {})
        tech = stock_data.get("technical", {})
        val = stock_data.get("valuation", {})
        price = stock_data.get("latest_price", {})

        current_price = None
        if isinstance(price, dict):
            current_price = price.get("current")
        elif isinstance(price, (int, float)):
            current_price = price

        result = {
            "available": True,
            "data_source": "llm",
            "score": llm_result.get("score", 5),
            "suggestion": llm_result.get("suggestion", "持有"),
            "summary": llm_result.get("summary", f"{ci.get('股票简称', symbol)} - AI综合分析"),
            "key_points": llm_result.get("key_points", [
                f"技术面: {context['technical_signals']['trend']}",
                f"估值: {context['valuation_signals']['pe_vs_industry']}",
                f"质押风险: {context['risk_signals']['pledge_risk']}",
                f"资金面: {context['fund_flow_signals']['main_force_trend']}",
            ]),
            "fundamental_analysis": llm_result.get("fundamental_analysis", "基于财务数据的基本面分析"),
            "technical_analysis": llm_result.get("technical_analysis", f"RSI={tech.get('rsi', 'N/A')}, 趋势={context['technical_signals']['trend']}"),
            "valuation_analysis": llm_result.get("valuation_analysis", f"PE={val.get('pe_ratio', 'N/A')}, PB={val.get('pb_ratio', 'N/A')}"),
            "risk_warning": llm_result.get("risk_warning", "风险在可控范围"),
            "capital_analysis": llm_result.get("capital_analysis", ""),
            "market_outlook": llm_result.get("market_outlook", ""),
            "risk_factors": llm_result.get("risk_factors", []),
            "investment_strategy": llm_result.get("investment_strategy", ""),
            "target_price": llm_result.get("target_price"),
            "stop_loss": llm_result.get("stop_loss"),
            "position_advice": llm_result.get("position_advice", ""),
            "generated_at": datetime.now().isoformat(),
            "symbol": symbol,
        }

        if current_price:
            self._validate_price_bounds(result, current_price)

        return result

    def _validate_price_bounds(self, result: Dict[str, Any], current_price: float):
        """价格边界验证：防止 LLM 产生不合理的目标价/止损价"""
        for field in ["target_price", "stop_loss"]:
            val = result.get(field)
            if val is not None:
                try:
                    fval = float(val)
                    # 不允许偏离当前价超过 ±30%
                    if fval > current_price * 1.3 or fval < current_price * 0.7:
                        result[field] = None
                except (ValueError, TypeError):
                    result[field] = None

        # stop_loss 必须低于 current_price
        sl = result.get("stop_loss")
        tp = result.get("target_price")
        if sl is not None and current_price and float(sl) >= current_price:
            result["stop_loss"] = round(current_price * 0.95, 2)
        if tp is not None and current_price and float(tp) <= current_price:
            result["target_price"] = round(current_price * 1.05, 2)

    def _fallback_rule_based(
        self, symbol: str, stock_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """LLM 不可用时的纯规则降级方案"""
        context = self._prepare_analysis_context(stock_data)
        tech = stock_data.get("technical", {})
        val = stock_data.get("valuation", {})
        ci = stock_data.get("company_info", {})

        total_score = (
            context["technical_signals"]["score"]
            + context["valuation_signals"]["score"]
            + context["risk_signals"]["score"]
            + context["fund_flow_signals"]["score"]
        )
        total_score = max(1, min(10, total_score + 5))  # 映射到 1-10

        if total_score >= 8:
            suggestion = "买入"
        elif total_score >= 6:
            suggestion = "增持"
        elif total_score == 5:
            suggestion = "持有"
        elif total_score >= 3:
            suggestion = "减持"
        else:
            suggestion = "卖出"

        return {
            "available": True,
            "data_source": "rule_based",
            "score": total_score,
            "suggestion": suggestion,
            "summary": f"{ci.get('股票简称', symbol)} - 规则综合评分{total_score}分",
            "key_points": [
                f"技术面: {context['technical_signals']['trend']} (RSI={context['technical_signals']['rsi_signal']})",
                f"估值: {context['valuation_signals']['pe_vs_industry']}",
                f"质押风险: {context['risk_signals']['pledge_risk']}",
                f"资金面: {context['fund_flow_signals']['main_force_trend']}",
                "建议结合多源新闻和机构观点综合判断",
            ],
            "fundamental_analysis": "基于财务数据的基本面分析，需结合最新财报数据",
            "technical_analysis": f"RSI={tech.get('rsi', 'N/A')}, 趋势={context['technical_signals']['trend']}",
            "valuation_analysis": f"PE={val.get('pe_ratio', 'N/A')}, PB={val.get('pb_ratio', 'N/A')}",
            "risk_warning": "质押比例需关注" if context["risk_signals"]["pledge_risk"] == "high" else "风险在可控范围",
            "capital_analysis": f"主力资金{'净流入' if context['fund_flow_signals']['main_force_trend'] == 'inflow' else '净流出' if context['fund_flow_signals']['main_force_trend'] == 'outflow' else '平衡'}",
            "market_outlook": "需结合网页搜索获取最新市场观点",
            "risk_factors": [
                "监管政策变化风险",
                "行业竞争加剧风险",
                "宏观经济下行风险",
            ],
            "investment_strategy": "建议观望为主，等待更明确信号",
            "target_price": None,
            "stop_loss": None,
            "position_advice": "建议观望",
            "generated_at": datetime.now().isoformat(),
            "symbol": symbol,
        }


# 全局单例
_smart_service: Optional[SmartAnalysisService] = None


def get_smart_analysis_service() -> SmartAnalysisService:
    global _smart_service
    if _smart_service is None:
        _smart_service = SmartAnalysisService()
    return _smart_service
