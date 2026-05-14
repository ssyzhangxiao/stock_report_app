"""
批量生成脚本

功能：
- 并发生成所有报告
- 最大并发数限制为3
- 性能统计
"""

import asyncio
import time
from typing import List, Dict

import httpx

from app.utils.helpers import setup_logger

logger = setup_logger("batch_generate")

# API基础URL
BASE_URL = "http://localhost:8001/api/v1"

# 最大并发数
MAX_CONCURRENT = 3


async def get_report_list() -> List[Dict]:
    """
    获取报告列表

    Returns:
        报告列表
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/reports")
        response.raise_for_status()
        return response.json()


async def generate_report(code: str, output_format: str = "both") -> Dict:
    """
    生成单个报告

    Args:
        code: 报告代码
        output_format: 输出格式

    Returns:
        生成结果
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/render/{code}",
            json={"force": False, "output_format": output_format},
        )
        response.raise_for_status()
        return response.json()


async def generate_all_reports(output_format: str = "both") -> Dict:
    """
    生成所有报告（带并发控制）

    Args:
        output_format: 输出格式

    Returns:
        批量生成统计
    """
    start_time = time.time()

    # 获取报告列表
    logger.info("获取报告列表...")
    reports = await get_report_list()
    total = len(reports)

    logger.info(f"发现 {total} 份报告，开始批量生成（最大并发: {MAX_CONCURRENT}）...")

    # 使用信号量控制并发
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def generate_with_limit(report: Dict) -> Dict:
        async with semaphore:
            code = report["code"]
            try:
                logger.info(f"开始生成: {code}")
                result = await generate_report(code, output_format)
                logger.info(
                    f"生成完成: {code} ({result.get('generation_time', 0):.2f}s)"
                )
                return {"code": code, "success": True, "result": result}
            except Exception as e:
                logger.error(f"生成失败: {code}, 错误: {e}")
                return {"code": code, "success": False, "error": str(e)}

    # 并发执行
    tasks = [generate_with_limit(report) for report in reports]
    results = await asyncio.gather(*tasks)

    # 统计
    success_count = sum(1 for r in results if r["success"])
    fail_count = total - success_count
    total_time = time.time() - start_time

    logger.info("\n" + "=" * 50)
    logger.info("批量生成完成!")
    logger.info(f"总计: {total} 份")
    logger.info(f"成功: {success_count} 份")
    logger.info(f"失败: {fail_count} 份")
    logger.info(f"总耗时: {total_time:.2f} 秒")
    logger.info(f"平均耗时: {total_time / total:.2f} 秒/份")
    logger.info(f"{'=' * 50}\n")

    return {
        "total": total,
        "success": success_count,
        "failed": fail_count,
        "total_time": total_time,
        "avg_time": total_time / total if total > 0 else 0,
        "results": results,
    }


def generate_all_reports_sync(output_format: str = "both") -> Dict:
    """
    同步版本：生成所有报告

    Args:
        output_format: 输出格式

    Returns:
        批量生成统计
    """
    return asyncio.run(generate_all_reports(output_format))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="批量生成报告")
    parser.add_argument(
        "--format", choices=["html", "pdf", "both"], default="both", help="输出格式"
    )
    parser.add_argument("--force", action="store_true", help="强制重新生成")

    args = parser.parse_args()

    logger.info(f"启动批量生成，格式: {args.format}")
    result = generate_all_reports_sync(args.format)

    # 输出失败列表
    failed = [r for r in result["results"] if not r["success"]]
    if failed:
        logger.warning(f"\n失败列表 ({len(failed)} 份):")
        for f in failed:
            logger.warning(f"  - {f['code']}: {f.get('error', '未知错误')}")
