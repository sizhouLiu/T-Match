#!/bin/bash
# 启动后端服务脚本

cd "$(dirname "$0")/backend"

echo "Starting backend server..."
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
