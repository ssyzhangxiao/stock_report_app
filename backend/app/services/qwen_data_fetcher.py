import requests
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class QwenDataFetcher:
    """智能数据获取服务（支持通义千问和DeepSeek）"""

    def __init__(self):
        self.api_key = os.getenv("DASHSCOPE_API_KEY", "")
        self.api_provider = os.getenv("API_PROVIDER", "qwen").lower()
        
        logger.info(f"初始化智能数据获取服务 - Provider: {self.api_provider}")
        logger.info(f"API Key 配置: {'已配置' if self.api_key else '未配置'}")
        
        if self.api_provider == "deepseek":
            self.base_url = "https://api.deepseek.com/v1"
            self.model = "deepseek-chat"
            logger.info(f"使用 DeepSeek API - Base URL: {self.base_url}, Model: {self.model}")
        else:  # qwen
            self.base_url = "https://dashscope.aliyuncs.com/api/v1"
            self.model = "qwen-max"
            logger.info(f"使用通义千问 API - Base URL: {self.base_url}, Model: {self.model}")

        if not self.api_key:
            logger.warning("未配置 DASHSCOPE_API_KEY，智能分析功能将不可用")

    def _call_qwen_api(self, prompt: str, model: str = None) -> Optional[str]:
        """调用智能分析 API，返回文本内容"""
        try:
            if self.api_provider == "deepseek":
                return self._call_deepseek_api(prompt, model)
            else:
                return self._call_aliyun_api(prompt, model)
        except Exception as e:
            logger.error(f"调用智能分析 API 异常: {e}")
            return None

    def _call_deepseek_api(self, prompt: str, model: str = None) -> Optional[str]:
        """调用 DeepSeek API"""
        logger.info(f"开始调用 DeepSeek API，模型: {model or self.model}")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model or self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "你是一个专业的金融分析师，擅长股票深度分析。请基于提供的数据给出专业、客观、有深度的分析。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 4000
        }
        
        logger.debug(f"DeepSeek API 请求数据: model={payload['model']}, max_tokens={payload['max_tokens']}")
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            
            logger.info(f"DeepSeek API 响应状态码: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.debug(f"DeepSeek API 响应结果: {json.dumps(result, ensure_ascii=False)[:500]}...")
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                logger.info(f"DeepSeek API 返回内容长度: {len(content)} 字符")
                return content
            else:
                logger.error(f"DeepSeek API 调用失败: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"DeepSeek API 调用异常: {e}")
            import traceback
            logger.error(f"错误堆栈: {traceback.format_exc()}")
            return None

    def _call_aliyun_api(self, prompt: str, model: str = None) -> Optional[str]:
        """调用通义千问 API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model or self.model,
            "input": {
                "messages": [
                    {
                        "role": "system",
                        "content": "你是一个专业的金融分析师，擅长股票深度分析。请基于提供的数据给出专业、客观、有深度的分析。需要实时数据时请使用联网搜索。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            },
            "parameters": {
                "result_format": "message"
            }
        }
        
        response = requests.post(
            f"{self.base_url}/services/aigc/text-generation/generation",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result.get("output", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
            return content
        else:
            logger.error(f"通义千问 API 调用失败: {response.status_code} - {response.text}")
            return None

    def generate_smart_analysis(self, symbol: str, stock_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_available():
            return {"available": False, "error": "千问API未配置"}

        try:
            company_info = stock_data.get("company_info", {})
            latest_price = stock_data.get("latest_price", "N/A")

            news_summary = ""
            news_analysis = stock_data.get("news_analysis", [])
            if news_analysis:
                for n in news_analysis[:5]:
                    news_summary += f"- [{n.get('sentiment','中性')}] {n.get('title','')}\n"

            prompt = f"""你是一个专业的股票分析师。请基于以下数据对 {symbol} 进行分析。

最新价格: {latest_price}
公司信息: {json.dumps(company_info, ensure_ascii=False, default=str)[:500] if company_info else '无'}
技术指标: {json.dumps(stock_data.get('technical', {}), ensure_ascii=False, default=str)[:300]}
估值: {json.dumps(stock_data.get('valuation', {}), ensure_ascii=False, default=str)[:300]}
财务: {json.dumps(stock_data.get('deep_financial', {}), ensure_ascii=False, default=str)[:500]}
新闻: {news_summary[:300] if news_summary else '无'}

请输出JSON（不要用markdown代码块），包含以下字段：
1. fundamental_analysis: 基本面分析
2. technical_analysis: 技术面分析
3. valuation_analysis: 估值分析
4. risk_warning: 风险提示
5. capital_analysis: 资金面分析
6. investment_advice: {{"score": 1-10整数, "suggestion": "建议", "target_price": "目标价或null", "stop_loss": "止损价或null", "position_advice": "仓位建议"}}
7. summary: 一句话总结（20字以内）

直接输出JSON，不要其他文字。"""

            content = self._call_qwen_api(prompt)
            if not content:
                return {"available": False, "error": "千问API返回为空"}

            try:
                start_idx = content.find("{")
                end_idx = content.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    json_str = content[start_idx:end_idx]
                    analysis = json.loads(json_str)
                    analysis["available"] = True
                    analysis["generated_at"] = datetime.now().isoformat()
                    return analysis
            except json.JSONDecodeError:
                logger.warning("千问返回非JSON格式，使用文本模式")

            return {
                "available": True,
                "raw_analysis": content,
                "generated_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"生成智能分析失败: {e}")
            return {"available": False, "error": str(e)}

    def get_stock_basic_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        prompt = f"""请分析股票 {symbol} 的基本情况（JSON格式）。
注意：不要编造具体的实时数据。对于不确定的数据，请将数值字段设为 null。

需要包含以下字段：
- stock_name: 股票名称（基于你的知识）
- industry: 所属行业
- analysis: 对该公司基本情况的简要文字分析（100字以内）

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析通义千问返回的基本信息失败: {e}")
        return None

    def get_financial_summary(self, symbol: str) -> Optional[Dict[str, Any]]:
        prompt = f"""请分析股票 {symbol} 的财务状况（JSON格式）。
注意：不要编造具体的实时数据。对于不确定的数据，请将数值字段设为 null。
重点提供文字分析而非数字。

需要包含以下字段：
- analysis: 财务状况文字分析（150字以内）
- roe_estimate: 大致ROE范围（如"15-20%"或null）
- debt_ratio_estimate: 大致负债率范围（如"40-50%"或null）

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析通义千问返回的财务摘要失败: {e}")
        return None

    def get_analyst_consensus(self, symbol: str) -> Optional[Dict[str, Any]]:
        prompt = f"""请提供股票 {symbol} 的分析师评级分析（JSON格式）。
注意：不要编造具体的实时数据（不要编造目标价、分析师数量等具体数字）。
重点提供文字分析。

需要包含以下字段：
- rating_analysis: 市场对该股票的评级倾向文字分析（100字以内）

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析通义千问返回的分析师预期失败: {e}")
        return None

    def get_risk_indicators_monitor(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取风险指标监控数据"""
        prompt = f"""请提供股票 {symbol} 的风险指标监控数据（JSON格式）：

需要包含以下字段：
- pledge_ratio_analysis: 股权质押情况分析
- chip_distribution: 筹码分布情况分析  
- insider_holdings: 高管持股变动分析
- margin_trading: 融资融券情况分析

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析风险指标监控数据失败: {e}")
        return None

    def get_fund_flow_analysis(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取资金流向分析数据"""
        prompt = f"""请提供股票 {symbol} 的资金流向分析数据（JSON格式）：

需要包含以下字段：
- main_force_flow: 主力资金流向分析
- retail_flow: 散户资金流向分析
- north_south_flow: 南北向资金流向分析

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析资金流向分析数据失败: {e}")
        return None

    def get_news_sentiment(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取新闻舆情数据"""
        prompt = f"""请提供股票 {symbol} 的舆情分析数据（JSON格式）：

需要包含以下字段：
- overall_sentiment: 整体舆情倾向(正面/中性/负面)
- key_news_impact: 重要新闻影响分析
- policy_impact: 政策影响分析

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析舆情数据失败: {e}")
        return None

    def get_manual_risk_analysis(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取手工风险分析数据"""
        prompt = f"""请对股票 {symbol} 进行全面的手工风险分析（JSON格式）：

需要包含以下字段：
- overall_risk_level: 整体风险等级(低/中/高)
- risk_score: 风险评分(1-10分)
- key_risk_factors: 主要风险因素列表
- technical_risk_view: 技术面风险观点
- fundamental_risk_view: 基本面风险观点
- market_sentiment_view: 市场情绪观点
- investment_strategy: 投资策略建议
- additional_notes: 其他补充说明

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析手工风险分析数据失败: {e}")
        return None

    def get_technical_analysis(self, symbol: str) -> Optional[Dict[str, Any]]:
        prompt = f"""请分析股票 {symbol} 的技术面情况（JSON格式）。
注意：不要编造具体的技术指标数值（不要编造具体的均线值、RSI值、涨跌幅等）。
只提供方向性的文字分析。

需要包含以下字段：
- trend_analysis: 技术面趋势文字分析（150字以内）

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析技术分析数据失败: {e}")
        return None

    def get_market_sentiment(self, symbol: str) -> Optional[Dict[str, Any]]:
        prompt = f"""请提供股票 {symbol} 的市场情绪数据（JSON格式）：

需要包含以下字段：
- sentiment: 市场情绪（乐观/中性/悲观）
- institutional_attitude: 机构态度（看多/中性/看空）
- retail_sentiment: 散户情绪（积极/中性/消极）
- hot_money_activity: 游资活跃度（高/中/低）

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析市场情绪数据失败: {e}")
        return None

    def get_risk_assessment(self, symbol: str) -> Optional[Dict[str, Any]]:
        prompt = f"""请提供股票 {symbol} 的风险评估数据（JSON格式）：

需要包含以下字段：
- overall_risk: 整体风险等级（低/中/高）
- risk_score: 风险评分（1-10）
- key_risks: 主要风险因素列表
- mitigation: 风险缓解建议

请以纯 JSON 格式返回，不要包含其他文字。"""

        result = self._call_qwen_api(prompt)
        if result:
            try:
                start_idx = result.find("{")
                end_idx = result.rfind("}") + 1
                if start_idx != -1 and end_idx != -1:
                    return json.loads(result[start_idx:end_idx])
            except Exception as e:
                logger.error(f"解析风险评估数据失败: {e}")
        return None

    def is_available(self) -> bool:
        return bool(self.api_key)


_qwen_fetcher = None

def get_qwen_fetcher() -> QwenDataFetcher:
    global _qwen_fetcher
    if _qwen_fetcher is None:
        _qwen_fetcher = QwenDataFetcher()
    return _qwen_fetcher
