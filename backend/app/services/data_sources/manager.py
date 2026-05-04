import logging
import math
from typing import Dict, Any, Optional, Callable
from datetime import datetime
import concurrent.futures

import pandas as pd

from .base import DataSource
from .sina_source import SinaDataSource
from .eastmoney_source import EastMoneyDataSource, _EM_TIMEOUT
from .ai_source import QwenDataSource, DeepSeekDataSource, _BaseAIDataSource

logger = logging.getLogger(__name__)

_SOURCE_KEYS = ["sina", "eastmoney", "qwen", "deepseek"]


class DataSourceManager:
    """数据源路由管理器"""

    def __init__(self):
        self._sources: Dict[str, DataSource] = {
            "sina": SinaDataSource(),
            "eastmoney": EastMoneyDataSource(),
            "qwen": QwenDataSource(),
            "deepseek": DeepSeekDataSource(),
        }

    def list_sources(self) -> Dict[str, bool]:
        return {k: v.is_available() for k, v in self._sources.items()}

    def get_source(self, name: str) -> Optional[DataSource]:
        return self._sources.get(name)

    # ---- 路由入口 ----

    def analyze(self, symbol: str, source: str = "auto", years: int = 2) -> Dict[str, Any]:
        """
        全部分析入口
        source 取值:
          - "auto"      自动: 先试 sina → eastmoney → ai(qwen → deepseek)
          - "sina"      仅新浪
          - "eastmoney" 仅东财
          - "qwen"      仅千问 AI
          - "deepseek"  仅 DeepSeek AI
        """
        if source == "auto":
            return self._analyze_auto(symbol, years)
        ds = self._sources.get(source)
        if not ds:
            return self._build_empty(symbol, f"未知数据源: {source}")
        return self._analyze_with(symbol, ds, years)

    # ---- Auto 模式：多源复合（取各源最强项） ----

    def _analyze_auto(self, symbol: str, years: int) -> Dict[str, Any]:
        sina = self._sources["sina"]
        em = self._sources["eastmoney"]

        result = None

        # Step 1: 用新浪获取基础行情
        daily = sina.get_daily(symbol, years)
        if daily is not None:
            logger.info(f"[Auto] 行情来自新浪")
            result = self._analyze_with(symbol, sina, years)
            # Step 2: 用东财补全新浪没有的高级数据
            result = self._fill_advanced_data(result, symbol, em)
            # Step 3: 用自有数据重算PE/PB/市值（覆盖AI可能不准确的值）
            result = self._recalc_valuation(result, symbol)
            # Step 4: 补充融资融券历史数据（已由EM并行批处理填充）
            result = self._clean_nan(result)

        # Step 2: 新浪失败，尝试东财全量
        if result is None:
            daily = em.get_daily(symbol, years)
            if daily is not None:
                logger.info(f"[Auto] 行情来自东财")
                result = self._analyze_with(symbol, em, years)

        # Step 3: 全部实时数据源失败，走 AI
        if result is None:
            logger.warning(f"[Auto] 实时数据源均不可用，尝试 AI")
            for ai_name in ["qwen", "deepseek"]:
                ai_ds = self._sources[ai_name]
                if ai_ds.is_available():
                    result = self._analyze_with(symbol, ai_ds, years)
                    if result.get("data_source") != "unavailable":
                        break
            else:
                return self._build_empty(symbol, "所有数据源均不可用")

        # Step 5: 多源新闻聚合（网页搜索 + 网页抓取）
        try:
            from ..news_aggregator import get_news_aggregator
            aggregator = get_news_aggregator()
            existing_news = result.get("news_analysis", [])
            enriched = aggregator.aggregate(symbol, existing_news)
            result["news_analysis"] = enriched["news_analysis"]
            result["web_search_results"] = enriched["web_search_results"]
            result["web_fetch_results"] = enriched["web_fetch_results"]
            result["sources_summary"] = enriched["sources_summary"]
            logger.info(f"[Auto] Step 5: 多源新闻聚合完成, 共 {len(result['news_analysis'])} 条")
        except Exception as e:
            logger.warning(f"[Auto] 多源新闻聚合失败(不影响主流程): {e}")

        return result

    def _enrich_news(self, result: Dict[str, Any], symbol: str) -> Dict[str, Any]:
        """用网页搜索+抓取丰富新闻数据"""
        try:
            from ..news_aggregator import get_news_aggregator
            aggregator = get_news_aggregator()
            existing_news = result.get("news_analysis", [])
            enriched = aggregator.aggregate(symbol, existing_news)
            result["news_analysis"] = enriched["news_analysis"]
            result["web_search_results"] = enriched["web_search_results"]
            result["web_fetch_results"] = enriched["web_fetch_results"]
            result["sources_summary"] = enriched["sources_summary"]
            logger.info(f"[Auto] Step 5: 多源新闻聚合完成, 共 {len(result['news_analysis'])} 条")
        except Exception as e:
            logger.warning(f"[Auto] 多源新闻聚合失败(不影响主流程): {e}")
        return result

    def _fill_advanced_data(self, result: Dict[str, Any], symbol: str, em: DataSource) -> Dict[str, Any]:
        """东财+AI并发补全（EM和AI同时跑）"""
        logger.info(f"[Auto] 并发补全高级数据")

        # 并行执行: EM任务 + AI综合调用
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            em_futures = {}
            ai_future = None

            # 提交所有EM任务
            ci = result.get("company_info") or {}
            if not ci.get("总市值"):
                em_futures[pool.submit(lambda s=symbol: em.get_company_info(s))] = "company_info"
            ri = result.get("risk_indicators", {})
            for key, fn in [("pledge_ratio", em.get_pledge_ratio), ("cyq", lambda s=symbol: em.get_cyq(s)),
                            ("insider_holdings", em.get_insider_holdings), ("margin_balance", em.get_margin_balance)]:
                if not ri.get(key):
                    em_futures[pool.submit(lambda s=symbol, f=fn: f(s))] = key
            if not result.get("fund_flow"):
                em_futures[pool.submit(lambda s=symbol: em.get_fund_flow(s))] = "fund_flow"
            if not result.get("news_analysis"):
                em_futures[pool.submit(lambda s=symbol: em.get_news(s))] = "news"
            if not result.get("analyst_consensus") or not result["analyst_consensus"].get("latest_rating"):
                em_futures[pool.submit(lambda s=symbol: em.get_analyst_rating(s))] = "analyst"

            # 融资融券历史数据（并发拉取）
            mh_future = pool.submit(em.get_margin_history, symbol)

            # AI数据源暂时禁用（LLM调用导致进程崩溃）
            ai = None
            ai_future = None
            # ai = self._get_ai_source()
            # if ai:
            #     ai_future = pool.submit(ai.fetch_comprehensive_data, symbol)

            # 处理EM结果
            for future in concurrent.futures.as_completed(em_futures, timeout=_EM_TIMEOUT + 5):
                key = em_futures[future]
                try:
                    data = future.result(timeout=3)
                    self._apply_fill(result, symbol, key, data)
                except Exception:
                    pass

            # 处理融资融券历史结果
            try:
                mh_data = mh_future.result(timeout=15)
                if mh_data:
                    ri = result.get("risk_indicators") or {"pledge_ratio": [], "cyq": [], "insider_holdings": [], "margin_balance": []}
                    ri["margin_history"] = mh_data
                    result["risk_indicators"] = ri
                    logger.info(f"  [补全] margin_history {len(mh_data)} 条")
            except Exception:
                pass

            # 处理AI结果（EM跑完后AI可能还在跑，再等最多20s）
            if ai_future:
                try:
                    ai_data = ai_future.result(timeout=20)
                    if ai_data:
                        self._apply_ai_fill(result, symbol, "ai_comprehensive", ai_data)
                        logger.info(f"  [AI降级] 成功 ✅")
                except concurrent.futures.TimeoutError:
                    logger.warning(f"  [AI降级] 综合调用超时")
                except Exception as e:
                    logger.warning(f"  [AI降级] 失败: {e}")

        return result

    def _fill_from_ai(self, result: Dict[str, Any], symbol: str) -> Dict[str, Any]:
        """东财超时/失败后，用AI知识库降级补全（一次综合调用获取全量数据）"""
        ai = self._get_ai_source()
        if not ai:
            return result

        # 检查是否有需要AI补全的字段
        ci = result.get("company_info") or {}
        ri = result.get("risk_indicators", {})
        needs_valuation = not ci.get("总市值") and not ci.get("市盈率-动态")
        needs_pledge = not ri.get("pledge_ratio")
        needs_margin = not ri.get("margin_balance")
        needs_analyst = not result.get("analyst_consensus") or not result["analyst_consensus"].get("latest_rating")
        needs_news = not result.get("news_analysis")

        if not any([needs_valuation, needs_pledge, needs_margin, needs_analyst, needs_news]):
            return result

        logger.info(f"[AI降级] 一次综合调用获取全量数据")
        data = None
        pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        try:
            future = pool.submit(ai.fetch_comprehensive_data, symbol)
            try:
                data = future.result(timeout=25)
            except concurrent.futures.TimeoutError:
                logger.warning(f"  [AI降级] 综合调用超时(25s)")
            except Exception as e:
                logger.warning(f"  [AI降级] 综合调用失败: {e}")
        finally:
            pool.shutdown(wait=False)
        if data:
            self._apply_ai_fill(result, symbol, "ai_comprehensive", data)

        return result

    def _get_ai_source(self) -> Optional[_BaseAIDataSource]:
        for name in ("qwen", "deepseek"):
            ds = self._sources.get(name)
            if isinstance(ds, _BaseAIDataSource) and ds.is_available():
                return ds
        return None

    def _apply_fill(self, result: Dict[str, Any], symbol: str, key: str, data: Any):
        if data is None:
            return
        if key == "company_info" and isinstance(data, dict):
            ci = result.get("company_info") or {}
            merge_keys = ('总市值', '流通市值', '市盈率-动态', '市净率')
            result["company_info"] = {**ci, **{k: v for k, v in data.items() if k in merge_keys and v is not None}}
            val = result.get("valuation", {})
            val['market_cap'] = data.get('总市值', val.get('market_cap'))
            val['circulating_market_cap'] = data.get('流通市值', val.get('circulating_market_cap'))
            val['pe_ratio'] = data.get('市盈率-动态', val.get('pe_ratio'))
            val['pb_ratio'] = data.get('市净率', val.get('pb_ratio'))
            logger.info(f"  [补全] 市值/PE/PB")
        elif key in ("pledge_ratio", "cyq", "insider_holdings", "margin_balance"):
            if isinstance(data, pd.DataFrame) and not data.empty:
                result["risk_indicators"][key] = data.to_dict(orient='records')
                logger.info(f"  [补全] risk_indicators.{key}")
        elif key == "fund_flow":
            if isinstance(data, pd.DataFrame) and not data.empty:
                result["fund_flow"] = data.head(10).to_dict(orient='records')
                logger.info(f"  [补全] fund_flow")
        elif key == "news":
            if isinstance(data, pd.DataFrame) and not data.empty:
                from ..news_analyzer import classify_news
                result["news_analysis"] = classify_news(data)
                logger.info(f"  [补全] news_analysis")
        elif key == "analyst":
            if isinstance(data, dict) and data.get("latest_rating"):
                result["analyst_consensus"] = data
                logger.info(f"  [补全] analyst_consensus")

    def _apply_ai_fill(self, result: Dict[str, Any], symbol: str, key: str, data: Any):
        if data is None or not isinstance(data, dict):
            return

        if key != "ai_comprehensive":
            return

        logger.info(f"  [AI降级] 处理综合数据")

        # 1. 公司信息 + 估值
        ci_data = data.get("company_info") or data
        ci = result.get("company_info") or {}
        for k in ('股票简称', '总市值', '流通市值', '市盈率-动态', '市净率', '最新价', '行业', '主营业务'):
            if k in ci_data and ci_data[k] is not None:
                ci[k] = ci_data[k]
        if ci:
            result["company_info"] = ci
            val = result.get("valuation", {})
            raw_mcap = ci_data.get('总市值', val.get('market_cap'))
            val['market_cap'] = DataSourceManager._fmt_market_cap(raw_mcap)
            val['pe_ratio'] = ci_data.get('市盈率-动态', val.get('pe_ratio'))
            val['pb_ratio'] = ci_data.get('市净率', val.get('pb_ratio'))
            # 行业平均PE & 参考市值
            ind_pe = ci_data.get('行业平均市盈率')
            if ind_pe is not None:
                val['industry_pe'] = ind_pe
            logger.info(f"  [AI降级] 公司信息+估值 ✅")

        # 2. 财务摘要（仅当Sina未提供财务数据时填充）
        fin = data.get("financial_summary")
        current_fi = result.get("deep_financial", {}).get("financial_indicators", [])
        sina_has_data = any(r.get('数据来源') != 'AI' for r in current_fi) if current_fi else False
        if fin and not sina_has_data:
            fin_row = {"日期": datetime.now().strftime("%Y-%m-%d")}
            if fin.get("roe(%)") is not None:
                fin_row["净资产收益率(%)"] = fin["roe(%)"]
            if fin.get("营业收入(亿元)") is not None:
                fin_row["营业总收入(元)"] = fin["营业收入(亿元)"] * 1e8
            if fin.get("净利润(亿元)") is not None:
                fin_row["净利润(元)"] = fin["净利润(亿元)"] * 1e8
            if fin.get("资产负债率(%)") is not None:
                fin_row["资产负债率"] = fin["资产负债率(%)"]
            if fin.get("每股收益(元)") is not None:
                fin_row["每股收益"] = fin["每股收益(元)"]
            if fin_row:
                fin_row["数据来源"] = "AI"
                ref_mcap = fin.get("参考市值(行业PE×净利润)")
                if ref_mcap is not None:
                    val = result.get("valuation") or {}
                    val["reference_market_cap"] = str(ref_mcap)
                    result["valuation"] = val
                deep = result.get("deep_financial") or {}
                deep["financial_indicators"] = [fin_row]
                result["deep_financial"] = deep
                logger.info(f"  [AI降级] 财务摘要 ✅(Sina无数据)")

        # 3. 风险指标
        ri_data = data.get("risk_indicators") or {}
        ri = result.get("risk_indicators") or {"pledge_ratio": [], "cyq": [], "insider_holdings": [], "margin_balance": []}
        if ri_data.get("pledge") and not ri.get("pledge_ratio"):
            ri["pledge_ratio"] = ri_data["pledge"]
            logger.info(f"  [AI降级] 质押 {len(ri_data['pledge'])} 条")
        if ri_data.get("margin") and not ri.get("margin_balance"):
            ri["margin_balance"] = ri_data["margin"]
            logger.info(f"  [AI降级] 两融 {len(ri_data['margin'])} 条")
        if ri_data.get("insider") and not ri.get("insider_holdings"):
            ri["insider_holdings"] = ri_data["insider"]
            logger.info(f"  [AI降级] 高管持股 {len(ri_data['insider'])} 条")
        result["risk_indicators"] = ri

        # 4. 分析师评级
        ar = data.get("analyst")
        if ar and not result.get("analyst_consensus"):
            result["analyst_consensus"] = ar
            logger.info(f"  [AI降级] 评级: {ar.get('latest_rating','-')}")

        # 5. 新闻
        news = data.get("news")
        if news and not result.get("news_analysis"):
            result["news_analysis"] = news
            logger.info(f"  [AI降级] 新闻 {len(news)} 条")

        # 6. 资金流向分析（并购角度：大宗交易/股东增减持/控制权资金异动）
        ffa = data.get("fund_flow_analysis")
        if ffa and not result.get("fund_flow"):
            result["fund_flow"] = [{
                "数据来源": "AI",
                "大宗交易": ffa.get("block_trade", ""),
                "股东增减持": ffa.get("major_shareholder", ""),
                "交易异动": ffa.get("control_flow", ""),
            }]
            logger.info(f"  [AI降级] 控制权资金流向分析 ✅")

        # 7. 控制权转让风险分析 → smart_analysis.manual_risk_analysis
        ra = data.get("risk_analysis")
        if ra:
            smart = result.get("smart_analysis") or {}
            smart["available"] = True
            smart["data_source"] = "ai_comprehensive"
            smart["manual_risk_analysis"] = {
                "overall_risk_level": ra.get("overall_risk_level", "中"),
                "risk_score": ra.get("risk_score", 5),
                "key_risk_factors": ra.get("key_risk_factors", ["待分析"]),
                "technical_risk_view": ra.get("technical_risk_view", "分析中"),
                "fundamental_risk_view": ra.get("fundamental_risk_view", "分析中"),
                "market_sentiment_view": ra.get("market_sentiment_view", "分析中"),
                "investment_strategy": ra.get("investment_strategy", "分析中"),
                "additional_notes": ra.get("additional_notes", "分析中"),
            }
            result["smart_analysis"] = smart
            logger.info(f"  [AI降级] 控制权转让风险分析 ✅")



    @staticmethod
    def _default_smart_analysis(company_info: Dict, technical: Dict, valuation: Dict = None) -> Dict[str, Any]:
        name = company_info.get('股票简称', '该股票')
        ind = company_info.get('行业', '')
        biz = company_info.get('主营业务', '')
        price = company_info.get('最新价', 'N/A')
        pct = technical.get('pct_chg', None)
        trend = "上涨" if pct is not None and pct >= 0 else "下跌" if pct is not None and pct < 0 else "震荡"
        val = valuation or {}
        pe = val.get('pe_ratio')
        ind_pe = val.get('industry_pe')
        pb = val.get('pb_ratio')
        mcap = val.get('market_cap', '')

        # 基本面
        fa_parts = []
        if ind:
            fa_parts.append(f"所属{ind}行业")
        if biz:
            fa_parts.append(f"主营业务为{biz}")
        if pe:
            fa_parts.append(f"当前PE约{pe}倍")
        if mcap:
            fa_parts.append(f"总市值{mcap}")
        fa_text = f"{name}。" + "，".join(fa_parts) + "。" if fa_parts else f"{name}。"
        fa_text += "建议关注行业政策变化、公司季度财报及市场占有率变动。"

        # 二级走势
        ta_parts = [f"当前股价{price}元，近期趋势{trend}"]
        rsi = technical.get('rsi')
        if rsi is not None:
            rsi_status = "超买区" if rsi > 70 else "超卖区" if rsi < 30 else "中性区间"
            ta_parts.append(f"RSI({rsi:.0f})处于{rsi_status}")
        ta_text = "。".join(ta_parts) + "。关注MA5、MA20均线支撑位及成交量变化。"

        # 估值
        va_parts = []
        if pe:
            va_parts.append(f"当前PE{pe}倍")
        if ind_pe:
            diff = ((pe or 0) - ind_pe) / ind_pe * 100
            level = "高于" if diff > 10 else "低于" if diff < -10 else "接近"
            va_parts.append(f"{level}行业平均({ind_pe}倍)")
        if pb:
            va_parts.append(f"PB{pb}倍")
        va_text = "，".join(va_parts) + "。" if va_parts else "结合当前市场估值水平进行判断。"

        # 风险（基于数据的动态风险提示）
        rw_tags = []
        if pe and ind_pe:
            ratio = pe / ind_pe
            if ratio > 2:
                rw_tags.append(f"🔴 估值风险：PE{pe}倍为行业{ind_pe}倍的{ratio:.0f}倍，估值显著偏高")
            elif ratio > 1.3:
                rw_tags.append(f"🟠 估值风险：PE{pe}倍高于行业{ind_pe}倍约{((ratio-1)*100):.0f}%")
            elif ratio < 0.7:
                rw_tags.append(f"🟢 估值偏低：PE{pe}倍低于行业{ind_pe}倍，可能存在低估")
            else:
                rw_tags.append(f"估值处行业中等水平(PE{pe}倍 vs 行业{ind_pe}倍)")
        else:
            rw_tags.append("估值水平待评估")
        rw_tags.append(f"控制权转让不确定性：需关注实际控制人意向、协议转让进展及监管审批")
        rw_text = "；".join(rw_tags) + "。"

        summary = f"{name} - {ind}" if ind else f"{name} - 上市公司概况"

        return {
            "available": True, "data_source": "default",
            "generated_at": datetime.now().isoformat(),
            "fundamental_analysis": fa_text,
            "technical_analysis": ta_text,
            "valuation_analysis": va_text,
            "risk_warning": rw_text,
            "capital_analysis": f"基于资金流向数据分析主力资金动向，关注大单净流入/流出情况判断资金态度。",
            "investment_advice": {"score": 5, "suggestion": "建议观望", "target_price": None, "stop_loss": None, "position_advice": None},
            "summary": summary,
        }

    # ---- 用指定数据源构建完整结果 ----

    def _analyze_with(self, symbol: str, ds: DataSource, years: int) -> Dict[str, Any]:
        source_tag = ds.name
        is_ai = source_tag in ("qwen", "deepseek")

        # AI 数据源走知识库分析路径
        if is_ai:
            return self._build_from_ai(symbol, ds)

        # 实时数据源
        daily = ds.get_daily(symbol, years)
        if daily is None:
            return self._build_empty(symbol, f"{source_tag} 行情数据不可用")

        company_info = ds.get_company_info(symbol) or {}
        fin = ds.get_financial_indicators(symbol)
        financial = fin if isinstance(fin, pd.DataFrame) and not fin.empty else pd.DataFrame()
        bal = ds.get_balance_sheet(symbol)
        balance = bal if isinstance(bal, pd.DataFrame) and not bal.empty else pd.DataFrame()
        cf = ds.get_cashflow(symbol)
        cashflow = cf if isinstance(cf, pd.DataFrame) and not cf.empty else pd.DataFrame()
        is_ = ds.get_income_statement(symbol)
        income_statement = is_ if isinstance(is_, pd.DataFrame) and not is_.empty else pd.DataFrame()
        insider = ds.get_insider_holdings(symbol)
        insider_df = insider if isinstance(insider, pd.DataFrame) and not insider.empty else pd.DataFrame()
        margin = ds.get_margin_balance(symbol)
        margin_df = margin if isinstance(margin, pd.DataFrame) and not margin.empty else pd.DataFrame()
        pledge = ds.get_pledge_ratio(symbol)
        pledge_df = pledge if isinstance(pledge, pd.DataFrame) and not pledge.empty else pd.DataFrame()
        cyq = ds.get_cyq(symbol)
        cyq_df = cyq if isinstance(cyq, pd.DataFrame) and not cyq.empty else pd.DataFrame()
        ff = ds.get_fund_flow(symbol)
        fund_flow_df = ff if isinstance(ff, pd.DataFrame) and not ff.empty else pd.DataFrame()
        news = ds.get_news(symbol)
        news_df = news if isinstance(news, pd.DataFrame) and not news.empty else pd.DataFrame()
        analyst = ds.get_analyst_rating(symbol) or {}

        from ..indicators import add_technical_indicators, extract_indicators

        df_tech = add_technical_indicators(daily)
        latest = df_tech.iloc[-1] if df_tech is not None and not df_tech.empty else None
        technical = extract_indicators(latest) if latest is not None else {}

        from ..news_analyzer import classify_news
        news_classified = classify_news(news_df) if not news_df.empty else []

        valuation = self._build_valuation(company_info, financial)

        result = {
            "symbol": symbol,
            "company_info": company_info,
            "latest_price": float(latest['close']) if latest is not None else None,
            "technical": technical,
            "valuation": valuation,
            "deep_financial": {
                "financial_indicators": financial.tail(5).to_dict(orient='records') if not financial.empty else [],
                "balance_sheet": balance.head(3).to_dict(orient='records') if not balance.empty else [],
                "cashflow": cashflow.head(3).to_dict(orient='records') if not cashflow.empty else [],
                "income_statement": income_statement.head(3).to_dict(orient='records') if not income_statement.empty else [],
            },
            "news_analysis": news_classified,
            "analyst_consensus": analyst if isinstance(analyst, dict) else {},
            "risk_indicators": {
                "pledge_ratio": pledge_df.to_dict(orient='records') if not pledge_df.empty else [],
                "cyq": cyq_df.tail(10).to_dict(orient='records') if not cyq_df.empty else [],
                "insider_holdings": insider_df.to_dict(orient='records') if not insider_df.empty else [],
                "margin_balance": margin_df.tail(10).to_dict(orient='records') if not margin_df.empty else [],
            },
            "fund_flow": fund_flow_df.head(10).to_dict(orient='records') if not fund_flow_df.empty else [],
            "history": df_tech.tail(120).to_dict(orient='records') if df_tech is not None else [],
            "data_source": source_tag,
            "smart_analysis": self._default_smart_analysis(company_info, technical, valuation),
        }

        result = self._clean_nan(result)
        return result

    def _recalc_valuation(self, result: Dict[str, Any], symbol: str) -> Dict[str, Any]:
        """用自有数据重算PE/PB/市值，覆盖AI可能不准确的值"""
        sina = self._sources.get("sina")
        if not isinstance(sina, SinaDataSource):
            return result
        price = result.get("latest_price")
        fin_data = result.get("deep_financial", {}).get("financial_indicators", [])
        if not price or not fin_data:
            return result

        # 找年报EPS（日期含12-31）
        annual_eps = None
        for row in fin_data:
            if '日期' in row and '12-31' in str(row['日期']):
                for k in ('每股收益', '摊薄每股收益(元)'):
                    if k in row and row[k] and isinstance(row[k], (int, float)) and row[k] > 0:
                        annual_eps = row[k]
                        break

        # 计算市值
        shares = sina.get_shares_outstanding(symbol)
        val = result.get("valuation") or {}
        if shares and price > 0:
            mcap = price * shares
            val["market_cap"] = DataSourceManager._fmt_market_cap(mcap)
            val["circulating_market_cap"] = DataSourceManager._fmt_market_cap(mcap)
        # 计算PE
        if price and annual_eps:
            val["pe_ratio"] = round(price / annual_eps, 2)
        # 末行每股净资产算PB
        if price:
            last = fin_data[-1]
            for k in ('每股净资产', '每股净资产_调整前(元)'):
                if k in last and last[k] and isinstance(last[k], (int, float)) and last[k] > 0:
                    val["pb_ratio"] = round(price / last[k], 2)
                    break
        result["valuation"] = val
        logger.info(f"[重算] PE={val.get('pe_ratio')} PB={val.get('pb_ratio')} MC={val.get('market_cap')}")
        return result

    # ---- AI-only 构建 ----

    def _build_from_ai(self, symbol: str, ds: DataSource) -> Dict[str, Any]:
        qwen_analysis = ds.generate_analysis_from_knowledge(symbol)
        if not qwen_analysis:
            return self._build_empty(symbol, f"{ds.name} AI分析不可用")

        qwen_data = self._populate_from_ai(symbol, qwen_analysis)
        return {
            "symbol": symbol,
            "company_info": qwen_data["company_info"],
            "latest_price": None,
            "technical": qwen_data["technical"],
            "valuation": qwen_data["valuation"],
            "deep_financial": qwen_data["deep_financial"],
            "news_analysis": qwen_data["news_analysis"],
            "analyst_consensus": qwen_data["analyst_consensus"],
            "risk_indicators": qwen_data["risk_indicators"],
            "fund_flow": qwen_data["fund_flow"],
            "history": [],
            "data_source": f"ai_{ds.name}",
            "smart_analysis": qwen_analysis,
        }

    # ---- 辅助方法 ----

    def _build_valuation(self, company_info: Dict, financial: pd.DataFrame) -> Dict[str, Any]:
        # 从company_info获取最新价
        price = None
        raw = company_info.get('最新价')
        try:
            price = float(raw) if raw is not None else None
        except (ValueError, TypeError):
            price = None

        valuation = {
            'pe_ratio': None,
            'pb_ratio': None,
            'market_cap': company_info.get('总市值'),
            'circulating_market_cap': company_info.get('流通市值'),
        }

        # 从财务指标计算PE/PB
        if isinstance(financial, pd.DataFrame) and not financial.empty:
            # 取年报(日期含12-31)的EPS计算PE，避免用季度累计值
            annual = financial[financial['日期'].astype(str).str.contains('12-31')]
            eps_row = annual.iloc[-1] if not annual.empty else financial.iloc[-1]
            eps = None
            for eps_col in ['每股收益', '摊薄每股收益(元)', '加权每股收益(元)']:
                if eps_col in eps_row.index and pd.notna(eps_row[eps_col]) and eps_row[eps_col] > 0:
                    eps = float(eps_row[eps_col])
                    break
            if price and eps:
                valuation['pe_ratio'] = round(price / eps, 2)
            # BPS → PB = Price / BPS（BPS用最新值即可，变动不大）
            bps_row = financial.iloc[-1]
            bps = None
            for bps_col in ['每股净资产', '每股净资产_调整前(元)', '每股净资产_调整后(元)']:
                if bps_col in bps_row.index and pd.notna(bps_row[bps_col]) and bps_row[bps_col] > 0:
                    bps = float(bps_row[bps_col])
                    break
            if price and bps:
                valuation['pb_ratio'] = round(price / bps, 2)

        return valuation

    def _populate_from_ai(self, symbol: str, ai: Dict[str, Any]) -> Dict[str, Any]:
        """将AI分析结果转为前端期望的结构"""
        risk_monitor = ai.get("risk_indicators_monitor", {})
        fund_flow_analysis = ai.get("fund_flow_analysis", {})
        news_sentiment = ai.get("news_sentiment", {})
        analyst_details = ai.get("analyst_rating_details", {})
        manual_risk = ai.get("manual_risk_analysis", {})

        return {
            "company_info": {"股票简称": f"股票{symbol}", "数据来源": "AI"},
            "technical": {"pct_chg": None, "turnover": None, "data_source": "ai"},
            "valuation": {"pe_ratio": None, "pb_ratio": None, "market_cap": None, "circulating_market_cap": None},
            "deep_financial": {
                "financial_indicators": [{"风险等级": manual_risk.get("overall_risk_level", ""), "数据来源": "AI"}] if manual_risk else [],
                "balance_sheet": [],
                "cashflow": [],
            },
            "news_analysis": [{
                "title": f"舆情分析: {news_sentiment.get('overall_sentiment', 'N/A')}",
                "content": news_sentiment.get('key_news_impact', ''),
                "publish_time": datetime.now().strftime('%Y-%m-%d'),
                "source": "AI",
                "sentiment": news_sentiment.get('overall_sentiment', '中性'),
            }] if news_sentiment else [],
            "analyst_consensus": {
                "stock_code": symbol,
                "latest_rating": analyst_details.get("consensus_rating", "N/A"),
                "data_source": "ai",
                "rating_trend": analyst_details.get("rating_trend", ""),
                "target_price_range": analyst_details.get("target_price_range", ""),
            } if analyst_details else {},
            "risk_indicators": {
                "pledge_ratio": [{"分析": risk_monitor.get("pledge_ratio_analysis", ""), "质押比例(%)": None, "数据来源": "AI"}] if risk_monitor.get("pledge_ratio_analysis") else [],
                "cyq": [{"分析": risk_monitor.get("chip_distribution", ""), "获利盘比例": None, "数据来源": "AI"}] if risk_monitor.get("chip_distribution") else [],
                "insider_holdings": [{"分析": risk_monitor.get("insider_holdings", ""), "数据来源": "AI"}] if risk_monitor.get("insider_holdings") else [],
                "margin_balance": [{"分析": risk_monitor.get("margin_trading", ""), "融资余额(元)": None, "数据来源": "AI"}] if risk_monitor.get("margin_trading") else [],
            },
            "fund_flow": [{"数据来源": "AI", **fund_flow_analysis}] if fund_flow_analysis else [],
        }

    @staticmethod
    def _fmt_market_cap(val):
        """将市值格式化为可读字符串"""
        if val is None:
            return None
        try:
            v = float(val) if not isinstance(val, (int, float)) else val
            if v > 1e12:
                return f"{v/1e12:.2f}万亿"
            elif v > 1e8:
                return f"{v/1e8:.2f}亿"
            return str(val)
        except (ValueError, TypeError):
            return str(val)

    @staticmethod
    def _clean_nan(obj):
        if isinstance(obj, dict):
            return {k: DataSourceManager._clean_nan(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [DataSourceManager._clean_nan(v) for v in obj]
        elif isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
            return obj
        return obj

    def _build_empty(self, symbol: str, reason: str = "") -> Dict[str, Any]:
        logger.warning(f"[Manager] 返回空结果: {symbol} - {reason}")
        return {
            "symbol": symbol,
            "company_info": {},
            "latest_price": None,
            "technical": {},
            "valuation": {},
            "deep_financial": {},
            "news_analysis": [],
            "analyst_consensus": {},
            "risk_indicators": {"pledge_ratio": [], "cyq": [], "insider_holdings": [], "margin_balance": []},
            "fund_flow": [],
            "history": [],
            "data_source": "unavailable",
            "smart_analysis": {"available": False, "fundamental_analysis": reason or "数据不可用"},
        }


_manager: Optional[DataSourceManager] = None


def get_source_manager() -> DataSourceManager:
    global _manager
    if _manager is None:
        _manager = DataSourceManager()
    return _manager
