import os
import re
import json
import logging
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)

RESEARCH_BASE_DIR = os.getenv(
    "RESEARCH_BASE_DIR",
    "/Users/luojiutian/projects/stock-research-agent/RESEARCH"
)


@dataclass
class TableData:
    headers: list[str] = field(default_factory=list)
    rows: list[list[str]] = field(default_factory=list)


@dataclass
class SectionData:
    title: str = ""
    level: int = 0
    content: str = ""
    tables: list[TableData] = field(default_factory=list)
    subsections: list["SectionData"] = field(default_factory=list)


@dataclass
class ResearchReportMeta:
    stock_code: str = ""
    stock_name: str = ""
    stock_name_en: str = ""
    signal_rating: str = ""
    moat_score: str = ""
    current_pe: str = ""
    report_date: str = ""
    directory: str = ""


@dataclass
class ResearchReport:
    meta: ResearchReportMeta = field(default_factory=ResearchReportMeta)
    executive_summary: SectionData = field(default_factory=SectionData)
    business_foundation: SectionData = field(default_factory=SectionData)
    industry_analysis: SectionData = field(default_factory=SectionData)
    business_breakdown: SectionData = field(default_factory=SectionData)
    financial_quality: SectionData = field(default_factory=SectionData)
    governance_analysis: SectionData = field(default_factory=SectionData)
    market_sentiment: SectionData = field(default_factory=SectionData)
    valuation_moat: SectionData = field(default_factory=SectionData)
    financial_data: dict = field(default_factory=dict)
    risk_monitoring: SectionData = field(default_factory=SectionData)
    valuation_history: SectionData = field(default_factory=SectionData)
    product_lines: SectionData = field(default_factory=SectionData)
    raw_files: dict = field(default_factory=dict)


def parse_markdown_table(text: str) -> list[TableData]:
    tables = []
    lines = text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if "|" in line and line.startswith("|"):
            table_lines = []
            while i < len(lines) and "|" in lines[i].strip() and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            if len(table_lines) >= 2:
                headers = [cell.strip() for cell in table_lines[0].split("|")[1:-1]]
                rows = []
                for tl in table_lines[2:]:
                    row = [cell.strip() for cell in tl.split("|")[1:-1]]
                    if len(row) == len(headers):
                        rows.append(row)
                if headers and rows:
                    tables.append(TableData(headers=headers, rows=rows))
        else:
            i += 1
    return tables


def parse_sections(text: str) -> list[SectionData]:
    sections = []
    lines = text.split("\n")
    current_section = None
    current_lines = []

    for line in lines:
        header_match = re.match(r"^(#{1,4})\s+(.+)$", line)
        if header_match:
            if current_section is not None:
                content = "\n".join(current_lines)
                current_section.content = content
                current_section.tables = parse_markdown_table(content)
                sections.append(current_section)
            level = len(header_match.group(1))
            title = header_match.group(2).strip()
            current_section = SectionData(title=title, level=level)
            current_lines = []
        else:
            current_lines.append(line)

    if current_section is not None:
        content = "\n".join(current_lines)
        current_section.content = content
        current_section.tables = parse_markdown_table(content)
        sections.append(current_section)

    return sections


def extract_signal_rating(text: str) -> str:
    patterns = [
        r"🟡🟡🟡\s*(.+?)(?:\n|$)",
        r"🟢🟢🟢\s*(.+?)(?:\n|$)",
        r"🔴🔴🔴\s*(.+?)(?:\n|$)",
        r"信号评级[：:]\s*(.+?)(?:\n|$)",
        r"核心评级[：:]\s*(.+?)(?:\n|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    return ""


def extract_moat_score(text: str) -> str:
    match = re.search(r"护城河[：:]*\s*.*?(\d+/10|宽护城河|窄护城河|无护城河)", text)
    if match:
        return match.group(1)
    match = re.search(r"综合.*?(\d+/10)", text)
    if match:
        return match.group(1)
    return ""


def extract_current_pe(text: str) -> str:
    match = re.search(r"PE[^a-zA-Z]*?~?(\d+\.?\d*)x?", text)
    if match:
        return match.group(1)
    return ""


def parse_stock_dir_name(dir_name: str) -> tuple[str, str, str]:
    parts = dir_name.replace("STOCK_", "").split("_", 1)
    stock_code = parts[0] if parts else ""
    rest = parts[1] if len(parts) > 1 else ""
    name_parts = rest.split("_")
    stock_name_en = ""
    stock_name = ""
    for i, p in enumerate(name_parts):
        if re.match(r"^[A-Z]", p):
            stock_name_en = "_".join(name_parts[i:])
            break
    return stock_code, stock_name, stock_name_en


def read_md_file(filepath: str) -> str:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.warning(f"Failed to read {filepath}: {e}")
        return ""


def list_research_reports() -> list[ResearchReportMeta]:
    reports = []
    research_path = Path(RESEARCH_BASE_DIR)
    if not research_path.exists():
        logger.warning(f"Research base dir not found: {RESEARCH_BASE_DIR}")
        return reports

    for item in sorted(research_path.iterdir()):
        if not item.is_dir():
            continue
        if not item.name.startswith("STOCK_"):
            continue

        stock_code, stock_name, stock_name_en = parse_stock_dir_name(item.name)
        readme_path = item / "README.md"
        exec_summary_path = item / "00_Executive_Summary.md"

        signal_rating = ""
        moat_score = ""
        current_pe = ""
        report_date = ""

        exec_content = read_md_file(str(exec_summary_path))
        if exec_content:
            signal_rating = extract_signal_rating(exec_content)
            moat_score = extract_moat_score(exec_content)
            current_pe = extract_current_pe(exec_content)
            date_match = re.search(r"研究日期[：:]\s*(.+?)[|｜\n]", exec_content)
            if date_match:
                report_date = date_match.group(1).strip()

        readme_content = read_md_file(str(readme_path))
        if readme_content and not stock_name:
            name_match = re.search(r"(\S+)\（\d+\.\w+\）", readme_content)
            if name_match:
                stock_name = name_match.group(1)

        meta = ResearchReportMeta(
            stock_code=stock_code,
            stock_name=stock_name,
            stock_name_en=stock_name_en,
            signal_rating=signal_rating,
            moat_score=moat_score,
            current_pe=current_pe,
            report_date=report_date,
            directory=item.name,
        )
        reports.append(meta)

    return reports


def load_research_report(directory: str) -> Optional[ResearchReport]:
    report_path = Path(RESEARCH_BASE_DIR) / directory
    if not report_path.exists():
        logger.warning(f"Report directory not found: {directory}")
        return None

    stock_code, stock_name, stock_name_en = parse_stock_dir_name(directory)
    meta = ResearchReportMeta(
        stock_code=stock_code,
        stock_name=stock_name,
        stock_name_en=stock_name_en,
        directory=directory,
    )

    report = ResearchReport(meta=meta)

    section_files = {
        "executive_summary": "00_Executive_Summary.md",
        "business_foundation": "01_Business_Foundation.md",
        "industry_analysis": "02_Industry_Analysis.md",
        "business_breakdown": "03_Business_Breakdown.md",
        "financial_quality": "04_Financial_Quality.md",
        "governance_analysis": "05_Governance_Analysis.md",
        "market_sentiment": "06_Market_Sentiment.md",
        "valuation_moat": "07_Valuation_Moat.md",
    }

    for attr, filename in section_files.items():
        filepath = report_path / filename
        content = read_md_file(str(filepath))
        if content:
            sections = parse_sections(content)
            main_section = SectionData(
                title=filename.replace(".md", "").replace("_", " "),
                level=1,
                content=content,
                tables=parse_markdown_table(content),
                subsections=sections,
            )
            setattr(report, attr, main_section)
            report.raw_files[filename] = content

    sub_dir_files = {
        "financial_data": {
            "key_metrics": "Financial_Data/key_metrics_table.md",
            "cashflow": "Financial_Data/cashflow_analysis.md",
            "peer_comparison": "Financial_Data/peer_comparison.md",
        },
        "risk_monitoring_file": "Risk_Monitoring/bear_case.md",
        "valuation_history_file": "Valuation/historical_multiples.md",
        "product_lines_file": "Product_Lines/01_Product_Lines_Research_Framework.md",
    }

    for key, val in sub_dir_files.items():
        if isinstance(val, dict):
            for sub_key, sub_path in val.items():
                filepath = report_path / sub_path
                content = read_md_file(str(filepath))
                if content:
                    report.financial_data[sub_key] = {
                        "content": content,
                        "tables": [asdict(t) for t in parse_markdown_table(content)],
                        "sections": [asdict(s) for s in parse_sections(content)],
                    }
                    report.raw_files[sub_path] = content
        else:
            filepath = report_path / val
            content = read_md_file(str(filepath))
            if content:
                sections = parse_sections(content)
                section_data = SectionData(
                    title=val.split("/")[-1].replace(".md", ""),
                    level=1,
                    content=content,
                    tables=parse_markdown_table(content),
                    subsections=sections,
                )
                attr_name = key.replace("_file", "")
                if attr_name == "risk_monitoring":
                    report.risk_monitoring = section_data
                elif attr_name == "valuation_history":
                    report.valuation_history = section_data
                elif attr_name == "product_lines":
                    report.product_lines = section_data
                report.raw_files[val] = content

    exec_content = report.raw_files.get("00_Executive_Summary.md", "")
    if exec_content:
        meta.signal_rating = extract_signal_rating(exec_content)
        meta.moat_score = extract_moat_score(exec_content)
        meta.current_pe = extract_current_pe(exec_content)
        date_match = re.search(r"研究日期[：:]\s*(.+?)[|｜\n]", exec_content)
        if date_match:
            meta.report_date = date_match.group(1).strip()

    readme_content = read_md_file(str(report_path / "README.md"))
    if readme_content and not meta.stock_name:
        name_match = re.search(r"(\S+)\（\d+\.\w+\）", readme_content)
        if name_match:
            meta.stock_name = name_match.group(1)

    return report


def search_research_reports(query: str) -> list[ResearchReportMeta]:
    all_reports = list_research_reports()
    query_lower = query.lower()
    results = []
    for r in all_reports:
        if (
            query_lower in r.stock_code.lower()
            or query_lower in r.stock_name.lower()
            or query_lower in r.stock_name_en.lower()
            or query_lower in r.directory.lower()
        ):
            results.append(r)
    return results
