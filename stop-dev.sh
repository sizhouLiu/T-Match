#!/bin/bash
# 停止所有开发服务

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev-pids"

echo "Stopping development services..."

if [ -f "$PID_FILE" ]; then
    while read -r pid; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            echo "   Stopped PID $pid"
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

for port in 8000 5173; do
    if pids=$(lsof -ti:$port 2>/dev/null); then
        echo "$pids" | xargs kill 2>/dev/null
        echo "   Released port $port"
    fi
done

echo "All services stopped."
