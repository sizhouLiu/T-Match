from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.config import settings
from app.routers import auth_router, jobs_router, resumes_router, scraper_router, match_router, campus_router
from app.services.milvus_client import ensure_collection

logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, docs_url="/api/docs", redoc_url="/api/redoc", openapi_url="/api/openapi.json")
    app.add_middleware(CORSMiddleware, allow_origins=settings.get_cors_origins(), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
    app.include_router(auth_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api")
    app.include_router(resumes_router, prefix="/api")
    app.include_router(scraper_router, prefix="/api")
    app.include_router(match_router, prefix="/api")
    app.include_router(campus_router, prefix="/api")

    @app.on_event("startup")
    async def startup():
        try:
            ensure_collection()
        except Exception as e:
            logger.error(f"Failed to initialize Milvus collection: {e}")

    @app.get("/")
    async def root():
        return {"message": f"Welcome to {settings.APP_NAME}", "version": settings.APP_VERSION}

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app

app = create_app()
