from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Union


class Settings(BaseSettings):
    # App
    APP_NAME: str = "T-Match"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tmatch"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/tmatch"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - 支持字符串或列表格式
    CORS_ORIGINS: str | List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    def get_cors_origins(self) -> List[str]:
        """解析CORS origins配置"""
        if isinstance(self.CORS_ORIGINS, str):
            # 处理字符串格式，如 "http://a,http://b"
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
