#!/bin/bash
# 启动后端服务脚本

cd "$(dirname "$0")/backend"

# 激活虚拟环境
source .venv/bin/activate

# 启动 FastAPI 服务
echo "Starting backend server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
