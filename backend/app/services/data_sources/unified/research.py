"""
研报层 — 覆盖3个维度
  2.行业板块分类  3.产业链(行业指数趋势)  6.竞争对手(同行业对比)

数据源:
  - akshare (东财研报/行业分类/行业指数)
  - iwencai (可选，自然语言语义搜索研报)
  - AI (Qwen/DeepSeek，智能分析研报)
"""

import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

import pandas as pd

from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus

logger = logging.getLogger(__name__)


class ResearchProvider:

    def __init__(self):
        self._ak = None
        self._rate_limiter = RateLimiter(min_interval=1.0, max_per_minute=15)
        self._slow_limiter = RateLimiter(min_interval=1.5, max_per_minute=8)

    @property
    def _akshare(self):
        if self._ak is None:
            from ..akshare_source import AkShareDataSource
            self._ak = AkShareDataSource()
        return self._ak

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_eastmoney_reports(self, symbol: str, limit: int = 20) -> Optional[List[Dict]]:
        try:
            self._rate_limiter.wait()
            df = self._akshare.get_research_report(symbol)
            if df is None or df.empty:
                return None
            df = df.head(limit)
            reports = []
            for _, row in df.iterrows():
                reports.append({
                    "title": str(row.get("报告名称", "")),
                    "org": str(row.get("机构", "")),
                    "date": str(row.get("日期", "")),
                    "rating": str(row.get("东财评级", "")),
                    "source": "eastmoney",
                })
            return reports
        except Exception as e:
            logger.warning(f"[研报] 东财研报失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_analyst_consensus(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            self._rate_limiter.wait()
            df = self._akshare.get_profit_forecast_ths(symbol)
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            return {
                "year": str(latest.get("年度", "")),
                "avg_eps": float(latest.get("均值", 0)) if pd.notna(latest.get("均值")) else None,
                "org_count": int(latest.get("预测机构数", 0)) if pd.notna(latest.get("预测机构数")) else None,
                "source": "ths",
            }
        except Exception as e:
            logger.warning(f"[研报] 一致预期失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_industry_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            self._rate_limiter.wait()
            df = self._akshare.get_board_industry_name()
            if df is None or df.empty:
                return None
            code_col = "代码" if "代码" in df.columns else "code"
            row = df[df[code_col].astype(str) == symbol]
            if row.empty:
                return None
            r = row.iloc[0]
            return {
                "industry": str(r.get("板块名称", "")),
                "industry_code": str(r.get("板块代码", "")),
                "source": "akshare_industry",
            }
        except Exception as e:
            logger.warning(f"[研报] 行业板块失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.5)
    def _get_industry_trend(self, industry_name: str) -> Optional[List[Dict]]:
        try:
            self._slow_limiter.wait()
            df = self._akshare.get_board_industry_hist(industry_name)
            if df is None or df.empty:
                return None
            trend = []
            for _, row in df.tail(30).iterrows():
                trend.append({
                    "date": str(row.get("日期", "")),
                    "close": float(row.get("收盘", 0)) if pd.notna(row.get("收盘")) else None,
                    "change_pct": float(row.get("涨跌幅", 0)) if pd.notna(row.get("涨跌幅")) else None,
                })
            return trend
        except Exception as e:
            logger.warning(f"[研报] 行业趋势失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_industry_peers(self, industry_name: str) -> Optional[List[Dict]]:
        try:
            self._rate_limiter.wait()
            df = self._akshare.get_board_industry_cons(industry_name)
            if df is None or df.empty:
                return None
            peers = []
            for _, row in df.head(20).iterrows():
                peers.append({
                    "symbol": str(row.get("代码", "")),
                    "name": str(row.get("名称", "")),
                    "price": float(row.get("最新价", 0)) if pd.notna(row.get("最新价")) else None,
                    "change_pct": float(row.get("涨跌幅", 0)) if pd.notna(row.get("涨跌幅")) else None,
                    "market_cap": float(row.get("总市值", 0)) if pd.notna(row.get("总市值")) else None,
                    "pe_ratio": float(row.get("市盈率-动态", 0)) if pd.notna(row.get("市盈率-动态")) else None,
                })
            return peers
        except Exception as e:
            logger.warning(f"[研报] 同行业对比失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_iwencai_research(self, symbol: str) -> Optional[List[Dict]]:
        try:
            import os
            api_key = os.getenv("IWENCAI_API_KEY")
            if not api_key:
                return None
            import requests
            self._rate_limiter.wait()
            resp = requests.post(
                "https://iwencai.com/customized/chart/get-robot-data",
                json={"question": f"{symbol} 研报 评级 目标价", "perpage": 10},
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=15,
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            results = []
            for item in data.get("data", [])[:10]:
                results.append({
                    "title": item.get("title", ""),
                    "summary": item.get("summary", ""),
                    "source": "iwencai",
                })
            return results
        except Exception as e:
            logger.warning(f"[研报] iwencai失败: {e}")
            return None

    def _get_ai_analysis(self, symbol: str, stock_data: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        try:
            from ..llm_service import get_llm_service
            llm = get_llm_service()
            if not llm.is_available():
                return None

            industry_info = self._get_industry_info(symbol)
            peers = []
            if industry_info:
                peers = self._get_industry_peers(industry_info.get('industry', '')) or []

            today = datetime.now().strftime("%Y年%m月%d日")
            prompt = f"""当前日期：{today}
你是专业的券商研究员，请基于以下数据对股票 {symbol} 进行研报分析：

行业信息：{industry_info}
同行业公司：{json.dumps(peers[:5], ensure_ascii=False, indent=2)}

请返回JSON格式的研报分析：
{{
    "行业地位": "公司在行业中的竞争地位分析",
    "核心看点": ["看点1", "看点2", "看点3"],
    "风险提示": ["风险1", "风险2"],
    "投资建议": "给出投资建议",
    "可比公司估值": [
        {{"公司": "公司名", "PE": 数值, "PB": 数值, "市值": "市值"}}
    ]
}}"""
            content = llm.call_llm(
                system_prompt="你是一个专业的券商研究员，擅长基本面分析和研报撰写。",
                user_prompt=prompt,
                use_json_mode=True,
            )
            if not content:
                return None
            start = content.find("{")
            end = content.rfind("}") + 1
            if start == -1 or end == 0:
                return None
            return json.loads(content[start:end])
        except Exception as e:
            logger.warning(f"[研报] AI分析失败: {e}")
            return None

    def get_research(self, symbol: str, include_iwencai: bool = False) -> DataResult:
        result = {
            "symbol": symbol,
            "reports": None,
            "analyst_consensus": None,
            "industry_info": None,
            "industry_trend": None,
            "industry_peers": None,
            "iwencai_research": None,
            "ai_analysis": None,
        }

        try:
            result["reports"] = self._get_eastmoney_reports(symbol)
        except Exception as e:
            logger.warning(f"[研报] 东财研报异常: {e}")

        try:
            result["analyst_consensus"] = self._get_analyst_consensus(symbol)
        except Exception as e:
            logger.warning(f"[研报] 一致预期异常: {e}")

        try:
            result["industry_info"] = self._get_industry_info(symbol)
        except Exception as e:
            logger.warning(f"[研报] 行业板块异常: {e}")

        if result["industry_info"]:
            industry_name = result["industry_info"].get("industry", "")
            if industry_name:
                try:
                    result["industry_trend"] = self._get_industry_trend(industry_name)
                except Exception as e:
                    logger.warning(f"[研报] 行业趋势异常: {e}")
                try:
                    result["industry_peers"] = self._get_industry_peers(industry_name)
                except Exception as e:
                    logger.warning(f"[研报] 同行业对比异常: {e}")

        if include_iwencai:
            try:
                result["iwencai_research"] = self._get_iwencai_research(symbol)
            except Exception as e:
                logger.warning(f"[研报] iwencai异常: {e}")

        try:
            result["ai_analysis"] = self._get_ai_analysis(symbol)
        except Exception as e:
            logger.warning(f"[研报] AI分析异常: {e}")

        has_data = bool(result["reports"] or result["analyst_consensus"] or result["industry_info"])
        status = SourceStatus.OK if has_data else SourceStatus.DEGRADED
        return DataResult(
            success=has_data, data=result, source="akshare+iwencai+ai",
            status=status,
            metadata={
                "has_reports": bool(result["reports"]),
                "has_consensus": bool(result["analyst_consensus"]),
                "has_industry": bool(result["industry_info"]),
                "has_ai": bool(result["ai_analysis"]),
            },
        )
