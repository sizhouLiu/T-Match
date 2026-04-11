# T-Match

AI-powered job search platform inspired by 求职方舟AI.

## Features

- 🔍 Job listing and search
- 📝 Resume management with AI optimization
- 📊 Job application tracking
- 🤖 AI-powered resume optimization (via Celery tasks)
- 🔐 User authentication with JWT

## Tech Stack

### Backend
- FastAPI
- PostgreSQL
- Redis
- Celery

### Frontend
- React
- TypeScript
- Vite
- Ant Design
- TanStack Query
- Zustand

## Project Structure

```
T-Match/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── models/    # SQLAlchemy models
│   │   ├── routers/   # API routes
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── tasks/     # Celery tasks
│   │   └── main.py
│   └── pyproject.toml
├── frontend/          # React frontend
│   ├── src/
│   │   ├── api/       # API clients
│   │   ├── pages/     # Page components
│   │   ├── stores/    # Zustand stores
│   │   └── types/     # TypeScript types
│   └── package.json
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- pnpm (for local frontend development)
- uv (for local backend development)

### Running with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### Local Development

#### Backend

```bash
cd backend

# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .

# Run development server
uvicorn app.main:app --reload

# Run Celery worker (in another terminal)
celery -A app.tasks worker --loglevel=info
```

#### Frontend

```bash
cd frontend

# Install pnpm if not already installed
npm install -g pnpm

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/tmatch
DATABASE_URL_SYNC=postgresql://postgres:postgres@localhost:5432/tmatch
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
SECRET_KEY=your-super-secret-key-change-in-production
DEBUG=True
```

## License

MIT
