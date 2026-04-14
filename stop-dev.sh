#!/bin/bash
# 停止所有开发服务

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev-pids"

echo "Stopping development services..."

# 停止后端和前端进程
if [ -f "$PID_FILE" ]; then
    while read pid; do
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid" 2>/dev/null
            echo "Stopped process $pid"
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

# 也尝试通过端口杀死进程
if lsof -ti:8000 > /dev/null 2>&1; then
    kill $(lsof -ti:8000) 2>/dev/null
    echo "Stopped backend (port 8000)"
fi

if lsof -ti:5173 > /dev/null 2>&1; then
    kill $(lsof -ti:5173) 2>/dev/null
    echo "Stopped frontend (port 5173)"
fi

echo "All services stopped."
