#!/bin/bash
# 一键启动前后端服务

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev-pids"

echo "=========================================="
echo "  T-Match Development Server"
echo "=========================================="

# 清理旧的 PID 文件
rm -f "$PID_FILE"

# 检查数据库和 Redis 是否运行
echo "Checking database and Redis..."
if ! docker ps | grep -q "t-match-db"; then
    echo "Starting database..."
    cd "$SCRIPT_DIR" && docker-compose up -d db
fi
if ! docker ps | grep -q "t-match-redis"; then
    echo "Starting Redis..."
    cd "$SCRIPT_DIR" && docker-compose up -d redis
fi

# 等待数据库健康
echo "Waiting for database to be ready..."
sleep 2

# 启动后端
echo ""
echo "Starting backend server..."
cd "$SCRIPT_DIR/backend"
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo "$BACKEND_PID" >> "$PID_FILE"

# 启动前端
echo ""
echo "Starting frontend server..."
cd "$SCRIPT_DIR/frontend"
pnpm dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo "$FRONTEND_PID" >> "$PID_FILE"

echo ""
echo "=========================================="
echo "  Services started!"
echo "=========================================="
echo ""
echo "  Backend API:  http://localhost:8000"
echo "  API Docs:     http://localhost:8000/api/docs"
echo "  Frontend:     http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "=========================================="
echo ""

# 等待子进程
wait

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
    echo "All services stopped."
    exit 0
}

# 捕获 Ctrl+C
trap cleanup SIGINT SIGTERM
