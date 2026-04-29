#!/bin/bash
set -e

# ─── 配置 ───────────────────────────────────────────
BACKEND_PORT=9002
FRONTEND_PORT=6003
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_LOG="$BACKEND_DIR/backend.log"
VENV_DIR="$BACKEND_DIR/venv"

# ─── 颜色 ───────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERR]${NC}   $1"; }

cleanup() {
    echo ""
    warn "正在关闭服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    ok "服务已关闭"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ─── 启动流程 ───────────────────────────────────────

echo "=========================================="
echo "  股票分析自动报告系统 - 启动脚本"
echo "=========================================="
echo ""

# 1. 后端
info "启动后端 (FastAPI :$BACKEND_PORT)..."
if [ ! -d "$VENV_DIR" ]; then
    err "虚拟环境不存在，请先执行: python3 -m venv $VENV_DIR && pip install -r $BACKEND_DIR/requirements.txt"
    exit 1
fi

source "$VENV_DIR/bin/activate"
cd "$BACKEND_DIR"
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
cd "$PROJECT_DIR"

# 等待后端就绪
for i in $(seq 1 30); do
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        ok "后端已启动 (PID $BACKEND_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        err "后端启动超时，请检查 $BACKEND_LOG"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# 2. 前端
info "启动前端 (Vite :$FRONTEND_PORT)..."
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    info "安装前端依赖..."
    cd "$FRONTEND_DIR"
    npm install --silent
    cd "$PROJECT_DIR"
fi

cd "$FRONTEND_DIR"
nohup npx vite --host 0.0.0.0 --port $FRONTEND_PORT --open > /dev/null 2>&1 &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

# 等待前端就绪
for i in $(seq 1 30); do
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        ok "前端已启动 (PID $FRONTEND_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        warn "前端启动超时，请检查控制台输出"
    fi
    sleep 1
done

# 3. 验证 API
info "验证 API 连通性..."
if curl -s http://localhost:$BACKEND_PORT/api/analysis/sources > /dev/null 2>&1; then
    ok "API 正常，数据源可用"
    curl -s http://localhost:$BACKEND_PORT/api/analysis/sources | python3 -m json.tool 2>/dev/null || true
else
    warn "API 健康检查未通过"
fi

echo ""
echo "=========================================="
echo -e "  ${GREEN}系统已启动${NC}"
echo ""
echo -e "  前端:  ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  后端:  ${CYAN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "  API:   ${CYAN}http://localhost:${BACKEND_PORT}/docs${NC}"
echo ""
echo -e "  按 ${YELLOW}Ctrl+C${NC} 停止所有服务"
echo "=========================================="
echo ""

# 保持前台运行
wait $BACKEND_PID $FRONTEND_PID
