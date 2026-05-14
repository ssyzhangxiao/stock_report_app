#!/bin/bash
# Report Service 启动脚本

echo "=========================================="
echo "  股票研究报告可视化服务"
echo "=========================================="
echo ""

# 检查Python版本
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python 版本: $python_version"

# 检查依赖
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "❌ 错误: FastAPI 未安装"
    echo "请运行: pip install -r requirements.txt"
    exit 1
fi

# 检查Playwright
if ! python3 -c "import playwright" 2>/dev/null; then
    echo "⚠️  警告: Playwright 未安装"
    echo "请运行: pip install playwright && playwright install chromium"
    read -p "是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 设置环境变量
export REPORT_SERVICE_HOST=${REPORT_SERVICE_HOST:-0.0.0.0}
export REPORT_SERVICE_PORT=${REPORT_SERVICE_PORT:-8001}

echo ""
echo "启动服务..."
echo "访问地址: http://localhost:$REPORT_SERVICE_PORT"
echo "API文档: http://localhost:$REPORT_SERVICE_PORT/docs"
echo ""

# 启动服务
cd "$(dirname "$0")"
exec uvicorn app.main:app --host $REPORT_SERVICE_HOST --port $REPORT_SERVICE_PORT --reload
