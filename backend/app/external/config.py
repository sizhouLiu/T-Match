from functools import lru_cache
from pydantic_settings import BaseSettings

class ExternalSettings(BaseSettings):
    EMBEDDING_PROVIDER: str = "tongyi"
    TONGYI_API_KEY: str = ""
    TONGYI_EMBEDDING_MODEL: str = "text-embedding-v3"
    TONGYI_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    TONGYI_CHAT_MODEL: str = "qwen-turbo"
    OPENAI_API_KEY: str = ""
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache
def get_external_settings() -> ExternalSettings:
    return ExternalSettings()

external_settings = get_external_settings()
