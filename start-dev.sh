#!/bin/bash
# 一键启动前后端服务（支持热更新）

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev-pids"

# 加载 nvm（如果存在）
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "=========================================="
echo "  T-Match Development Server (Hot Reload)"
echo "=========================================="

# 清理旧的 PID 文件和残留进程
rm -f "$PID_FILE"
lsof -ti:8000 2>/dev/null | xargs kill 2>/dev/null
lsof -ti:5173 2>/dev/null | xargs kill 2>/dev/null

# 清理函数
cleanup() {
    echo ""
    echo "Stopping services..."
    if [ -f "$PID_FILE" ]; then
        while read pid; do
            if ps -p "$pid" > /dev/null 2>&1; then
                kill "$pid" 2>/dev/null
                echo "Stopped process $pid"
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    # 确保端口释放
    lsof -ti:8000 2>/dev/null | xargs kill 2>/dev/null
    lsof -ti:5173 2>/dev/null | xargs kill 2>/dev/null
    echo "All services stopped."
    exit 0
}

# 捕获 Ctrl+C
trap cleanup SIGINT SIGTERM

# 检查数据库和 Redis 是否运行
echo "Checking database and Redis..."
if ! docker ps 2>/dev/null | grep -q postgres; then
    echo "Starting database and Redis..."
    cd "$SCRIPT_DIR" && docker compose up -d db redis
    echo "Waiting for database to be ready..."
    sleep 3
else
    echo "Database and Redis already running."
fi

# 启动后端（uvicorn --reload 监听文件变化自动重启）
echo ""
echo "Starting backend server (hot reload)..."
cd "$SCRIPT_DIR/backend"
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo "$BACKEND_PID" >> "$PID_FILE"

# 启动前端（Vite HMR 自带热更新）
echo ""
echo "Starting frontend server (HMR)..."
cd "$SCRIPT_DIR/frontend"
pnpm dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo "$FRONTEND_PID" >> "$PID_FILE"

echo ""
echo "=========================================="
echo "  Services started with hot reload!"
echo "=========================================="
echo ""
echo "  Backend API:  http://localhost:8000      (auto-reload on .py changes)"
echo "  API Docs:     http://localhost:8000/api/docs"
echo "  Frontend:     http://localhost:5173      (HMR on .tsx/.ts/.css changes)"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "=========================================="
echo ""

# 等待子进程
wait
