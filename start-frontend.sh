#!/bin/bash
# 启动前端服务脚本

cd "$(dirname "$0")/frontend"

echo "Starting frontend server..."
pnpm dev
