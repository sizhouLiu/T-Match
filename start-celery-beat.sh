#!/bin/bash
# 启动 Celery Beat 定时任务调度器

cd "$(dirname "$0")/backend"

# 激活虚拟环境
source .venv/bin/activate

echo "Starting Celery beat scheduler..."
celery -A app.tasks beat --loglevel=info
