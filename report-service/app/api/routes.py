"""
API路由 - FastAPI

功能：
- GET /reports: 获取报告列表
- POST /render/{code}: 生成指定报告（支持force参数）
- GET /reports/{code}/download: 下载报告
"""

import os
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app.services.md_parser import MarkdownParser
from app.services.chart_engine import process_all_tables
from app.services.html_renderer import HTMLRenderer
from app.services.pdf_renderer import PDFRenderer
from app.utils.helpers import setup_logger, get_research_dir

logger = setup_logger("api")

router = APIRouter(prefix="/api/v1", tags=["reports"])

# 输出目录
OUTPUT_DIR = Path("/tmp/report-service/output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 缓存目录
CACHE_DIR = Path("/tmp/report-service/cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class ReportInfo(BaseModel):
    """报告信息模型"""

    code: str
    name: str
    stock_code: str
    stock_name: str
    file_path: str
    modified_time: str
    size: int


class RenderRequest(BaseModel):
    """渲染请求模型"""

    force: bool = False
    output_format: str = "pdf"  # pdf, html, both


class RenderResponse(BaseModel):
    """渲染响应模型"""

    success: bool
    message: str
    code: str
    html_path: Optional[str] = None
    pdf_path: Optional[str] = None
    generation_time: float = 0.0


def _get_file_hash(file_path: str) -> str:
    """
    计算文件哈希（内容+修改时间）

    Args:
        file_path: 文件路径

    Returns:
        MD5哈希值
    """
    # 检查是否为分章节报告（文件是否在报告目录中）
    dir_path = os.path.dirname(file_path)
    has_chapter_files = any(
        f.endswith(".md") and f[0].isdigit() for f in os.listdir(dir_path)
    )

    if has_chapter_files:
        # 分章节报告：计算所有MD文件的信息
        file_infos = []
        for f in sorted(os.listdir(dir_path)):
            if f.endswith(".md"):
                f_path = os.path.join(dir_path, f)
                stat = os.stat(f_path)
                file_infos.append(f"{f_path}:{stat.st_size}:{stat.st_mtime}")

        content = "\n".join(file_infos)
        return hashlib.md5(content.encode()).hexdigest()
    else:
        # 单文件报告
        stat = os.stat(file_path)
        content = f"{file_path}:{stat.st_size}:{stat.st_mtime}"
        return hashlib.md5(content.encode()).hexdigest()


def _get_cache_path(code: str, file_hash: str, format: str) -> Path:
    """
    获取缓存文件路径

    Args:
        code: 报告代码
        file_hash: 文件哈希
        format: 输出格式

    Returns:
        缓存文件路径
    """
    return CACHE_DIR / f"{code}_{file_hash}.{format}"


def _is_valid_report_dir(dir_path: str) -> bool:
    """
    判断目录是否为有效报告目录

    Args:
        dir_path: 目录路径

    Returns:
        是否有效
    """
    # 检查是否有 FULL_REPORT.md
    if os.path.exists(os.path.join(dir_path, "FULL_REPORT.md")):
        return True

    # 检查是否有分章节文件（如 00_*.md, 01_*.md 等）
    chapter_files = [
        f for f in os.listdir(dir_path) if f.endswith(".md") and f[0].isdigit()
    ]
    return len(chapter_files) > 0


def _merge_chapter_files(dir_path: str) -> str:
    """
    合并分章节文件

    Args:
        dir_path: 目录路径

    Returns:
        合并后的文件路径（临时文件）
    """
    # 获取所有章节文件并排序
    chapter_files = sorted(
        [f for f in os.listdir(dir_path) if f.endswith(".md") and f[0].isdigit()]
    )

    if not chapter_files:
        return os.path.join(dir_path, "FULL_REPORT.md")

    # 合并内容
    content_parts = []
    for chapter_file in chapter_files:
        file_path = os.path.join(dir_path, chapter_file)
        with open(file_path, "r", encoding="utf-8") as f:
            content_parts.append(f.read())

    merged_content = "\n\n".join(content_parts)

    # 保存为临时文件
    temp_file = os.path.join(dir_path, ".merged_report.tmp.md")
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(merged_content)

    return temp_file


def _get_latest_modified_time(dir_path: str) -> float:
    """
    获取目录中最新文件的修改时间

    Args:
        dir_path: 目录路径

    Returns:
        最新修改时间戳
    """
    latest_time = 0.0

    for f in os.listdir(dir_path):
        if f.endswith(".md"):
            file_path = os.path.join(dir_path, f)
            stat = os.stat(file_path)
            if stat.st_mtime > latest_time:
                latest_time = stat.st_mtime

    return latest_time


def _get_total_size(dir_path: str) -> int:
    """
    获取目录中所有MD文件的总大小

    Args:
        dir_path: 目录路径

    Returns:
        总大小（字节）
    """
    total_size = 0

    for f in os.listdir(dir_path):
        if f.endswith(".md"):
            file_path = os.path.join(dir_path, f)
            total_size += os.path.getsize(file_path)

    return total_size


def _find_report_file(code: str) -> Optional[str]:
    """
    查找报告文件

    Args:
        code: 报告代码（如 STOCK_600519_贵州茅台）

    Returns:
        文件路径或None
    """
    research_dir = get_research_dir()

    # 直接匹配目录
    direct_dir = os.path.join(research_dir, code)
    if os.path.exists(direct_dir) and _is_valid_report_dir(direct_dir):
        # 检查是否有 FULL_REPORT.md
        full_report_path = os.path.join(direct_dir, "FULL_REPORT.md")
        if os.path.exists(full_report_path):
            return full_report_path
        # 否则合并分章节文件
        return _merge_chapter_files(direct_dir)

    # 模糊匹配目录
    for item in os.listdir(research_dir):
        if code.lower() in item.lower():
            item_dir = os.path.join(research_dir, item)
            if _is_valid_report_dir(item_dir):
                full_report_path = os.path.join(item_dir, "FULL_REPORT.md")
                if os.path.exists(full_report_path):
                    return full_report_path
                return _merge_chapter_files(item_dir)

    return None


def _scan_reports() -> List[ReportInfo]:
    """
    扫描所有报告

    Returns:
        报告信息列表
    """
    research_dir = get_research_dir()
    reports = []

    if not os.path.exists(research_dir):
        logger.warning(f"研究目录不存在: {research_dir}")
        return reports

    for item in os.listdir(research_dir):
        item_dir = os.path.join(research_dir, item)
        if os.path.isdir(item_dir) and _is_valid_report_dir(item_dir):
            # 获取修改时间和大小
            modified_time = _get_latest_modified_time(item_dir)
            size = _get_total_size(item_dir)

            # 解析股票代码和名称
            parts = item.split("_")
            stock_code = ""
            stock_name = ""

            if len(parts) >= 3:
                # 格式：STOCK_00700_HK_Tencent → 代码00700，名称Tencent
                # 或：STOCK_600519_贵州茅台 → 代码600519，名称贵州茅台
                stock_code = parts[1]
                # 取剩下的部分作为名称
                if len(parts) >= 4 and parts[2] in ["HK", "SZ", "SH"]:
                    # 有交易所标识
                    stock_name = "_".join(parts[3:])
                else:
                    # 没有交易所标识
                    stock_name = "_".join(parts[2:])
            else:
                stock_code = ""
                stock_name = item

            reports.append(
                ReportInfo(
                    code=item,
                    name=item,
                    stock_code=stock_code,
                    stock_name=stock_name,
                    file_path=os.path.join(item_dir, "FULL_REPORT.md"),
                    modified_time=datetime.fromtimestamp(modified_time).isoformat(),
                    size=size,
                )
            )

    # 按修改时间排序
    reports.sort(key=lambda x: x.modified_time, reverse=True)
    return reports


@router.get("/reports", response_model=List[ReportInfo])
async def list_reports():
    """
    获取报告列表

    Returns:
        报告信息列表
    """
    try:
        reports = _scan_reports()
        logger.info(f"返回报告列表: {len(reports)} 份")
        return reports
    except Exception as e:
        logger.error(f"获取报告列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/render/{code}", response_model=RenderResponse)
async def render_report(
    code: str, request: RenderRequest, _background_tasks: BackgroundTasks
):
    """
    生成指定报告

    Args:
        code: 报告代码
        request: 渲染请求

    Returns:
        渲染结果
    """
    start_time = datetime.now()

    try:
        # 查找报告文件
        file_path = _find_report_file(code)
        if not file_path:
            raise HTTPException(status_code=404, detail=f"报告不存在: {code}")

        # 计算文件哈希
        file_hash = _get_file_hash(file_path)

        # 检查缓存
        html_path = _get_cache_path(code, file_hash, "html")
        pdf_path = _get_cache_path(code, file_hash, "pdf")

        if not request.force:
            cached_html = html_path.exists()
            cached_pdf = pdf_path.exists()

            if request.output_format == "html" and cached_html:
                logger.info(f"使用缓存的HTML: {html_path}")
                return RenderResponse(
                    success=True,
                    message="使用缓存",
                    code=code,
                    html_path=str(html_path),
                    generation_time=(datetime.now() - start_time).total_seconds(),
                )

            if request.output_format == "pdf" and cached_pdf:
                logger.info(f"使用缓存的PDF: {pdf_path}")
                return RenderResponse(
                    success=True,
                    message="使用缓存",
                    code=code,
                    pdf_path=str(pdf_path),
                    generation_time=(datetime.now() - start_time).total_seconds(),
                )

            if request.output_format == "both" and cached_html and cached_pdf:
                logger.info(f"使用缓存: HTML={html_path}, PDF={pdf_path}")
                return RenderResponse(
                    success=True,
                    message="使用缓存",
                    code=code,
                    html_path=str(html_path),
                    pdf_path=str(pdf_path),
                    generation_time=(datetime.now() - start_time).total_seconds(),
                )

        # 解析Markdown
        logger.info(f"开始解析报告: {code}")
        parser = MarkdownParser()
        report_data = parser.parse_file(file_path)

        # 转换图表
        logger.info(f"开始转换图表: {code}")
        process_all_tables(report_data)

        result = RenderResponse(
            success=True, message="生成成功", code=code, generation_time=0.0
        )

        # 生成HTML
        if request.output_format in ["html", "both"]:
            renderer = HTMLRenderer()
            renderer.render_to_file(report_data, str(html_path))
            result.html_path = str(html_path)
            logger.info(f"HTML生成完成: {html_path}")

        # 生成PDF
        if request.output_format in ["pdf", "both"]:
            pdf_renderer = PDFRenderer()
            await pdf_renderer.render(report_data, str(pdf_path))
            result.pdf_path = str(pdf_path)
            logger.info(f"PDF生成完成: {pdf_path}")

        result.generation_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"报告生成完成: {code}, 耗时: {result.generation_time:.2f}s")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"报告生成失败: {code}, 错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{code}/download")
async def download_report(code: str, format: str = "pdf"):
    """
    下载报告

    Args:
        code: 报告代码
        format: 文件格式 (pdf, html)

    Returns:
        文件下载响应
    """
    try:
        # 查找报告文件
        file_path = _find_report_file(code)
        if not file_path:
            raise HTTPException(status_code=404, detail=f"报告不存在: {code}")

        # 计算文件哈希
        file_hash = _get_file_hash(file_path)

        # 确定文件路径
        if format == "html":
            output_path = _get_cache_path(code, file_hash, "html")
        else:
            output_path = _get_cache_path(code, file_hash, "pdf")

        # 如果缓存不存在，先生成
        if not output_path.exists():
            request = RenderRequest(force=False, output_format=format)
            response = await render_report(code, request, None)
            if format == "html":
                output_path = Path(response.html_path)
            else:
                output_path = Path(response.pdf_path)

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="文件生成失败")

        # 返回文件
        media_type = "text/html" if format == "html" else "application/pdf"
        filename = f"{code}_report.{format}"

        return FileResponse(
            path=str(output_path), media_type=media_type, filename=filename
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载报告失败: {code}, 错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{code}/preview")
async def preview_report(code: str):
    """
    预览报告（返回HTML内容）

    Args:
        code: 报告代码

    Returns:
        HTML内容
    """
    try:
        # 查找报告文件
        file_path = _find_report_file(code)
        if not file_path:
            raise HTTPException(status_code=404, detail=f"报告不存在: {code}")

        # 计算文件哈希
        file_hash = _get_file_hash(file_path)
        html_path = _get_cache_path(code, file_hash, "html")

        # 如果缓存不存在，先生成
        if not html_path.exists():
            request = RenderRequest(force=False, output_format="html")
            response = await render_report(code, request, None)
            html_path = Path(response.html_path)

        # 读取HTML内容
        with open(html_path, "r", encoding="utf-8") as f:
            content = f.read()

        return JSONResponse(content={"html": content})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"预览报告失败: {code}, 错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))
