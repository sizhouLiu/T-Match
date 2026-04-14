#!/bin/bash
# 启动 Celery Worker 脚本

cd "$(dirname "$0")/backend"

# 激活虚拟环境
source .venv/bin/activate

echo "Starting Celery worker..."
celery -A app.tasks worker --loglevel=info
