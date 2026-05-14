"""
HTML渲染器 - Jinja2模板引擎

功能：
- 使用Jinja2渲染HTML报告
- 支持Markdown到HTML转换
- 提供打印优化样式
"""

import os
import re
import json
import markdown
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.services.md_parser import ReportData
from app.utils.helpers import setup_logger

logger = setup_logger("html_renderer")


class HTMLRenderer:
    """
    HTML报告渲染器
    """

    def __init__(self, template_dir: str = None):
        """
        初始化渲染器

        Args:
            template_dir: 模板目录路径，默认使用内置模板
        """
        if template_dir is None:
            template_dir = os.path.join(os.path.dirname(__file__), "../templates")

        self.template_dir = Path(template_dir)
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )

        # 注册自定义过滤器
        self.env.filters["markdown_to_html"] = self._markdown_to_html_filter
        self.env.filters["tojson"] = self._tojson_filter

        # Markdown转换器
        self.md = markdown.Markdown(
            extensions=["tables", "fenced_code", "toc", "nl2br", "sane_lists"]
        )

        logger.info(f"HTML渲染器初始化完成，模板目录: {self.template_dir}")

    def render(
        self, report_data: ReportData, template_name: str = "report.html"
    ) -> str:
        """
        渲染报告为HTML

        Args:
            report_data: 报告数据
            template_name: 模板文件名

        Returns:
            HTML字符串
        """
        try:
            template = self.env.get_template(template_name)

            # 准备模板上下文
            context = self._prepare_context(report_data)

            html = template.render(**context)
            logger.info(f"报告渲染完成: {report_data.title}")
            return html

        except Exception as e:
            logger.error(f"HTML渲染失败: {e}")
            raise

    def _prepare_context(self, report_data: ReportData) -> Dict[str, Any]:
        sections = []

        for section in report_data.sections:
            processed_tables = []
            for table in section.tables:
                table_dict = {
                    "chart_spec": table.chart_spec,
                    "chart_spec_json": json.dumps(
                        table.chart_spec, ensure_ascii=False, default=str
                    )
                    if table.chart_spec
                    else None,
                    "conversion_status": table.conversion_status,
                    "error_message": table.error_message,
                    "raw_markdown": table.raw_markdown,
                }
                processed_tables.append(table_dict)

            section_dict = {
                "title": section.title,
                "level": section.level,
                "html_content": self._markdown_to_html(section.content),
                "tables": processed_tables,
                "raw_content": section.content,
            }
            sections.append(section_dict)

        return {
            "title": report_data.title,
            "stock_code": report_data.stock_code,
            "stock_name": report_data.stock_name,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "sections": sections,
            "raw_content": report_data.raw_content,
        }

    def _markdown_to_html(self, text: str) -> str:
        """
        将Markdown转换为HTML

        Args:
            text: Markdown文本

        Returns:
            HTML字符串
        """
        if not text:
            return ""

        # 重置Markdown实例
        self.md.reset()

        # 转换Markdown为HTML
        html = self.md.convert(text)

        # 清理表格样式
        html = html.replace("<table>", '<table class="markdown-table">')

        return html

    def _markdown_to_html_filter(self, text: str) -> str:
        """
        Jinja2过滤器：Markdown转HTML
        """
        return self._markdown_to_html(text)

    def _tojson_filter(self, obj: Any) -> str:
        """
        Jinja2过滤器：对象转JSON字符串
        """
        import json

        return json.dumps(obj, ensure_ascii=False, default=str)

    def render_to_file(
        self,
        report_data: ReportData,
        output_path: str,
        template_name: str = "report.html",
    ) -> str:
        """
        渲染报告并保存到文件

        Args:
            report_data: 报告数据
            output_path: 输出文件路径
            template_name: 模板文件名

        Returns:
            输出文件路径
        """
        html = self.render(report_data, template_name)

        # 确保目录存在
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)

        logger.info(f"HTML报告已保存: {output_path}")
        return output_path


def render_report(report_data: ReportData, output_dir: str) -> str:
    """
    渲染完整报告（HTML）

    Args:
        report_data: 报告数据
        output_dir: 输出目录

    Returns:
        HTML文件路径
    """
    renderer = HTMLRenderer()

    # 生成文件名
    safe_title = re.sub(r"[^\w\u4e00-\u9fff-]", "_", report_data.title)
    filename = f"{safe_title}_{report_data.stock_code}.html"
    output_path = os.path.join(output_dir, filename)

    return renderer.render_to_file(report_data, output_path)


if __name__ == "__main__":
    from app.services.md_parser import MarkdownParser
    from app.services.chart_engine import process_all_tables

    test_file = "/Users/mac/projects/stock-research-agent/RESEARCH/STOCK_600519_贵州茅台/FULL_REPORT.md"

    # 解析
    parser = MarkdownParser()
    report = parser.parse_file(test_file)

    # 转换图表
    process_all_tables(report)

    # 渲染HTML
    renderer = HTMLRenderer()
    html = renderer.render(report)

    output_path = "/tmp/test_report.html"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ HTML报告已生成: {output_path}")
