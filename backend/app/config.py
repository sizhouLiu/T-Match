from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "T-Match"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tmatch"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/tmatch"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: str | List[str] = ["http://localhost:3000", "http://localhost:5173"]
    MILVUS_URI: str = "http://localhost:19530"
    MILVUS_COLLECTION_NAME: str = "job_vectors"
    MILVUS_DENSE_DIM: int = 1024
    VECTOR_SEARCH_TOP_K: int = 20
    VECTOR_SEARCH_DENSE_WEIGHT: float = 0.6
    VECTOR_SEARCH_SPARSE_WEIGHT: float = 0.4

    def get_cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str): return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
