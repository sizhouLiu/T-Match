#!/bin/bash
# 一键启动所有开发服务（基础设施 + 后端 + Celery + 前端）

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.dev-pids"
LOG_DIR="$SCRIPT_DIR/.dev-logs"

mkdir -p "$LOG_DIR"
rm -f "$PID_FILE"

# 清理占用端口的残留进程
for port in 8000 5173; do
    if pids=$(lsof -ti:$port 2>/dev/null); then
        echo "$pids" | xargs kill 2>/dev/null
    fi
done

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

cleanup() {
    echo ""
    info "Stopping all services..."
    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            kill "$pid" 2>/dev/null && echo "   Stopped PID $pid"
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    lsof -ti:8000 2>/dev/null | xargs kill 2>/dev/null
    lsof -ti:5173 2>/dev/null | xargs kill 2>/dev/null
    info "All services stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   T-Match Dev Server (All-in-One)    ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── 1. 启动基础设施容器 ──────────────────────────────────────────────
info "Starting infrastructure (db, redis, milvus stack)..."
cd "$SCRIPT_DIR"
docker compose up -d db redis etcd minio milvus 2>&1 | grep -E "(Started|Running|healthy|Error|Warning)" || true

info "Waiting for db to be ready..."
until docker compose exec -T db pg_isready -U postgres -q 2>/dev/null; do
    sleep 1
done
log "PostgreSQL ready"

info "Waiting for Redis to be ready..."
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
    sleep 1
done
log "Redis ready"

info "Waiting for Milvus to be ready (may take ~30s on first run)..."
until curl -sf http://localhost:9091/healthz > /dev/null 2>&1; do
    printf "."
    sleep 2
done
echo ""
log "Milvus ready"

# ── 2. 数据库迁移 ──────────────────────────────────────────────────
info "Running database migrations..."
cd "$SCRIPT_DIR/backend"
if uv run alembic upgrade head 2>&1 | tail -3; then
    log "Migrations applied"
else
    warn "Migration failed or already up to date, continuing..."
fi

# ── 3. 启动后端 ───────────────────────────────────────────────────
echo ""
info "Starting backend (port 8000)..."
cd "$SCRIPT_DIR/backend"
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app \
    > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" >> "$PID_FILE"
log "Backend PID: $BACKEND_PID  (log: .dev-logs/backend.log)"

# 等后端真正监听
sleep 2
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        err "Backend crashed! Check .dev-logs/backend.log"
        tail -20 "$LOG_DIR/backend.log"
        cleanup
    fi
    sleep 1
done
log "Backend healthy"

# ── 4. 启动 Celery Worker ─────────────────────────────────────────
info "Starting Celery worker..."
cd "$SCRIPT_DIR/backend"
uv run celery -A app.tasks worker --loglevel=warning \
    > "$LOG_DIR/celery-worker.log" 2>&1 &
WORKER_PID=$!
echo "$WORKER_PID" >> "$PID_FILE"
log "Celery worker PID: $WORKER_PID  (log: .dev-logs/celery-worker.log)"

# ── 5. 启动 Celery Beat ───────────────────────────────────────────
info "Starting Celery beat..."
cd "$SCRIPT_DIR/backend"
uv run celery -A app.tasks beat --loglevel=warning \
    > "$LOG_DIR/celery-beat.log" 2>&1 &
BEAT_PID=$!
echo "$BEAT_PID" >> "$PID_FILE"
log "Celery beat PID: $BEAT_PID  (log: .dev-logs/celery-beat.log)"

# ── 6. 启动前端 ───────────────────────────────────────────────────
echo ""
info "Starting frontend (port 5173)..."
cd "$SCRIPT_DIR/frontend"
pnpm dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >> "$PID_FILE"
log "Frontend PID: $FRONTEND_PID  (log: .dev-logs/frontend.log)"

# ── 就绪摘要 ──────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║              All services started!                   ║"
echo "  ╠══════════════════════════════════════════════════════╣"
echo "  ║  Frontend:     http://localhost:5173                 ║"
echo "  ║  Backend API:  http://localhost:8000                 ║"
echo "  ║  API Docs:     http://localhost:8000/api/docs        ║"
echo "  ╠══════════════════════════════════════════════════════╣"
echo "  ║  Logs:  .dev-logs/{backend,frontend,celery-*}.log   ║"
echo "  ║  Stop:  Ctrl+C  or  ./stop-dev.sh                   ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo ""

wait
