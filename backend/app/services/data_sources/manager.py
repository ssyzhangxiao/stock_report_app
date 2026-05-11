import logging
import math
from typing import Dict, Any, Optional, Callable
from datetime import datetime
import concurrent.futures

import pandas as pd

from .base import DataSource
from .sina_source import SinaDataSource
from .eastmoney_source import EastMoneyDataSource
from .ai_source import QwenDataSource, DeepSeekDataSource, _BaseAIDataSource
from .akshare_source import AkShareDataSource

logger = logging.getLogger(__name__)

_SOURCE_KEYS = ["sina", "eastmoney", "qwen", "deepseek", "akshare"]


class DataSourceManager:
    def __init__(self):
        self._sources: Dict[str, DataSource] = {
            "sina": SinaDataSource(),
            "eastmoney": EastMoneyDataSource(),
            "qwen": QwenDataSource(),
            "deepseek": DeepSeekDataSource(),
            "akshare": AkShareDataSource(),
        }
        self._unified = None

    @property
    def unified(self):
        if self._unified is None:
            from .unified.acquisition import UnifiedDataAcquisition

            self._unified = UnifiedDataAcquisition()
        return self._unified

    def list_sources(self) -> Dict[str, bool]:
        return {k: v.is_available() for k, v in self._sources.items()}

    def get_source(self, name: str) -> Optional[DataSource]:
        return self._sources.get(name)

    def analyze(
        self, symbol: str, source: str = "auto", years: int = 2
    ) -> Dict[str, Any]:
        if source == "auto":
            return self._analyze_auto(symbol, years)
        ds = self._sources.get(source)
        if not ds:
            return self._build_empty(symbol, f"未知数据源: {source}")
        return self._analyze_with(symbol, ds, years)

    def _analyze_auto(self, symbol: str, years: int) -> Dict[str, Any]:
        sina = self._sources["sina"]
        em = self._sources["eastmoney"]

        result = None

        daily = sina.get_daily(symbol, years)
        if daily is not None:
            logger.info(f"[Auto] 行情来自新浪")
            result = self._analyze_with(symbol, sina, years)
            result = self._fill_advanced_data(result, symbol, em)
            result = self._recalc_valuation(result, symbol)
            result = self._clean_nan(result)

        if result is None:
            daily = em.get_daily(symbol, years)
            if daily is not None:
                logger.info(f"[Auto] 行情来自东财")
                result = self._analyze_with(symbol, em, years)

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

        try:
            from ..news_aggregator import get_news_aggregator

            aggregator = get_news_aggregator()
            existing_news = result.get("news_analysis", [])
            enriched = aggregator.aggregate(symbol, existing_news)
            result["news_analysis"] = enriched["news_analysis"]
            result["web_search_results"] = enriched["web_search_results"]
            result["web_fetch_results"] = enriched["web_fetch_results"]
            result["sources_summary"] = enriched["sources_summary"]
            logger.info(
                f"[Auto] Step 5: 多源新闻聚合完成, 共 {len(result['news_analysis'])} 条"
            )
        except Exception as e:
            logger.warning(f"[Auto] 多源新闻聚合失败(不影响主流程): {e}")

        return result

    def _fill_advanced_data(
        self, result: Dict[str, Any], symbol: str, em: DataSource
    ) -> Dict[str, Any]:
        logger.info(f"[Auto] 并发补全高级数据")

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            em_futures = {}

            ci = result.get("company_info") or {}
            if not ci.get("总市值") or not ci.get("name"):
                em_futures[pool.submit(lambda s=symbol: em.get_company_profile(s))] = (
                    "company_info"
                )
            ri = result.get("risk_indicators", {})
            for key, fn in [
                ("pledge_ratio", em.get_pledge_ratio),
                ("cyq", lambda s=symbol: em.get_cyq(s)),
                ("insider_holdings", em.get_insider_holdings),
                ("margin_balance", em.get_margin_balance),
            ]:
                if not ri.get(key):
                    em_futures[pool.submit(lambda s=symbol, f=fn: f(s))] = key
            if not result.get("fund_flow"):
                em_futures[pool.submit(lambda s=symbol: em.get_fund_flow(s))] = (
                    "fund_flow"
                )
            if not result.get("news_analysis"):
                em_futures[pool.submit(lambda s=symbol: em.get_news(s))] = "news"
            if not result.get("analyst_consensus") or not result[
                "analyst_consensus"
            ].get("latest_rating"):
                em_futures[pool.submit(lambda s=symbol: em.get_analyst_rating(s))] = (
                    "analyst"
                )

            deep = result.get("deep_financial", {})
            if not deep.get("financial_indicators"):
                em_futures[
                    pool.submit(lambda s=symbol: em.get_financial_indicators(s))
                ] = "financial_indicators"
            if not deep.get("cashflow"):
                em_futures[pool.submit(lambda s=symbol: em.get_cashflow(s))] = (
                    "cashflow"
                )
            if not deep.get("balance_sheet"):
                em_futures[pool.submit(lambda s=symbol: em.get_balance_sheet(s))] = (
                    "balance_sheet"
                )
            if not deep.get("income_statement"):
                em_futures[pool.submit(lambda s=symbol: em.get_income_statement(s))] = (
                    "income_statement"
                )

            mh_future = pool.submit(em.get_margin_history, symbol)

            for future in concurrent.futures.as_completed(em_futures, timeout=20 + 5):
                key = em_futures[future]
                try:
                    data = future.result(timeout=5)
                    self._apply_fill(result, symbol, key, data)
                except Exception:
                    pass

            try:
                mh_data = mh_future.result(timeout=15)
                if mh_data:
                    ri = result.get("risk_indicators") or {
                        "pledge_ratio": [],
                        "cyq": [],
                        "insider_holdings": [],
                        "margin_balance": [],
                    }
                    ri["margin_history"] = mh_data
                    result["risk_indicators"] = ri
                    logger.info(f"  [补全] margin_history {len(mh_data)} 条")
            except Exception:
                pass

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
            if "name" in data:
                result["company_info"] = {
                    **ci,
                    **{k: v for k, v in data.items() if v is not None and v != ""},
                }
                logger.info(f"  [补全] 公司简介详细数据")
            else:
                merge_keys = ("总市值", "流通市值", "市盈率-动态", "市净率")
                result["company_info"] = {
                    **ci,
                    **{
                        k: v
                        for k, v in data.items()
                        if k in merge_keys and v is not None
                    },
                }
            val = result.get("valuation", {})
            val["market_cap"] = data.get("总市值", val.get("market_cap"))
            val["circulating_market_cap"] = data.get(
                "流通市值", val.get("circulating_market_cap")
            )
            val["pe_ratio"] = data.get("市盈率-动态", val.get("pe_ratio"))
            val["pb_ratio"] = data.get("市净率", val.get("pb_ratio"))
            logger.info(f"  [补全] 市值/PE/PB")
        elif key in ("pledge_ratio", "cyq", "insider_holdings", "margin_balance"):
            if isinstance(data, pd.DataFrame) and not data.empty:
                result["risk_indicators"][key] = data.to_dict(orient="records")
                logger.info(f"  [补全] risk_indicators.{key}")
        elif key in ("cashflow", "balance_sheet", "income_statement"):
            if isinstance(data, pd.DataFrame) and not data.empty:
                deep = result.get("deep_financial") or {}
                deep[key] = data.head(5).to_dict(orient="records")
                result["deep_financial"] = deep
                logger.info(f"  [补全] deep_financial.{key} {len(deep[key])} 条")
                if key == "balance_sheet":
                    DataSourceManager._merge_balance_to_indicators(result)
        elif key == "financial_indicators":
            if isinstance(data, pd.DataFrame) and not data.empty:
                deep = result.get("deep_financial") or {}
                records = DataSourceManager._select_financial_indicators(data)
                if records:
                    deep["financial_indicators"] = records
                    result["deep_financial"] = deep
                    logger.info(
                        f"  [补全] deep_financial.financial_indicators {len(records)} 条"
                    )
        elif key == "fund_flow":
            if isinstance(data, pd.DataFrame) and not data.empty:
                result["fund_flow"] = data.head(10).to_dict(orient="records")
                logger.info(f"  [补全] fund_flow")
        elif key == "news":
            if isinstance(data, pd.DataFrame) and not data.empty:
                from ..news_analyzer import classify_news

                result["news_analysis"] = classify_news(data)
                logger.info(f"  [补全] news_analysis")
        elif key == "analyst":
            if isinstance(data, dict) and (data.get("latest_rating") or data.get("org_count")):
                result["analyst_consensus"] = data
                logger.info(f"  [补全] analyst_consensus")

    @staticmethod
    def _default_smart_analysis(
        company_info: Dict, technical: Dict, valuation: Dict = None
    ) -> Dict[str, Any]:
        name = company_info.get("股票简称", "该股票")
        ind = company_info.get("行业", "")
        biz = company_info.get("主营业务", "")
        price = company_info.get("最新价", "N/A")
        pct = technical.get("pct_chg", None)
        trend = (
            "上涨"
            if pct is not None and pct >= 0
            else "下跌"
            if pct is not None and pct < 0
            else "震荡"
        )
        val = valuation or {}
        pe = val.get("pe_ratio")
        ind_pe = val.get("industry_pe")
        pb = val.get("pb_ratio")
        mcap = val.get("market_cap", "")

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

        ta_parts = [f"当前股价{price}元，近期趋势{trend}"]
        rsi = technical.get("rsi")
        if rsi is not None:
            rsi_status = "超买区" if rsi > 70 else "超卖区" if rsi < 30 else "中性区间"
            ta_parts.append(f"RSI({rsi:.0f})处于{rsi_status}")
        ta_text = "。".join(ta_parts) + "。关注MA5、MA20均线支撑位及成交量变化。"

        va_parts = []
        if pe:
            va_parts.append(f"当前PE{pe}倍")
        if ind_pe:
            diff = ((pe or 0) - ind_pe) / ind_pe * 100
            level = "高于" if diff > 10 else "低于" if diff < -10 else "接近"
            va_parts.append(f"{level}行业平均({ind_pe}倍)")
        if pb:
            va_parts.append(f"PB{pb}倍")
        va_text = (
            "，".join(va_parts) + "。" if va_parts else "结合当前市场估值水平进行判断。"
        )

        rw_tags = []
        if pe and ind_pe:
            ratio = pe / ind_pe
            if ratio > 2:
                rw_tags.append(
                    f"🔴 估值风险：PE{pe}倍为行业{ind_pe}倍的{ratio:.0f}倍，估值显著偏高"
                )
            elif ratio > 1.3:
                rw_tags.append(
                    f"🟠 估值风险：PE{pe}倍高于行业{ind_pe}倍约{((ratio - 1) * 100):.0f}%"
                )
            elif ratio < 0.7:
                rw_tags.append(f"🟢 估值偏低：PE{pe}倍低于行业{ind_pe}倍，可能存在低估")
            else:
                rw_tags.append(f"估值处行业中等水平(PE{pe}倍 vs 行业{ind_pe}倍)")
        else:
            rw_tags.append("估值水平待评估")
        rw_tags.append(
            f"控制权转让不确定性：需关注实际控制人意向、协议转让进展及监管审批"
        )
        rw_text = "；".join(rw_tags) + "。"

        summary = f"{name} - {ind}" if ind else f"{name} - 上市公司概况"

        return {
            "available": True,
            "data_source": "default",
            "generated_at": datetime.now().isoformat(),
            "fundamental_analysis": fa_text,
            "technical_analysis": ta_text,
            "valuation_analysis": va_text,
            "risk_warning": rw_text,
            "capital_analysis": f"基于资金流向数据分析主力资金动向，关注大单净流入/流出情况判断资金态度。",
            "investment_advice": {
                "score": 5,
                "suggestion": "建议观望",
                "target_price": None,
                "stop_loss": None,
                "position_advice": None,
            },
            "summary": summary,
        }

    def _analyze_with(self, symbol: str, ds: DataSource, years: int) -> Dict[str, Any]:
        source_tag = ds.name
        is_ai = source_tag in ("qwen", "deepseek")

        if is_ai:
            return self._build_from_ai(symbol, ds)

        daily = ds.get_daily(symbol, years)
        if daily is None:
            return self._build_empty(symbol, f"{source_tag} 行情数据不可用")

        company_info = ds.get_company_info(symbol) or {}
        fin = ds.get_financial_indicators(symbol)
        financial = (
            fin if isinstance(fin, pd.DataFrame) and not fin.empty else pd.DataFrame()
        )
        bal = ds.get_balance_sheet(symbol)
        balance = (
            bal if isinstance(bal, pd.DataFrame) and not bal.empty else pd.DataFrame()
        )
        cf = ds.get_cashflow(symbol)
        cashflow = (
            cf if isinstance(cf, pd.DataFrame) and not cf.empty else pd.DataFrame()
        )
        is_ = ds.get_income_statement(symbol)
        income_statement = (
            is_ if isinstance(is_, pd.DataFrame) and not is_.empty else pd.DataFrame()
        )
        insider = ds.get_insider_holdings(symbol)
        insider_df = (
            insider
            if isinstance(insider, pd.DataFrame) and not insider.empty
            else pd.DataFrame()
        )
        margin = ds.get_margin_balance(symbol)
        margin_df = (
            margin
            if isinstance(margin, pd.DataFrame) and not margin.empty
            else pd.DataFrame()
        )
        pledge = ds.get_pledge_ratio(symbol)
        pledge_df = (
            pledge
            if isinstance(pledge, pd.DataFrame) and not pledge.empty
            else pd.DataFrame()
        )
        cyq = ds.get_cyq(symbol)
        cyq_df = (
            cyq if isinstance(cyq, pd.DataFrame) and not cyq.empty else pd.DataFrame()
        )
        ff = ds.get_fund_flow(symbol)
        fund_flow_df = (
            ff if isinstance(ff, pd.DataFrame) and not ff.empty else pd.DataFrame()
        )
        news = ds.get_news(symbol)
        news_df = (
            news
            if isinstance(news, pd.DataFrame) and not news.empty
            else pd.DataFrame()
        )
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
            "latest_price": float(latest["close"]) if latest is not None else None,
            "technical": technical,
            "valuation": valuation,
            "deep_financial": {
                "financial_indicators": DataSourceManager._select_financial_indicators(
                    financial
                ),
                "balance_sheet": balance.head(5).to_dict(orient="records")
                if not balance.empty
                else [],
                "cashflow": cashflow.head(5).to_dict(orient="records")
                if not cashflow.empty
                else [],
                "income_statement": income_statement.head(5).to_dict(orient="records")
                if not income_statement.empty
                else [],
            },
            "news_analysis": news_classified,
            "analyst_consensus": analyst if isinstance(analyst, dict) else {},
            "risk_indicators": {
                "pledge_ratio": pledge_df.to_dict(orient="records")
                if not pledge_df.empty
                else [],
                "cyq": cyq_df.tail(10).to_dict(orient="records")
                if not cyq_df.empty
                else [],
                "insider_holdings": insider_df.to_dict(orient="records")
                if not insider_df.empty
                else [],
                "margin_balance": margin_df.tail(10).to_dict(orient="records")
                if not margin_df.empty
                else [],
            },
            "fund_flow": fund_flow_df.head(10).to_dict(orient="records")
            if not fund_flow_df.empty
            else [],
            "history": df_tech.tail(120).to_dict(orient="records")
            if df_tech is not None
            else [],
            "data_source": source_tag,
            "smart_analysis": self._default_smart_analysis(
                company_info, technical, valuation
            ),
        }

        self._merge_balance_to_indicators(result)

        result = self._clean_nan(result)
        return result

    @staticmethod
    def _normalize_date(date_str: str) -> str:
        """将各种日期格式统一为 YYYY-MM-DD"""
        if not date_str:
            return ""
        date_str = str(date_str).strip()
        if len(date_str) == 8 and date_str.isdigit():
            return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        if "-" in date_str:
            return date_str
        return date_str

    @staticmethod
    def _select_financial_indicators(financial: pd.DataFrame) -> list:
        """选取财务指标：最近3个年报 + 最新一期（如不在年报中）"""
        if financial is None or financial.empty:
            return []
        df = financial.copy()
        date_col = None
        for col in ["日期", "报告期", "report_date"]:
            if col in df.columns:
                date_col = col
                break
        if date_col is None:
            return df.tail(20).to_dict(orient="records")

        df[date_col] = df[date_col].astype(str)
        annual = df[df[date_col].str.contains("12-31")]
        annual_sorted = annual.sort_values(date_col, ascending=False)
        selected_annual = annual_sorted.head(3)

        latest = df.sort_values(date_col, ascending=False).iloc[0]
        latest_date = str(latest[date_col])
        already_included = any(
            str(row[date_col]) == latest_date for _, row in selected_annual.iterrows()
        )

        if already_included:
            result = selected_annual.sort_values(date_col, ascending=True)
        else:
            result_list = [latest] + [row for _, row in selected_annual.iterrows()]
            result = pd.DataFrame(result_list).sort_values(date_col, ascending=True)

        return result.to_dict(orient="records")

    @staticmethod
    def _merge_balance_to_indicators(result: Dict[str, Any]):
        """将资产负债表中的资产总额和所有者权益合并到财务指标中，供杜邦分析使用"""
        deep = result.get("deep_financial", {})
        indicators = deep.get("financial_indicators", [])
        balance_sheet = deep.get("balance_sheet", [])
        if not indicators or not balance_sheet:
            return
        bal_by_date = {}
        for row in balance_sheet:
            date_key = DataSourceManager._normalize_date(
                str(
                    row.get("报告期") or row.get("日期") or row.get("report_date") or ""
                )
            )
            if date_key:
                bal_by_date[date_key] = row
        for ind in indicators:
            date_key = DataSourceManager._normalize_date(
                str(ind.get("报告期") or ind.get("日期") or "")
            )
            bal = bal_by_date.get(date_key)
            if bal:
                for field in [
                    "资产总额(元)",
                    "资产总计(元)",
                    "总资产(元)",
                    "total_assets",
                ]:
                    if field in bal and bal[field] is not None:
                        ind["资产总额(元)"] = bal[field]
                        break
                for field in [
                    "所有者权益合计(元)",
                    "股东权益合计(元)",
                    "净资产(元)",
                    "total_holders_equity",
                ]:
                    if field in bal and bal[field] is not None:
                        ind["所有者权益合计(元)"] = bal[field]
                        break

    def _recalc_valuation(self, result: Dict[str, Any], symbol: str) -> Dict[str, Any]:
        sina = self._sources.get("sina")
        if not isinstance(sina, SinaDataSource):
            return result
        price = result.get("latest_price")
        fin_data = result.get("deep_financial", {}).get("financial_indicators", [])
        if not price or not fin_data:
            return result

        annual_eps = None
        for row in fin_data:
            if "日期" in row and "12-31" in str(row["日期"]):
                for k in ("每股收益", "摊薄每股收益(元)"):
                    if (
                        k in row
                        and row[k]
                        and isinstance(row[k], (int, float))
                        and row[k] > 0
                    ):
                        annual_eps = row[k]
                        break

        shares = sina.get_shares_outstanding(symbol)
        val = result.get("valuation") or {}
        if shares and price > 0:
            mcap = price * shares
            val["market_cap"] = DataSourceManager._fmt_market_cap(mcap)
            val["market_cap_value"] = mcap
            val["circulating_market_cap"] = DataSourceManager._fmt_market_cap(mcap)
            val["circulating_market_cap_value"] = mcap
        if price and annual_eps:
            val["pe_ratio"] = round(price / annual_eps, 2)
        if price:
            last = fin_data[-1]
            for k in ("每股净资产", "每股净资产_调整前(元)"):
                if (
                    k in last
                    and last[k]
                    and isinstance(last[k], (int, float))
                    and last[k] > 0
                ):
                    val["pb_ratio"] = round(price / last[k], 2)
                    break
        result["valuation"] = val
        logger.info(
            f"[重算] PE={val.get('pe_ratio')} PB={val.get('pb_ratio')} MC={val.get('market_cap')}"
        )
        return result

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

    def _build_valuation(
        self, company_info: Dict, financial: pd.DataFrame
    ) -> Dict[str, Any]:
        price = None
        raw = company_info.get("最新价")
        try:
            price = float(raw) if raw is not None else None
        except (ValueError, TypeError):
            price = None

        valuation = {
            "pe_ratio": None,
            "pb_ratio": None,
            "market_cap": company_info.get("总市值"),
            "circulating_market_cap": company_info.get("流通市值"),
        }

        if isinstance(financial, pd.DataFrame) and not financial.empty:
            annual = financial[financial["日期"].astype(str).str.contains("12-31")]
            eps_row = annual.iloc[-1] if not annual.empty else financial.iloc[-1]
            eps = None
            for eps_col in ["每股收益", "摊薄每股收益(元)", "加权每股收益(元)"]:
                if (
                    eps_col in eps_row.index
                    and pd.notna(eps_row[eps_col])
                    and eps_row[eps_col] > 0
                ):
                    eps = float(eps_row[eps_col])
                    break
            if price and eps:
                valuation["pe_ratio"] = round(price / eps, 2)
            bps_row = financial.iloc[-1]
            bps = None
            for bps_col in [
                "每股净资产",
                "每股净资产_调整前(元)",
                "每股净资产_调整后(元)",
            ]:
                if (
                    bps_col in bps_row.index
                    and pd.notna(bps_row[bps_col])
                    and bps_row[bps_col] > 0
                ):
                    bps = float(bps_row[bps_col])
                    break
            if price and bps:
                valuation["pb_ratio"] = round(price / bps, 2)

        return valuation

    def _populate_from_ai(self, symbol: str, ai: Dict[str, Any]) -> Dict[str, Any]:
        risk_monitor = ai.get("risk_indicators_monitor", {})
        fund_flow_analysis = ai.get("fund_flow_analysis", {})
        news_sentiment = ai.get("news_sentiment", {})
        analyst_details = ai.get("analyst_rating_details", {})
        manual_risk = ai.get("manual_risk_analysis", {})

        return {
            "company_info": {"股票简称": f"股票{symbol}", "数据来源": "AI"},
            "technical": {"pct_chg": None, "turnover": None, "data_source": "ai"},
            "valuation": {
                "pe_ratio": None,
                "pb_ratio": None,
                "market_cap": None,
                "circulating_market_cap": None,
            },
            "deep_financial": {
                "financial_indicators": [
                    {
                        "风险等级": manual_risk.get("overall_risk_level", ""),
                        "数据来源": "AI",
                    }
                ]
                if manual_risk
                else [],
                "balance_sheet": [],
                "cashflow": [],
            },
            "news_analysis": [
                {
                    "title": f"舆情分析: {news_sentiment.get('overall_sentiment', 'N/A')}",
                    "content": news_sentiment.get("key_news_impact", ""),
                    "publish_time": datetime.now().strftime("%Y-%m-%d"),
                    "source": "AI",
                    "sentiment": news_sentiment.get("overall_sentiment", "中性"),
                }
            ]
            if news_sentiment
            else [],
            "analyst_consensus": {
                "stock_code": symbol,
                "latest_rating": analyst_details.get("consensus_rating", "N/A"),
                "data_source": "ai",
                "rating_trend": analyst_details.get("rating_trend", ""),
                "target_price_range": analyst_details.get("target_price_range", ""),
            }
            if analyst_details
            else {},
            "risk_indicators": {
                "pledge_ratio": [
                    {
                        "分析": risk_monitor.get("pledge_ratio_analysis", ""),
                        "质押比例(%)": None,
                        "数据来源": "AI",
                    }
                ]
                if risk_monitor.get("pledge_ratio_analysis")
                else [],
                "cyq": [
                    {
                        "分析": risk_monitor.get("chip_distribution", ""),
                        "获利盘比例": None,
                        "数据来源": "AI",
                    }
                ]
                if risk_monitor.get("chip_distribution")
                else [],
                "insider_holdings": [
                    {"分析": risk_monitor.get("insider_holdings", ""), "数据来源": "AI"}
                ]
                if risk_monitor.get("insider_holdings")
                else [],
                "margin_balance": [
                    {
                        "分析": risk_monitor.get("margin_trading", ""),
                        "融资余额(元)": None,
                        "数据来源": "AI",
                    }
                ]
                if risk_monitor.get("margin_trading")
                else [],
            },
            "fund_flow": [{"数据来源": "AI", **fund_flow_analysis}]
            if fund_flow_analysis
            else [],
        }

    @staticmethod
    def _fmt_market_cap(val):
        if val is None:
            return None
        try:
            v = float(val) if not isinstance(val, (int, float)) else val
            if v > 1e12:
                return f"{v / 1e12:.2f}万亿"
            elif v > 1e8:
                return f"{v / 1e8:.2f}亿"
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
            "risk_indicators": {
                "pledge_ratio": [],
                "cyq": [],
                "insider_holdings": [],
                "margin_balance": [],
            },
            "fund_flow": [],
            "history": [],
            "data_source": "unavailable",
            "smart_analysis": {
                "available": False,
                "fundamental_analysis": reason or "数据不可用",
            },
        }


_manager: Optional[DataSourceManager] = None


def get_source_manager() -> DataSourceManager:
    global _manager
    if _manager is None:
        _manager = DataSourceManager()
    return _manager
