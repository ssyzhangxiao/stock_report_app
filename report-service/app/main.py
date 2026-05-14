"""
Report Service - FastAPI主应用

功能：
- 提供报告生成API
- 支持HTML和PDF输出
- 缓存机制
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from app.api.routes import router
from app.utils.helpers import setup_logger

logger = setup_logger("main")

# 创建FastAPI应用
app = FastAPI(
    title="Report Service", description="股票研究报告生成服务", version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(router)

# 静态文件（用于预览）
OUTPUT_DIR = "/tmp/report-service/output"
os.makedirs(OUTPUT_DIR, exist_ok=True)
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")


@app.get("/")
async def root():
    """根路径 - 重定向到API文档"""
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
