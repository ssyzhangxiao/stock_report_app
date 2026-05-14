"""
工具函数

功能：
- 日志设置
- 路径配置
- 通用辅助函数
"""

import os
import logging
from pathlib import Path


def setup_logger(name: str) -> logging.Logger:
    """
    设置日志记录器

    Args:
        name: 日志名称

    Returns:
        日志记录器
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    logger.setLevel(logging.INFO)
    return logger


def get_research_dir() -> str:
    """
    获取研究目录路径

    Returns:
        研究目录路径
    """
    # 首先检查环境变量
    research_dir = os.environ.get("RESEARCH_DIR")
    if research_dir and os.path.exists(research_dir):
        return research_dir

    # 默认路径
    default_paths = [
        "/Users/mac/projects/stock-research-agent/RESEARCH",
        "/Users/mac/Documents/股票自动分析系统/RESEARCH",
        "./RESEARCH",
        "../RESEARCH",
    ]

    for path in default_paths:
        if os.path.exists(path):
            return path

    # 如果都不存在，返回第一个默认路径
    return default_paths[0]


def ensure_dir(path: str) -> str:
    """
    确保目录存在

    Args:
        path: 目录路径

    Returns:
        目录路径
    """
    Path(path).mkdir(parents=True, exist_ok=True)
    return path


def safe_filename(filename: str) -> str:
    """
    生成安全的文件名

    Args:
        filename: 原始文件名

    Returns:
        安全的文件名
    """
    import re

    # 移除非法字符
    safe = re.sub(r"[^\w\u4e00-\u9fff-]", "_", filename)
    # 移除连续的下划线
    safe = re.sub(r"_+", "_", safe)
    # 移除首尾下划线
    safe = safe.strip("_")
    return safe


if __name__ == "__main__":
    logger = setup_logger("test")
    logger.info("日志测试")
    print(f"研究目录: {get_research_dir()}")
    print(f"安全文件名: {safe_filename('测试文件<>:"|?*.txt')}")
