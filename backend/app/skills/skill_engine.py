"""
技能引擎 - 读取 SKILL.md 指导 LLM 进行分析工作。

架构：
  SKILL.md (定义分析流程) → SkillEngine (构建Prompt) → LLM (执行分析) → 结构化结果
"""

import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

SKILLS_DIR = Path(__file__).parent


@dataclass
class Skill:
    id: str
    name: str
    description: str
    category: str
    icon: str = ""
    estimated_duration: int = 10
    workflow: list[str] = field(default_factory=list)
    output: list[str] = field(default_factory=list)
    skill_path: Optional[Path] = None
    skill_md_content: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "icon": self.icon,
            "estimatedDuration": self.estimated_duration,
            "workflow": self.workflow,
            "output": self.output,
        }


@dataclass
class AnalysisMode:
    id: str
    name: str
    description: str
    icon: str
    skills: list[str]
    estimated_duration: int = 30

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "skills": self.skills,
            "estimatedDuration": self.estimated_duration,
        }


@dataclass
class SkillResult:
    skill_id: str
    status: str  # pending, running, completed, failed
    progress: int = 0
    data: Any = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "skillId": self.skill_id,
            "status": self.status,
            "progress": self.progress,
            "data": self.data,
            "error": self.error,
        }


class SkillEngine:
    """
    技能引擎 - 管理技能注册、Prompt构建、LLM调用编排。

    使用方式:
        engine = SkillEngine(llm_service)
        engine.register_all()
        result = engine.execute_mode("full-analysis", symbol="600519", stock_data={...})
    """

    def __init__(self, llm_service=None):
        self._skills: dict[str, Skill] = {}
        self._modes: dict[str, AnalysisMode] = {}
        self._llm_service = llm_service
        self._progress_callback: Optional[Callable] = None

    def set_llm_service(self, llm_service):
        self._llm_service = llm_service

    def set_progress_callback(self, callback: Callable):
        self._progress_callback = callback

    def _notify_progress(self, results: list[SkillResult]):
        if self._progress_callback:
            self._progress_callback(results)

    def register_skill(self, skill: Skill):
        self._skills[skill.id] = skill

    def register_mode(self, mode: AnalysisMode):
        self._modes[mode.id] = mode

    def get_skill(self, skill_id: str) -> Optional[Skill]:
        return self._skills.get(skill_id)

    def get_mode(self, mode_id: str) -> Optional[AnalysisMode]:
        return self._modes.get(mode_id)

    def get_all_skills(self) -> list[Skill]:
        return list(self._skills.values())

    def get_all_modes(self) -> list[AnalysisMode]:
        return list(self._modes.values())

    def _parse_skill_md(self, md_content: str) -> dict:
        """解析 SKILL.md 提取结构化信息。"""
        result = {"description": "", "workflow": [], "output": []}

        lines = md_content.strip().split("\n")
        current_section = None

        for line in lines:
            line = line.strip()
            if line.startswith("# "):
                result["title"] = line[2:].strip()
            elif line.startswith("## "):
                current_section = line[3:].strip()
            elif current_section == "技能描述" and line and not line.startswith("#"):
                result["description"] = line
            elif current_section == "工作流程" and line.startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.")):
                result["workflow"].append(re.sub(r"^\d+\.\s*", "", line))
            elif current_section == "输出" and line.startswith("- "):
                result["output"].append(line[2:].strip())

        return result

    def _load_skill_from_md(self, skill_id: str, md_path: Path, category: str) -> Skill:
        """从 SKILL.md 文件加载技能定义。"""
        if not md_path.exists():
            logger.warning(f"SKILL.md 不存在: {md_path}")
            return None

        content = md_path.read_text(encoding="utf-8")
        parsed = self._parse_skill_md(content)

        name = parsed.get("title", skill_id)
        description = parsed.get("description", "")
        workflow = parsed.get("workflow", [])
        output = parsed.get("output", [])

        return Skill(
            id=skill_id,
            name=name,
            description=description,
            category=category,
            workflow=workflow,
            output=output,
            skill_path=md_path,
            skill_md_content=content,
        )

    def register_all(self):
        """自动扫描并注册所有技能。"""
        self._skills.clear()
        self._modes.clear()

        # 估值技能
        dcf = self._load_skill_from_md(
            "dcf-valuation",
            SKILLS_DIR / "valuation" / "dcf" / "SKILL.md",
            "valuation"
        )
        if dcf:
            dcf.icon = "💰"
            dcf.estimated_duration = 15
            self.register_skill(dcf)

        pepb = self._load_skill_from_md(
            "pe-pb-valuation",
            SKILLS_DIR / "valuation" / "pe-pb" / "SKILL.md",
            "valuation"
        )
        if pepb:
            pepb.icon = "📊"
            pepb.estimated_duration = 10
            self.register_skill(pepb)

        # 风险技能
        pledge = self._load_skill_from_md(
            "pledge-risk",
            SKILLS_DIR / "risk" / "pledge" / "SKILL.md",
            "risk"
        )
        if pledge:
            pledge.icon = "⚠️"
            pledge.estimated_duration = 8
            self.register_skill(pledge)

        # 技术分析技能
        tech = self._load_skill_from_md(
            "technical-trend",
            SKILLS_DIR / "technical" / "trend" / "SKILL.md",
            "technical"
        )
        if tech:
            tech.icon = "📈"
            tech.estimated_duration = 12
            self.register_skill(tech)

        # 行业分析技能
        industry = self._load_skill_from_md(
            "industry-analysis",
            SKILLS_DIR / "industry" / "analysis" / "SKILL.md",
            "industry"
        )
        if industry:
            industry.icon = "🏭"
            industry.estimated_duration = 10
            self.register_skill(industry)

        # 新闻情绪技能
        news = self._load_skill_from_md(
            "news-sentiment",
            SKILLS_DIR / "news" / "sentiment" / "SKILL.md",
            "news"
        )
        if news:
            news.icon = "📰"
            news.estimated_duration = 8
            self.register_skill(news)

        # 资本运作技能
        capital = self._load_skill_from_md(
            "capital-operation",
            SKILLS_DIR / "capital" / "operation" / "SKILL.md",
            "capital"
        )
        if capital:
            capital.icon = "💼"
            capital.estimated_duration = 12
            self.register_skill(capital)

        # 财务健康技能
        financial = self._load_skill_from_md(
            "financial-health",
            SKILLS_DIR / "financial" / "health" / "SKILL.md",
            "financial"
        )
        if financial:
            financial.icon = "📋"
            financial.estimated_duration = 15
            self.register_skill(financial)

        # 报告技能
        report = Skill(
            id="full-report",
            name="完整分析报告",
            description="整合所有分析结果生成完整报告",
            category="report",
            icon="📄",
            estimated_duration=30,
            workflow=["整合所有分析结果", "生成可视化图表", "编写分析摘要"],
            output=["完整报告", "结构化数据"],
        )
        self.register_skill(report)

        # 注册分析模式
        self.register_mode(AnalysisMode(
            id="full-analysis",
            name="综合分析",
            description="包含所有分析组件的完整报告",
            icon="📊",
            skills=[
                "dcf-valuation", "pe-pb-valuation", "pledge-risk",
                "technical-trend", "industry-analysis",
                "news-sentiment", "capital-operation",
                "financial-health", "full-report",
            ],
            estimated_duration=120,
        ))

        logger.info(f"技能引擎初始化完成: {len(self._skills)} 个技能, {len(self._modes)} 个模式")

    def build_skill_prompt(self, skill_id: str, symbol: str, stock_data: dict) -> tuple[str, str]:
        """
        根据技能构建 LLM prompt。

        Returns:
            (system_prompt, user_prompt)
        """
        skill = self._skills.get(skill_id)
        if not skill:
            raise ValueError(f"技能不存在: {skill_id}")

        if skill.skill_md_content:
            system_prompt = self._build_prompt_from_md(skill, symbol, stock_data)
        else:
            system_prompt = self._build_prompt_default(skill, symbol, stock_data)

        user_prompt = f"请对股票 {symbol} 执行 {skill.name} 分析。返回结构化 JSON 结果。"

        return system_prompt, user_prompt

    def _build_prompt_from_md(self, skill: Skill, symbol: str, stock_data: dict) -> str:
        """基于 SKILL.md 内容构建 system prompt。"""
        company_name = stock_data.get("company_info", {}).get("股票简称", symbol)
        price = stock_data.get("latest_price", "未知")

        prompt_parts = [
            f"你是一位专业的A股分析师，请对 {symbol}（{company_name}）进行{skill.name}。",
            f"当前股价: {price}",
            "",
            "## 分析框架",
            skill.skill_md_content,
            "",
            "## 可用数据",
        ]

        # 注入相关数据
        if skill.category == "valuation":
            prompt_parts.append(f"- PE: {stock_data.get('valuation', {}).get('pe_ratio', 'N/A')}")
            prompt_parts.append(f"- PB: {stock_data.get('valuation', {}).get('pb_ratio', 'N/A')}")
            prompt_parts.append(f"- 市值: {stock_data.get('valuation', {}).get('market_cap', 'N/A')}")
            prompt_parts.append(f"- 行业PE: {stock_data.get('valuation', {}).get('industry_pe', 'N/A')}")

        elif skill.category == "risk":
            risk_data = stock_data.get("risk_indicators", {})
            prompt_parts.append(f"- 质押比例数据: {json.dumps(risk_data.get('pledge_ratio', []), ensure_ascii=False)}")
            prompt_parts.append(f"- 融资融券: {json.dumps(risk_data.get('margin_balance', []), ensure_ascii=False)}")

        elif skill.category == "technical":
            prompt_parts.append(f"- K线数据: {json.dumps(stock_data.get('kline_summary', {}), ensure_ascii=False)}")
            prompt_parts.append(f"- 技术指标: {json.dumps(stock_data.get('technical_indicators', {}), ensure_ascii=False)}")
            prompt_parts.append(f"- 大盘指数: {json.dumps(stock_data.get('market_index', {}), ensure_ascii=False)}")

        elif skill.category == "industry":
            prompt_parts.append(f"- 行业信息: {json.dumps(stock_data.get('industry_info', {}), ensure_ascii=False)}")
            prompt_parts.append(f"- 同行业公司: {json.dumps(stock_data.get('industry_peers', []), ensure_ascii=False)}")
            prompt_parts.append(f"- 行业趋势: {json.dumps(stock_data.get('industry_trend', []), ensure_ascii=False)}")

        elif skill.category == "news":
            prompt_parts.append(f"- 新闻列表: {json.dumps(stock_data.get('news', []), ensure_ascii=False)}")
            prompt_parts.append(f"- 情感分析: {json.dumps(stock_data.get('sentiment_summary', {}), ensure_ascii=False)}")
            prompt_parts.append(f"- 风险摘要: {json.dumps(stock_data.get('risk_summary', {}), ensure_ascii=False)}")

        elif skill.category == "capital":
            prompt_parts.append(f"- 分红数据: {json.dumps(stock_data.get('dividend_history', []), ensure_ascii=False)}")
            prompt_parts.append(f"- 增减持: {json.dumps(stock_data.get('insider_holdings', []), ensure_ascii=False)}")
            prompt_parts.append(f"- 回购数据: {json.dumps(stock_data.get('buyback', []), ensure_ascii=False)}")

        elif skill.category == "financial":
            prompt_parts.append(f"- 财务指标: {json.dumps(stock_data.get('financial_indicators', {}), ensure_ascii=False)}")
            prompt_parts.append(f"- 盈利预测: {json.dumps(stock_data.get('profit_forecast', []), ensure_ascii=False)}")
            prompt_parts.append(f"- 一致预期: {json.dumps(stock_data.get('consensus', {}), ensure_ascii=False)}")

        prompt_parts.extend([
            "",
            "## 输出要求",
            "必须返回纯 JSON（不要 markdown 代码块），包含以下字段：",
            "- summary: 分析摘要 (50字内)",
            "- score: 评分 (1-10)",
            "- key_findings: 关键发现列表 (3-5条)",
            "- recommendation: 建议 (买入/增持/持有/减持/卖出)",
            "- details: 详细分析 (200字内)",
        ])

        return "\n".join(prompt_parts)

    def _build_prompt_default(self, skill: Skill, symbol: str, stock_data: dict) -> str:
        """默认 prompt 构建。"""
        return f"请对 {symbol} 进行 {skill.name} 分析，返回结构化 JSON。"

    def execute_skill(self, skill_id: str, symbol: str, stock_data: dict) -> SkillResult:
        """执行单个技能，调用 LLM 进行分析。"""
        skill = self._skills.get(skill_id)
        if not skill:
            return SkillResult(skill_id=skill_id, status="failed", error=f"技能不存在: {skill_id}")

        if not self._llm_service:
            return SkillResult(skill_id=skill_id, status="failed", error="LLM服务未配置")

        result = SkillResult(skill_id=skill_id, status="running", progress=10)
        self._notify_progress([result])

        try:
            system_prompt, user_prompt = self.build_skill_prompt(skill_id, symbol, stock_data)

            result.progress = 30
            self._notify_progress([result])

            llm_result = self._llm_service.call_llm_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,
            )

            result.progress = 80
            result.data = llm_result
            result.status = "completed"
            result.progress = 100

        except Exception as e:
            logger.error(f"技能 {skill_id} 执行失败: {e}")
            result.status = "failed"
            result.error = str(e)

        self._notify_progress([result])
        return result

    def execute_mode(self, mode_id: str, symbol: str, stock_data: dict) -> list[SkillResult]:
        """执行分析模式（顺序执行多个技能）。"""
        mode = self._modes.get(mode_id)
        if not mode:
            raise ValueError(f"分析模式不存在: {mode_id}")

        logger.info(f"执行分析模式: {mode.name} ({', '.join(mode.skills)})")
        results: list[SkillResult] = []

        for skill_id in mode.skills:
            result = self.execute_skill(skill_id, symbol, stock_data)
            results.append(result)

            if result.status == "failed":
                logger.warning(f"技能 {skill_id} 失败，继续执行后续技能")

        return results


skill_engine = SkillEngine()
