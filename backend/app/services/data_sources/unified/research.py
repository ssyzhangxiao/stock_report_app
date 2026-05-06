"""
研报层 — 覆盖3个维度
  2.行业板块分类  3.产业链(行业指数趋势)  6.竞争对手(同行业对比)

数据源: akshare (东财研报/行业分类/行业指数) + iwencai (可选)
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

import pandas as pd

from .common import RateLimiter, retry_on_failure, DataResult, SourceStatus

logger = logging.getLogger(__name__)


class ResearchProvider:

    def __init__(self):
        self._rate_limiter = RateLimiter(min_interval=1.0, max_per_minute=15)
        self._slow_limiter = RateLimiter(min_interval=1.5, max_per_minute=8)

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_eastmoney_reports(self, symbol: str, limit: int = 20) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_research_report_em(symbol=symbol)
            if df is None or df.empty:
                return None
            df = df.head(limit)
            reports = []
            for _, row in df.iterrows():
                reports.append({
                    "title": str(row.get('报告名称', '')),
                    "org": str(row.get('机构', '')),
                    "date": str(row.get('日期', '')),
                    "rating": str(row.get('东财评级', '')),
                    "source": "eastmoney",
                })
            return reports
        except Exception as e:
            logger.warning(f"[研报] 东财研报失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_analyst_consensus(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_profit_forecast_ths(symbol=symbol)
            if df is None or df.empty:
                return None
            latest = df.iloc[0]
            return {
                "year": str(latest.get('年度', '')),
                "avg_eps": float(latest.get('均值', 0)) if pd.notna(latest.get('均值')) else None,
                "org_count": int(latest.get('预测机构数', 0)) if pd.notna(latest.get('预测机构数')) else None,
                "source": "ths",
            }
        except Exception as e:
            logger.warning(f"[研报] 一致预期失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_industry_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_board_industry_name_em()
            if df is None or df.empty:
                return None
            code_col = '代码' if '代码' in df.columns else 'code'
            row = df[df[code_col].astype(str) == symbol]
            if row.empty:
                return None
            r = row.iloc[0]
            return {
                "industry": str(r.get('板块名称', '')),
                "industry_code": str(r.get('板块代码', '')),
                "source": "akshare_industry",
            }
        except Exception as e:
            logger.warning(f"[研报] 行业板块失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.5)
    def _get_industry_trend(self, industry_name: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._slow_limiter.wait()
            start = (datetime.now() - timedelta(days=180)).strftime('%Y%m%d')
            end = datetime.now().strftime('%Y%m%d')
            df = ak.stock_board_industry_hist_em(
                symbol=industry_name, period='日k',
                start_date=start, end_date=end,
            )
            if df is None or df.empty:
                return None
            trend = []
            for _, row in df.tail(30).iterrows():
                trend.append({
                    "date": str(row.get('日期', '')),
                    "close": float(row.get('收盘', 0)) if pd.notna(row.get('收盘')) else None,
                    "change_pct": float(row.get('涨跌幅', 0)) if pd.notna(row.get('涨跌幅')) else None,
                })
            return trend
        except Exception as e:
            logger.warning(f"[研报] 行业趋势失败: {e}")
            return None

    @retry_on_failure(max_retries=2, base_delay=1.0)
    def _get_industry_peers(self, industry_name: str) -> Optional[List[Dict]]:
        try:
            import akshare as ak
            self._rate_limiter.wait()
            df = ak.stock_board_industry_cons_em(symbol=industry_name)
            if df is None or df.empty:
                return None
            peers = []
            for _, row in df.head(20).iterrows():
                peers.append({
                    "symbol": str(row.get('代码', '')),
                    "name": str(row.get('名称', '')),
                    "price": float(row.get('最新价', 0)) if pd.notna(row.get('最新价')) else None,
                    "change_pct": float(row.get('涨跌幅', 0)) if pd.notna(row.get('涨跌幅')) else None,
                    "market_cap": float(row.get('总市值', 0)) if pd.notna(row.get('总市值')) else None,
                    "pe_ratio": float(row.get('市盈率-动态', 0)) if pd.notna(row.get('市盈率-动态')) else None,
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

    def get_research(self, symbol: str, include_iwencai: bool = False) -> DataResult:
        result = {
            "reports": [],
            "consensus": None,
            "industry_info": None,
            "industry_trend": [],
            "industry_peers": [],
            "iwencai": [],
        }

        try:
            reports = self._get_eastmoney_reports(symbol)
            if reports:
                result["reports"] = reports
        except Exception as e:
            logger.warning(f"[研报] 东财研报异常: {e}")

        try:
            result["consensus"] = self._get_analyst_consensus(symbol)
        except Exception as e:
            logger.warning(f"[研报] 一致预期异常: {e}")

        try:
            result["industry_info"] = self._get_industry_info(symbol)
        except Exception as e:
            logger.warning(f"[研报] 行业板块异常: {e}")

        industry_name = None
        if result["industry_info"]:
            industry_name = result["industry_info"].get("industry")

        if industry_name:
            try:
                result["industry_trend"] = self._get_industry_trend(industry_name) or []
            except Exception as e:
                logger.warning(f"[研报] 行业趋势异常: {e}")

            try:
                result["industry_peers"] = self._get_industry_peers(industry_name) or []
            except Exception as e:
                logger.warning(f"[研报] 同行业对比异常: {e}")

        if include_iwencai:
            try:
                result["iwencai"] = self._get_iwencai_research(symbol) or []
            except Exception as e:
                logger.warning(f"[研报] iwencai异常: {e}")

        has_data = bool(result["reports"] or result["consensus"] or result["industry_info"])
        status = SourceStatus.OK if has_data else SourceStatus.DEGRADED
        return DataResult(
            success=has_data, data=result, source="eastmoney+akshare",
            status=status,
            metadata={
                "report_count": len(result["reports"]),
                "peer_count": len(result["industry_peers"]),
                "has_industry": bool(result["industry_info"]),
            },
        )
