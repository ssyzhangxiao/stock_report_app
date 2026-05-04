"""
Dexter AI Agent 集成客户端
通过 HTTP 调用 Dexter API Server (bun run api)
"""
import logging
import httpx
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

DEXTER_API_URL = "http://localhost:3456"
DEFAULT_TIMEOUT = 300.0


class DexterClient:
    """Dexter 自主金融研究 Agent 的 HTTP 客户端"""

    def __init__(self, base_url: str = DEXTER_API_URL, timeout: float = DEFAULT_TIMEOUT):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def health_check(self) -> bool:
        """检查 Dexter API 是否可用"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.base_url}/api/health")
                return r.status_code == 200
        except Exception:
            return False

    async def analyze(self, query: str, model: Optional[str] = None) -> Dict[str, Any]:
        """
        调用 Dexter Agent 执行自主研究分析
        
        Args:
            query: 自然语言研究问题
            model: 可选指定模型 (如 deepseek-chat)
        
        Returns:
            {
                "success": bool,
                "answer": str,
                "toolCalls": list,
                "iterations": int,
                "totalTime": int,
                "error": str (if failed)
            }
        """
        payload = {"query": query}
        if model:
            payload["model"] = model

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.post(
                    f"{self.base_url}/api/analyze",
                    json=payload,
                )
                r.raise_for_status()
                return r.json()
        except httpx.TimeoutException:
            logger.error(f"[Dexter] 请求超时 ({self.timeout}s): {query[:80]}...")
            return {"success": False, "error": f"请求超时 ({self.timeout}秒)"}
        except httpx.HTTPStatusError as e:
            logger.error(f"[Dexter] HTTP错误 {e.response.status_code}: {e}")
            return {"success": False, "error": f"Dexter API 错误 ({e.response.status_code})"}
        except Exception as e:
            logger.error(f"[Dexter] 调用失败: {e}")
            return {"success": False, "error": str(e)}

    async def analyze_dcf(self, symbol: str, name: str = "") -> Dict[str, Any]:
        """DCF 估值分析"""
        label = f"{name}({symbol})" if name else symbol
        query = f"""对 {label} 进行 DCF 估值分析。请使用 dcf-valuation skill，计算其内在价值。
需要包含：自由现金流预测、WACC计算、敏感性分析矩阵、最终估值结论。"""
        return await self.analyze(query)

    async def analyze_x_sentiment(self, symbol: str, name: str = "") -> Dict[str, Any]:
        """X/Twitter 舆情分析"""
        label = f"{name}({symbol})" if name else symbol
        query = f"""搜索 X/Twitter 上关于 {label} 的近期舆情和讨论。
使用 x-research skill，分析市场情绪、关键观点、多空分歧。"""
        return await self.analyze(query)

    async def analyze_insider_trades(self, symbol: str, name: str = "") -> Dict[str, Any]:
        """内部人交易分析"""
        label = f"{name}({symbol})" if name else symbol
        query = f"""分析 {label} 的近期内部人交易活动。
获取 insider trades 数据，分析高管买卖趋势、大股东增减持情况，判断内部人对公司前景的信心。"""
        return await self.analyze(query)

    async def comprehensive_report(self, symbol: str, name: str = "") -> Dict[str, Any]:
        """综合研究报告"""
        label = f"{name}({symbol})" if name else symbol
        query = f"""对 {label} 生成一份综合股票分析报告。
使用 stock-analysis-report skill，包含：
1. 公司概览与市场数据
2. 财务报表分析（利润表、资产负债表、现金流）
3. 估值与关键比率
4. 风险评估与内部人活动
5. 分析师共识与预测
6. 近期新闻与情绪
7. 综合投资结论"""
        return await self.analyze(query)


_dexter_client: Optional[DexterClient] = None


def get_dexter_client() -> DexterClient:
    global _dexter_client
    if _dexter_client is None:
        _dexter_client = DexterClient()
    return _dexter_client
