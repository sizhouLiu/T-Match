from app.routers.auth import router as auth_router
from app.routers.jobs import router as jobs_router
from app.routers.resumes import router as resumes_router
from app.routers.scraper import router as scraper_router

__all__ = ["auth_router", "jobs_router", "resumes_router", "scraper_router"]
