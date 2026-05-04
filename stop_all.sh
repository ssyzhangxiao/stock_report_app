#!/bin/bash
# 停止所有服务（后端 + 前端）

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}正在停止所有服务...${NC}"

# 端口配置
BACKEND_PORT=9002
FRONTEND_PORT=6003

for port in $BACKEND_PORT $FRONTEND_PORT; do
    pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "  ${CYAN}端口 $port${NC}: 终止进程 $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
done

sleep 1
echo -e "${GREEN}✓ 所有服务已停止${NC}"
