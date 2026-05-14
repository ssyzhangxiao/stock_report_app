"""
测试脚本 - 验证报告服务功能

测试项目：
1. API连通性
2. 报告列表获取
3. 单份报告生成（HTML + PDF）
4. 图表转换成功率
5. 内容准确性
"""

import os
import sys
import time
import asyncio

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.md_parser import MarkdownParser
from app.services.chart_engine import process_all_tables, ChartRuleEngine
from app.services.html_renderer import HTMLRenderer
from app.services.pdf_renderer import PDFRenderer
from app.utils.helpers import setup_logger, get_research_dir

logger = setup_logger("test")


def test_parser():
    """测试Markdown解析器"""
    logger.info("=" * 50)
    logger.info("测试1: Markdown解析器")
    logger.info("=" * 50)

    research_dir = get_research_dir()
    test_files = []

    # 查找所有测试文件
    for item in os.listdir(research_dir):
        path = os.path.join(research_dir, item, "FULL_REPORT.md")
        if os.path.exists(path):
            test_files.append(path)

    if not test_files:
        logger.error("未找到测试文件")
        return False

    parser = MarkdownParser()
    success_count = 0

    # 最多测试3个文件
    for file_path in test_files[:3]:
        try:
            report = parser.parse_file(file_path)
            logger.info(f"✅ 解析成功: {report.title}")
            logger.info(f"   章节数: {len(report.sections)}")
            logger.info(f"   表格数: {len(report.all_tables)}")
            success_count += 1
        except Exception as e:
            logger.error(f"❌ 解析失败: {file_path}, 错误: {e}")

    # 只要有至少1个文件成功解析就算通过
    result = success_count > 0
    logger.info(f"解析测试: {success_count}/{min(len(test_files), 3)} 通过\n")
    return result


def test_chart_engine():
    """测试图表引擎"""
    logger.info("=" * 50)
    logger.info("测试2: 图表引擎")
    logger.info("=" * 50)

    research_dir = get_research_dir()
    test_files = []

    for item in os.listdir(research_dir):
        path = os.path.join(research_dir, item, "FULL_REPORT.md")
        if os.path.exists(path):
            test_files.append(path)

    parser = MarkdownParser()
    engine = ChartRuleEngine()

    total_tables = 0
    success_tables = 0
    failed_tables = 0

    # 最多测试5个文件
    for file_path in test_files[:5]:
        try:
            report = parser.parse_file(file_path)

            for table in report.all_tables:
                total_tables += 1
                engine.process_table(table)

                if table.conversion_status == "success":
                    success_tables += 1
                elif table.conversion_status == "failed":
                    failed_tables += 1

        except Exception as e:
            logger.error(f"处理失败: {file_path}, 错误: {e}")

    success_rate = (success_tables / total_tables * 100) if total_tables > 0 else 0

    logger.info(f"总表格数: {total_tables}")
    logger.info(f"成功转换: {success_tables}")
    logger.info(f"失败转换: {failed_tables}")
    logger.info(f"成功率: {success_rate:.1f}%")

    # 验收标准: 90%+
    passed = success_rate >= 90
    logger.info(f"图表转换测试: {'✅ 通过' if passed else '❌ 未通过'} (要求>=90%)\n")
    return passed


def test_html_renderer():
    """测试HTML渲染器"""
    logger.info("=" * 50)
    logger.info("测试3: HTML渲染器")
    logger.info("=" * 50)

    research_dir = get_research_dir()
    test_file = None

    for item in os.listdir(research_dir):
        path = os.path.join(research_dir, item, "FULL_REPORT.md")
        if os.path.exists(path):
            test_file = path
            break

    if not test_file:
        logger.error("未找到测试文件")
        return False

    try:
        parser = MarkdownParser()
        report = parser.parse_file(test_file)
        process_all_tables(report)

        renderer = HTMLRenderer()
        html = renderer.render(report)

        # 验证HTML内容
        checks = [
            ("包含标题", report.title in html),
            ("包含章节", len(report.sections) > 0 and report.sections[0].title in html),
            ("包含ECharts", "echarts" in html),
            ("包含SVG渲染", "renderer: 'svg'" in html or "renderer:'svg'" in html),
            (
                "有效HTML",
                html.startswith("<!DOCTYPE html>") or html.startswith("<html"),
            ),
        ]

        all_passed = True
        for name, passed in checks:
            status = "✅" if passed else "❌"
            logger.info(f"{status} {name}")
            if not passed:
                all_passed = False

        # 保存测试文件
        output_path = "/tmp/test_report.html"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        logger.info(f"测试HTML已保存: {output_path}")

        logger.info(f"HTML渲染测试: {'✅ 通过' if all_passed else '❌ 未通过'}\n")
        return all_passed

    except Exception as e:
        logger.error(f"HTML渲染测试失败: {e}")
        return False


async def test_pdf_renderer():
    """测试PDF渲染器"""
    logger.info("=" * 50)
    logger.info("测试4: PDF渲染器")
    logger.info("=" * 50)

    research_dir = get_research_dir()
    test_file = None

    for item in os.listdir(research_dir):
        path = os.path.join(research_dir, item, "FULL_REPORT.md")
        if os.path.exists(path):
            test_file = path
            break

    if not test_file:
        logger.error("未找到测试文件")
        return False

    try:
        parser = MarkdownParser()
        report = parser.parse_file(test_file)
        process_all_tables(report)

        renderer = PDFRenderer()
        output_path = "/tmp/test_report.pdf"

        start = time.time()
        await renderer.render(report, output_path)
        elapsed = time.time() - start

        # 验证文件
        exists = os.path.exists(output_path)
        size = os.path.getsize(output_path) if exists else 0

        logger.info(f"PDF生成时间: {elapsed:.2f}s")
        logger.info(f"PDF文件大小: {size / 1024:.1f} KB")
        logger.info(f"文件存在: {'✅' if exists else '❌'}")

        passed = exists and size > 1000  # 至少1KB
        logger.info(f"PDF渲染测试: {'✅ 通过' if passed else '❌ 未通过'}\n")
        return passed

    except Exception as e:
        logger.error(f"PDF渲染测试失败: {e}")
        return False


def test_content_accuracy():
    """测试内容准确性"""
    logger.info("=" * 50)
    logger.info("测试5: 内容准确性")
    logger.info("=" * 50)

    research_dir = get_research_dir()
    test_file = None

    for item in os.listdir(research_dir):
        path = os.path.join(research_dir, item, "FULL_REPORT.md")
        if os.path.exists(path):
            test_file = path
            break

    if not test_file:
        logger.error("未找到测试文件")
        return False

    try:
        # 读取原始内容
        with open(test_file, "r", encoding="utf-8") as f:
            original = f.read()

        # 解析
        parser = MarkdownParser()
        report = parser.parse_file(test_file)

        # 验证内容完整性
        checks = []

        # 检查标题
        if report.title:
            checks.append(("标题提取", report.title in original))

        # 检查章节
        for section in report.sections[:3]:
            checks.append((f"章节: {section.title}", section.title in original))

        # 检查表格
        for table in report.all_tables[:3]:
            # 检查表格内容是否保留（使用dataframe的columns）
            if table.dataframe is not None and len(table.dataframe.columns) > 0:
                header_text = "| " + " | ".join(table.dataframe.columns) + " |"
                checks.append(("表格头保留", header_text in original))

        all_passed = True
        passed_count = 0
        for name, passed in checks:
            status = "✅" if passed else "❌"
            logger.info(f"{status} {name}")
            if passed:
                passed_count += 1
            else:
                all_passed = False

        accuracy = (passed_count / len(checks) * 100) if checks else 0
        logger.info(f"内容准确性: {accuracy:.1f}% ({passed_count}/{len(checks)})")
        logger.info(f"内容准确性测试: {'✅ 通过' if all_passed else '❌ 未通过'}\n")
        return all_passed

    except Exception as e:
        logger.error(f"内容准确性测试失败: {e}")
        return False


async def run_all_tests():
    """运行所有测试"""
    logger.info("\n" + "=" * 60)
    logger.info("开始 Report Service 功能测试")
    logger.info("=" * 60 + "\n")

    results = {}

    # 测试1: 解析器
    results["parser"] = test_parser()

    # 测试2: 图表引擎
    results["chart_engine"] = test_chart_engine()

    # 测试3: HTML渲染
    results["html_renderer"] = test_html_renderer()

    # 测试4: PDF渲染
    results["pdf_renderer"] = await test_pdf_renderer()

    # 测试5: 内容准确性
    results["content_accuracy"] = test_content_accuracy()

    # 汇总
    logger.info("=" * 60)
    logger.info("测试汇总")
    logger.info("=" * 60)

    for name, passed in results.items():
        status = "✅ 通过" if passed else "❌ 失败"
        logger.info(f"{status}: {name}")

    total = len(results)
    passed = sum(1 for v in results.values() if v)
    logger.info(f"\n总计: {passed}/{total} 通过")

    if passed == total:
        logger.info("🎉 所有测试通过!")
    else:
        logger.warning("⚠️ 部分测试未通过，请检查日志")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
