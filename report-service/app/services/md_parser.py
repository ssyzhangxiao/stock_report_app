"""
Markdown 解析器 - 只读模式
负责解析 FULL_REPORT.md 为结构化数据

核心约束：
- 100% 只读，不修改原文
- 精确提取 H2/H3 章节结构
- 完整提取表格数据
- 识别元注释 <!-- chart: type, title, xcol, ycols -->
"""

import re
from pathlib import Path
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
import pandas as pd

from app.utils.helpers import setup_logger

logger = setup_logger("md_parser")


@dataclass
class TableData:
    """表格数据结构"""

    line_number: int
    raw_markdown: str
    dataframe: pd.DataFrame
    chart_config: Optional[Dict[str, Any]] = None
    chart_spec: Optional[Dict[str, Any]] = None
    conversion_status: str = "pending"
    error_message: Optional[str] = None


@dataclass
class SectionData:
    """章节数据结构"""

    title: str
    level: int
    content: str
    tables: List[TableData] = field(default_factory=list)


@dataclass
class ReportData:
    """报告完整数据结构"""

    title: str
    stock_code: str
    stock_name: str
    sections: List[SectionData] = field(default_factory=list)
    all_tables: List[TableData] = field(default_factory=list)
    raw_content: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


class MarkdownParser:
    """
    Markdown 解析器

    核心原则：
    - 只读取，不修改原文
    - 精确提取章节结构和表格
    - 识别元注释 <!-- chart: ... -->
    """

    def parse_file(self, file_path: str) -> ReportData:
        """
        解析 Markdown 文件

        Args:
            file_path: Markdown 文件路径

        Returns:
            ReportData 结构化数据
        """
        logger.info(f"开始解析文件: {file_path}")

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        if not content:
            raise ValueError(f"文件内容为空: {file_path}")

        title = self._extract_title(content)
        stock_info = self._extract_stock_info(content)

        report_data = ReportData(
            title=title,
            stock_code=stock_info.get("code", ""),
            stock_name=stock_info.get("name", ""),
            raw_content=content,
        )

        sections = self._parse_sections(content)
        report_data.sections = sections

        for section in sections:
            report_data.all_tables.extend(section.tables)

        logger.info(
            f"解析完成: {len(sections)}个章节, {len(report_data.all_tables)}个表格"
        )

        return report_data

    def _extract_title(self, content: str) -> str:
        """提取报告标题（第一个H1）"""
        match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if match:
            return match.group(1).strip()
        return "未命名报告"

    def _extract_stock_info(self, content: str) -> Dict[str, str]:
        """从标题或元数据中提取股票信息"""
        info = {"code": "", "name": ""}

        title_match = re.search(r"(.+?)\s*\((\d+\.\w+)\)", content[:500])
        if title_match:
            info["name"] = title_match.group(1).strip()
            info["code"] = title_match.group(2).strip()

        return info

    def _parse_sections(self, content: str) -> List[SectionData]:
        """
        按章节分割内容，精确提取 H2/H3 层级
        """
        sections = []
        lines = content.split("\n")

        current_section = None
        current_content_lines = []
        current_tables = []
        pending_chart_config = None
        i = 0

        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            # 检测元注释
            if stripped.startswith("<!-- chart:"):
                pending_chart_config = self._parse_chart_annotation(stripped)
                i += 1
                continue

            # 检测 H2 标题
            h2_match = re.match(r"^##\s+(.+)$", stripped)
            if h2_match:
                if current_section is not None:
                    current_section.content = "\n".join(current_content_lines)
                    sections.append(current_section)

                title_text = h2_match.group(1).strip()
                current_section = SectionData(
                    title=title_text, level=2, content="", tables=[]
                )
                current_content_lines = [line]
                current_tables = []
                i += 1
                continue

            # 检测 H3 标题
            h3_match = re.match(r"^###\s+(.+)$", stripped)
            if h3_match:
                if current_section is not None:
                    current_content_lines.append(line)
                i += 1
                continue

            # 检测表格
            if stripped.startswith("|"):
                table_lines = []
                table_start_line = i + 1

                while i < len(lines) and self._is_table_row(lines[i]):
                    table_lines.append(lines[i])
                    i += 1

                if len(table_lines) >= 2:
                    try:
                        df = self._parse_markdown_table_to_df(table_lines)
                        raw_md = "\n".join(table_lines)

                        table_data = TableData(
                            line_number=table_start_line,
                            raw_markdown=raw_md,
                            dataframe=df,
                            chart_config=pending_chart_config,
                        )

                        current_tables.append(table_data)
                        if current_section is not None:
                            current_section.tables.append(table_data)

                        pending_chart_config = None
                    except Exception as e:
                        logger.warning(f"表格解析失败 (行{table_start_line}): {e}")
                continue

            # 普通内容行
            if current_section is not None:
                current_content_lines.append(line)
            i += 1

        # 处理最后一个章节
        if current_section is not None:
            current_section.content = "\n".join(current_content_lines)
            sections.append(current_section)

        return sections

    def _is_table_row(self, line: str) -> bool:
        """判断是否为表格行"""
        stripped = line.strip()
        return stripped.startswith("|") and "|" in stripped[1:]

    def _parse_chart_annotation(self, annotation: str) -> Optional[Dict[str, Any]]:
        """
        解析元注释

        支持格式：
        <!-- chart: type=line, title="营收趋势", xcol=年份, ycols=[营收,利润] -->
        <!-- chart: type=radar, title="竞争力对比", dimensions=[指标1,指标2] -->
        <!-- chart: type=stacked_bar, title="产品结构", xcol=年份, ycols=[A,B,C], stack=true -->
        <!-- chart: type=timeline, title="发展历程", xfield=年份, yfield=事件 -->
        <!-- chart: type=heatmap, title="相关性矩阵", xlabels=列名, ylabels=行名 -->

        Returns:
            配置字典
        """
        try:
            match = re.search(r"<!--\s*chart:\s*(.*?)\s*-->", annotation, re.DOTALL)
            if not match:
                return None

            content = match.group(1).strip()
            config = {}

            # 提取 type（第一个键值对或第一个单词）
            type_match = re.match(r"type\s*=\s*(\w+)", content)
            if type_match:
                config["type"] = type_match.group(1).strip()
                remaining = content[type_match.end() :]
            else:
                parts = content.split(",", 1)
                config["type"] = parts[0].strip()
                remaining = parts[1] if len(parts) > 1 else ""

            # 提取 title
            title_match = re.search(r'title\s*=\s*"([^"]*)"', remaining)
            if title_match:
                config["title"] = title_match.group(1)

            # 提取 xcol
            xcol_match = re.search(r"xcol\s*=\s*(\w+)", remaining)
            if xcol_match:
                config["xcol"] = xcol_match.group(1)

            # 提取 ycols（数组格式）
            ycols_match = re.search(r"ycols\s*=\s*\[([^\]]*)\]", remaining)
            if ycols_match:
                ycols_str = ycols_match.group(1)
                config["ycols"] = [
                    x.strip().strip('"').strip("'") for x in ycols_str.split(",")
                ]

            # 提取 ycol（单列）
            ycol_match = re.search(r"ycol\s*=\s*(\w+)", remaining)
            if ycol_match:
                config["ycol"] = ycol_match.group(1)

            # 提取 dimensions
            dim_match = re.search(r"dimensions\s*=\s*\[([^\]]*)\]", remaining)
            if dim_match:
                config["dimensions"] = [
                    x.strip().strip('"').strip("'")
                    for x in dim_match.group(1).split(",")
                ]

            # 提取 indicator
            ind_match = re.search(r"indicator\s*=\s*(\w+)", remaining)
            if ind_match:
                config["indicator"] = ind_match.group(1)

            # 提取 stack
            stack_match = re.search(
                r"stack\s*=\s*(true|false)", remaining, re.IGNORECASE
            )
            if stack_match:
                config["stack"] = stack_match.group(1).lower() == "true"

            # 提取 xfield
            xfield_match = re.search(r"xfield\s*=\s*(\w+)", remaining)
            if xfield_match:
                config["xfield"] = xfield_match.group(1)

            # 提取 yfield
            yfield_match = re.search(r"yfield\s*=\s*(\w+)", remaining)
            if yfield_match:
                config["yfield"] = yfield_match.group(1)

            # 提取 xlabels
            xlabels_match = re.search(r"xlabels\s*=\s*\[([^\]]*)\]", remaining)
            if xlabels_match:
                config["xlabels"] = [
                    x.strip().strip('"').strip("'")
                    for x in xlabels_match.group(1).split(",")
                ]

            # 提取 ylabels
            ylabels_match = re.search(r"ylabels\s*=\s*\[([^\]]*)\]", remaining)
            if ylabels_match:
                config["ylabels"] = [
                    x.strip().strip('"').strip("'")
                    for x in ylabels_match.group(1).split(",")
                ]

            return config

        except Exception as e:
            logger.warning(f"元注释解析失败: {annotation}, 错误: {e}")
            return None

    def _parse_markdown_table_to_df(self, table_lines: List[str]) -> pd.DataFrame:
        """
        将 Markdown 表格行解析为 pandas DataFrame
        """
        if len(table_lines) < 2:
            raise ValueError("表格行数不足")

        header_line = table_lines[0]
        data_lines = table_lines[2:] if len(table_lines) > 2 else []

        headers = [h.strip() for h in header_line.split("|")[1:-1]]

        rows = []
        for line in data_lines:
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if len(cells) == len(headers):
                rows.append(cells)

        df = pd.DataFrame(rows, columns=headers)

        # 尝试转换数值列
        for col in df.columns:
            try:
                cleaned = (
                    df[col]
                    .astype(str)
                    .str.replace("%", "")
                    .str.replace(",", "")
                    .str.replace("亿", "")
                    .str.replace("万", "")
                    .str.replace("x", "")
                    .str.replace("元", "")
                )
                numeric = pd.to_numeric(cleaned, errors="coerce")
                if numeric.notna().sum() > 0:
                    df[col] = numeric
            except Exception:
                pass

        return df


if __name__ == "__main__":
    import sys

    test_file = "/Users/mac/projects/stock-research-agent/RESEARCH/STOCK_600519_贵州茅台/FULL_REPORT.md"

    parser = MarkdownParser()
    try:
        report = parser.parse_file(test_file)
        print("✅ 解析成功!")
        print(f"标题: {report.title}")
        print(f"股票代码: {report.stock_code}")
        print(f"章节数: {len(report.sections)}")
        print(f"表格数: {len(report.all_tables)}")

        for i, section in enumerate(report.sections[:5]):
            print(f"\n章节 {i + 1}: {section.title} (H{section.level})")
            print(f"  表格数: {len(section.tables)}")
            for t in section.tables[:2]:
                print(f"    表格(行{t.line_number}): {t.dataframe.shape}")
                if t.chart_config:
                    print(f"    图表配置: {t.chart_config}")

    except FileNotFoundError:
        print(f"❌ 文件不存在: {test_file}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 解析失败: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
