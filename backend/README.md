# T-Match Backend

FastAPI backend for T-Match job search platform.

## Setup

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv pip install -e .
```

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Run Celery Worker

```bash
celery -A app.tasks worker --loglevel=info
```
