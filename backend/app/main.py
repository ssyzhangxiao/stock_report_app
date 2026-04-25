from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import analysis
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="上市公司自动分析报告 API",
    description="基于 AkShare 的股票深度分析服务",
    version="1.0.0"
)

# CORS 配置
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(analysis.router)


@app.get("/")
async def root():
    return {
        "message": "欢迎使用上市公司自动分析报告 API",
        "docs": "/docs"
    }


if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    uvicorn.run("app.main:app", host=host, port=port, reload=debug)
