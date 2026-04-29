import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List

from .base import DataSource
from ..qwen_data_fetcher import get_qwen_fetcher

logger = logging.getLogger(__name__)


_TODAY = datetime.now().strftime("%Y年%m月%d日")


def _call_ai(prompt: str) -> Optional[Dict[str, Any]]:
    """调用AI并提取JSON"""
    qwen = get_qwen_fetcher()
    if not qwen.is_available():
        return None
    try:
        content = qwen._call_qwen_api(prompt)
        if not content:
            return None
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            return None
        return json.loads(content[start:end])
    except Exception as e:
        logger.warning(f"[AI] 调用失败: {e}")
        return None


def _call_ai_list(prompt: str) -> Optional[List]:
    """调用AI并提取JSON数组"""
    qwen = get_qwen_fetcher()
    if not qwen.is_available():
        return None
    try:
        content = qwen._call_qwen_api(prompt)
        if not content:
            return None
        start = content.find("[")
        end = content.rfind("]") + 1
        if start == -1 or end == 0:
            # 尝试按字典方式解析
            start = content.find("{")
            end = content.rfind("}") + 1
            if start == -1 or end == 0:
                return None
            result = json.loads(content[start:end])
            return [result] if isinstance(result, dict) else result
        return json.loads(content[start:end])
    except Exception as e:
        logger.warning(f"[AI] 列表调用失败: {e}")
        return None


def _merge_analysis(base: Dict[str, Any], ext: Dict[str, Any]) -> Dict[str, Any]:
    result = dict(base)
    for k, v in ext.items():
        if k not in result or not result.get(k):
            result[k] = v
    return result


class _BaseAIDataSource(DataSource):
    """AI 数据源基类（Qwen / DeepSeek 共用逻辑）"""

    _provider: str = ""

    def is_available(self) -> bool:
        qwen = get_qwen_fetcher()
        return qwen.is_available()

    def get_daily(self, symbol: str, years: int = 2, adjust: str = "qfq") -> Optional:
        return None

    def get_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        return self.fetch_comprehensive_data(symbol)

    # ---- 综合数据拉取（一次调用获取全量结构化数据） ----

    def fetch_comprehensive_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """获取估值+质押+两融+评级关键数据"""
        prompt = f"""当前日期：{_TODAY}
你是并购顾问，对股票{symbol}做控制权转让前尽职调查，返回JSON：
{{"company_info":{{"总市值":"万亿元","市盈率-动态":数值,"市净率":数值,"行业":"行业","主营业务":"主营","行业平均市盈率":数值}},"financial_summary":{{"营业收入(亿元)":数值,"净利润(亿元)":数值,"roe(%)":数值,"资产负债率(%)":数值,"每股收益(元)":数值,"参考市值(行业PE×净利润)":"万亿元"}},"risk_indicators":{{"pledge":[{{"质押比例(%)":数值}}],"margin":[{{"融资余额(元)":数值}}]}},"analyst":{{"latest_rating":"评级"}},"fund_flow_analysis":{{"block_trade":"大宗交易异动","major_shareholder":"股东增减持趋势","control_flow":"控制权相关资金动向"}},"risk_analysis":{{"overall_risk_level":"低/中/高","key_risk_factors":["公司历史沿革与历次控制权变更","控制权比例与市值匹配度","减持约束与锁定期安排","股权结构(实控人/一致行动人)","主营业务稳定性与剥离必要性","资产质量与注入可行性","掏空风险(资金占用/违规担保)","负债与对外担保","法律合规与诉讼仲裁","估值与控股权溢价分析:当前PE vs 行业PE,参考市值=行业PE×净利润","行业监管与审批风险","核心团队与劳资稳定性"],"fundamental_risk_view":"从12个维度进行全面尽职调查:历史沿革、控制权结构、业务质地、资产质量、负债水平、掏空风险等"}}}}"""
        return _call_ai(prompt)

    def generate_smart_analysis(self, symbol: str, stock_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """基于已有数据+AI知识库生成智能分析（用于smart_analysis字段）"""
        result = self.generate_analysis_from_knowledge(symbol)
        return result

    # ---- 完整AI分析 ----

    def generate_analysis_from_knowledge(self, symbol: str) -> Optional[Dict[str, Any]]:
        prompt_main = f"""当前日期：{_TODAY}
你是一个专业的并购顾问，请对股票代码 {symbol} 进行控制权转让前的上市公司概况分析，返回JSON：
{{"fundamental_analysis":"基本面概况(主营业务/行业地位/竞争优势)","technical_analysis":"二级走势(近期是否创新高/新低、股价是否偏离正常走势、成交量异动)","valuation_analysis":"估值分析(PE/PB历史分位数、与同行对比)","risk_warning":"风险提示","capital_analysis":"资金面分析","summary":"一句话总结","investment_advice":{{"score":5,"suggestion":"","target_price":"","stop_loss":"","position_advice":""}}}}"""

        result = _call_ai(prompt_main)
        if not result:
            return None

        prompt_ext = f"""当前日期：{_TODAY}
请对股票 {symbol} 进行控制权转让专题风险分析。重点从以下维度分析：

1. 历史沿革：该公司历史上是否曾发生过控制权转让？若多次转让需警惕公司被掏空的风险
2. 控制权转让基础：市值规模与控制权比例的匹配度、收购方资金实力
3. 减持约束：锁定期规定、减持规则对控制权稳定性的影响
4. 主营业务稳定性：现有业务是否具备持续经营能力，是否需要剥离
5. 资产交易角度：是否需要注入新业务资产、资产定价合理性、交易方案设计
6. 上市公司被掏空风险：若已多次转让，需重点关注资产流失、资金占用、违规担保等风险

返回JSON：
{{"risk_indicators_monitor":{{"pledge_ratio_analysis":"质押分析","chip_distribution":"筹码分析","insider_holdings":"高管分析","margin_trading":"两融分析"}},"fund_flow_analysis":{{"main_force_flow":"主力","retail_flow":"散户","north_south_flow":"南北向"}},"news_sentiment":{{"overall_sentiment":"整体倾向","key_news_impact":"影响","policy_impact":"政策"}},"analyst_rating_details":{{"consensus_rating":"一致预期","rating_trend":"趋势","target_price_range":"目标价区间"}},"manual_risk_analysis":{{"overall_risk_level":"低/中/高","key_risk_factors":["公司历史沿革与历次控制权变更","控制权比例与市值匹配度","减持约束与锁定期安排","股权结构(实控人/一致行动人)","主营业务稳定性与剥离必要性","资产质量与注入可行性","掏空风险(资金占用/违规担保)","负债与对外担保","法律合规与诉讼仲裁","估值与控股权溢价分析","行业监管与审批风险","核心团队与劳资稳定性"],"technical_risk_view":"从股价波动、市值支撑角度分析控制权转让对二级市场的影响","fundamental_risk_view":"从12个维度全面尽职调查:历史沿革、控制权结构、业务质地、资产质量、负债水平、掏空风险等","market_sentiment_view":"市场对控制权变更的预期、资产交易方案的市场接受度","investment_strategy":"基于控制权转让预期的投资策略建议","additional_notes":"历史控制权变更记录及掏空风险警示"}}}}
注意：分析必须基于上市公司真实信息，重点排查多次转让风险和被掏空风险。"""

        ext = _call_ai(prompt_ext)
        if ext:
            result = _merge_analysis(result, ext)

        result["available"] = True
        result["data_source"] = f"ai_{self._provider}"
        result["generated_at"] = datetime.now().isoformat()
        return result


class QwenDataSource(_BaseAIDataSource):
    _provider = "qwen"

    @property
    def name(self) -> str:
        return "qwen"


class DeepSeekDataSource(_BaseAIDataSource):
    _provider = "deepseek"

    @property
    def name(self) -> str:
        return "deepseek"
