#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════
#  股票智能分析系统 - 统一启动脚本
#  Skills驱动LLM · OpenBB Workspace集成
# ═══════════════════════════════════════════════════════

BACKEND_PORT=8000
FRONTEND_PORT=6003

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_LOG="$BACKEND_DIR/backend.log"
VENV_DIR="$BACKEND_DIR/venv"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERR]${NC}   $1"; }
title() { echo -e "${BLUE}$1${NC}"; }

PIDS=()

cleanup() {
    echo ""
    warn "正在关闭所有服务..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    for pid in "${PIDS[@]}"; do
        wait "$pid" 2>/dev/null || true
    done
    ok "所有服务已关闭"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ─── 清理旧进程 ─────────────────────────────────────
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        warn "端口 $port 被占用，清理中..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║     股票智能分析系统 v2.0                       ║"
echo "║     Skills驱动LLM · OpenBB Workspace集成       ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ─── 0. 清理端口 ────────────────────────────────────
info "清理旧进程..."
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
ok "端口清理完成"

# ─── 1. 后端 (FastAPI) ──────────────────────────────
echo ""
title "─── 1. 启动后端 (FastAPI :$BACKEND_PORT) ───"
if [ ! -d "$VENV_DIR" ]; then
    err "虚拟环境不存在: $VENV_DIR"
    info "正在创建虚拟环境..."
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    pip install -r "$PROJECT_DIR/requirements.txt"
else
    source "$VENV_DIR/bin/activate"
fi

cd "$BACKEND_DIR"
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port $BACKEND_PORT > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
PIDS+=($BACKEND_PID)
cd "$PROJECT_DIR"

for i in $(seq 1 30); do
    if curl -s http://localhost:$BACKEND_PORT/api/analysis/health > /dev/null 2>&1; then
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

# ─── 1.1 验证 Skills 引擎 ───────────────────────────
echo ""
info "验证 Skills 引擎..."
SKILLS_CHECK=$(curl -s http://localhost:$BACKEND_PORT/api/openbb/skills-widget 2>/dev/null || echo '{}')
SKILL_COUNT=$(echo "$SKILLS_CHECK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('content',{}).get('total_skills',0))" 2>/dev/null || echo "0")
MODE_COUNT=$(echo "$SKILLS_CHECK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('content',{}).get('total_modes',0))" 2>/dev/null || echo "0")
ok "Skills引擎就绪: ${SKILL_COUNT}个技能, ${MODE_COUNT}个分析模式"

# ─── 1.2 验证 OpenBB 端点 ───────────────────────────
echo -n "  widgets.json: "
if curl -s http://localhost:$BACKEND_PORT/widgets.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" > /dev/null 2>&1; then
    WIDGET_COUNT=$(curl -s http://localhost:$BACKEND_PORT/widgets.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))")
    echo -e "${GREEN}✓${NC} (${WIDGET_COUNT} widgets)"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "  apps.json:    "
if curl -s http://localhost:$BACKEND_PORT/apps.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" > /dev/null 2>&1; then
    APP_COUNT=$(curl -s http://localhost:$BACKEND_PORT/apps.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))")
    echo -e "${GREEN}✓${NC} (${APP_COUNT} apps)"
else
    echo -e "${RED}✗${NC}"
fi

# ─── 1.3 检查 LLM 服务 ──────────────────────────────
echo -n "  LLM服务:     "
LLM_CHECK=$(curl -s http://localhost:$BACKEND_PORT/api/analysis/llm-providers 2>/dev/null || echo '{}')
LLM_AVAILABLE=$(echo "$LLM_CHECK" | python3 -c "import sys,json; d=json.load(sys.stdin); providers=d.get('providers',{}); print('yes' if any(p.get('available') for p in providers.values()) else 'no')" 2>/dev/null || echo "no")
if [ "$LLM_AVAILABLE" = "yes" ]; then
    echo -e "${GREEN}✓${NC} 已配置"
else
    echo -e "${YELLOW}⚠${NC}  未配置 (Skills分析将不可用)"
fi

# ─── 2. 前端 (Vite) ─────────────────────────────────
echo ""
title "─── 2. 启动前端 (Vite :$FRONTEND_PORT) ───"
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    info "安装前端依赖..."
    cd "$FRONTEND_DIR"
    npm install --silent
    cd "$PROJECT_DIR"
fi

cd "$FRONTEND_DIR"
nohup npx vite --host 0.0.0.0 --port $FRONTEND_PORT > /dev/null 2>&1 &
FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)
cd "$PROJECT_DIR"

for i in $(seq 1 30); do
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        ok "前端已启动 (PID $FRONTEND_PID)"
        break
    fi
    if [ $i -eq 30 ]; then
        warn "前端启动超时"
    fi
    sleep 1
done

# ─── 3. 验证 ────────────────────────────────────────
echo ""
title "─── 3. 验证服务 ───"

echo -n "  后端 API:     "
if curl -s http://localhost:$BACKEND_PORT/api/analysis/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "  前端页面:     "
if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "  OpenBB端点:   "
if curl -s http://localhost:$BACKEND_PORT/widgets.json > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# ─── 4. 完成 ────────────────────────────────────────
echo ""
echo "╔════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}系统已启动${NC}                                  ║"
echo "╠════════════════════════════════════════════════╣"
echo -e "║  前端页面:  ${CYAN}http://localhost:${FRONTEND_PORT}${NC}              ║"
echo -e "║  后端 API:  ${CYAN}http://localhost:${BACKEND_PORT}/docs${NC}       ║"
echo -e "║  OpenBB:    ${CYAN}http://localhost:${BACKEND_PORT}${NC}              ║"
echo "╠════════════════════════════════════════════════╣"
echo -e "║  Skills: ${SKILL_COUNT}个 | 模式: ${MODE_COUNT}个 | Widgets: ${WIDGET_COUNT}个     ║"
echo "╠════════════════════════════════════════════════╣"
echo -e "║  ${YELLOW}OpenBB Workspace → 添加后端 → 上方OpenBB地址${NC}  ║"
echo -e "║  ${YELLOW}按 Ctrl+C 停止所有服务${NC}                      ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ─── 5. 自动打开浏览器 ──────────────────────────────
info "正在打开前端界面..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:${FRONTEND_PORT}"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://localhost:${FRONTEND_PORT}" 2>/dev/null || true
elif [[ "$OSTYPE" == "cygwin" ]]; then
    cygstart "http://localhost:${FRONTEND_PORT}" 2>/dev/null || true
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    start "http://localhost:${FRONTEND_PORT}" 2>/dev/null || true
fi
ok "浏览器已打开"
echo ""

wait "${PIDS[@]}"
