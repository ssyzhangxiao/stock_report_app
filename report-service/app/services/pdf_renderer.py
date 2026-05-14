"""
PDF渲染器 - Playwright + A4打印优化

功能：
- 使用Playwright渲染HTML并生成PDF
- A4尺寸，2cm边距
- 自动生成页码和书签
- 添加水印
"""

import asyncio
from pathlib import Path
from typing import Dict, Any, List

from playwright.async_api import async_playwright

from app.services.html_renderer import HTMLRenderer
from app.services.md_parser import ReportData
from app.utils.helpers import setup_logger

logger = setup_logger("pdf_renderer")


class PDFRenderer:
    """
    PDF报告渲染器
    """

    def __init__(self):
        self.html_renderer = HTMLRenderer()
        logger.info("PDF渲染器初始化完成")

    async def render(self, report_data: ReportData, output_path: str) -> str:
        """
        渲染报告为PDF

        Args:
            report_data: 报告数据
            output_path: 输出PDF路径

        Returns:
            PDF文件路径
        """
        try:
            # 1. 先生成HTML
            html_content = self.html_renderer.render(report_data)

            # 2. 使用Playwright生成PDF
            pdf_path = await self._generate_pdf(html_content, output_path, report_data)

            logger.info(f"PDF报告生成完成: {pdf_path}")
            return pdf_path

        except Exception as e:
            logger.error(f"PDF渲染失败: {e}")
            raise

    async def _generate_pdf(
        self, html_content: str, output_path: str, report_data: ReportData
    ) -> str:
        """
        使用Playwright生成PDF

        Args:
            html_content: HTML内容
            output_path: 输出路径
            report_data: 报告数据（用于书签）

        Returns:
            PDF文件路径
        """
        # 确保目录存在
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # 加载HTML内容
            await page.set_content(html_content, wait_until="networkidle")

            # 等待图表渲染完成
            await page.wait_for_timeout(2000)

            # PDF生成选项
            pdf_options = {
                "path": output_path,
                "format": "A4",
                "margin": {
                    "top": "2cm",
                    "right": "2cm",
                    "bottom": "2cm",
                    "left": "2cm",
                },
                "print_background": True,
                "display_header_footer": True,
                "header_template": self._get_header_template(report_data),
                "footer_template": self._get_footer_template(),
                "prefer_css_page_size": True,
            }

            await page.pdf(**pdf_options)
            await browser.close()

        return output_path

    def _generate_bookmarks(self, report_data: ReportData) -> List[Dict[str, Any]]:
        """
        生成PDF书签（大纲）

        Args:
            report_data: 报告数据

        Returns:
            书签列表
        """
        bookmarks = []

        for i, section in enumerate(report_data.sections):
            bookmark = {
                "title": section.title,
                "page": i + 1,  # 估算页码
            }

            # 如果有子章节
            if hasattr(section, "subsections") and section.subsections:
                bookmark["children"] = []
                for _, sub in enumerate(section.subsections):
                    bookmark["children"].append({"title": sub.title, "page": i + 1})

            bookmarks.append(bookmark)

        return bookmarks

    def _get_header_template(self, report_data: ReportData) -> str:
        """
        获取PDF页眉模板

        Args:
            report_data: 报告数据

        Returns:
            HTML页眉模板
        """
        title = (
            report_data.title[:30] + "..."
            if len(report_data.title) > 30
            else report_data.title
        )

        return f"""
        <div style="font-size: 9px; width: 100%; padding: 0 1cm; margin-top: 0.5cm;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #666;">{title}</span>
                <span style="color: #999;">股票代码: {report_data.stock_code}</span>
            </div>
            <div style="border-bottom: 0.5px solid #ddd; margin-top: 0.3cm;"></div>
        </div>
        """

    def _get_footer_template(self) -> str:
        """
        获取PDF页脚模板（含页码）

        Returns:
            HTML页脚模板
        """
        return """
        <div style="font-size: 9px; width: 100%; padding: 0 1cm; margin-bottom: 0.5cm;">
            <div style="border-top: 0.5px solid #ddd; margin-bottom: 0.3cm;"></div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #999;">内部资料，仅供参考</span>
                <span style="color: #666;"><span class="pageNumber"></span> / <span class="totalPages"></span></span>
            </div>
        </div>
        """

    async def render_from_html(self, html_path: str, output_path: str) -> str:
        """
        从HTML文件生成PDF

        Args:
            html_path: HTML文件路径
            output_path: 输出PDF路径

        Returns:
            PDF文件路径
        """
        # 确保目录存在
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # 加载HTML文件
            await page.goto(f"file://{html_path}", wait_until="networkidle")

            # 等待图表渲染
            await page.wait_for_timeout(2000)

            # 生成PDF
            await page.pdf(
                path=output_path,
                format="A4",
                margin={"top": "2cm", "right": "2cm", "bottom": "2cm", "left": "2cm"},
                print_background=True,
                display_header_footer=True,
                header_template="<div></div>",
                footer_template=self._get_footer_template(),
                prefer_css_page_size=True,
            )

            await browser.close()

        logger.info(f"PDF已从HTML生成: {output_path}")
        return output_path


def render_pdf_sync(report_data: ReportData, output_path: str) -> str:
    """
    同步渲染PDF（便捷函数）

    Args:
        report_data: 报告数据
        output_path: 输出路径

    Returns:
        PDF文件路径
    """
    renderer = PDFRenderer()
    return asyncio.run(renderer.render(report_data, output_path))


if __name__ == "__main__":
    from app.services.md_parser import MarkdownParser
    from app.services.chart_engine import process_all_tables

    async def test():
        test_file = "/Users/mac/projects/stock-research-agent/RESEARCH/STOCK_600519_贵州茅台/FULL_REPORT.md"

        # 解析
        parser = MarkdownParser()
        report = parser.parse_file(test_file)

        # 转换图表
        process_all_tables(report)

        # 生成PDF
        renderer = PDFRenderer()
        output_path = "/tmp/test_report.pdf"
        await renderer.render(report, output_path)

        print(f"✅ PDF报告已生成: {output_path}")

    asyncio.run(test())
