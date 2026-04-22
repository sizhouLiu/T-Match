from typing import List
from abc import ABC, abstractmethod
import httpx
from .config import external_settings

class EmbeddingProvider(ABC):
    @abstractmethod
    async def get_dense_embeddings(self, texts: List[str]) -> List[List[float]]: pass
    @abstractmethod
    def get_dense_embeddings_sync(self, texts: List[str]) -> List[List[float]]: pass

class TongyiProvider(EmbeddingProvider):
    def __init__(self):
        self.api_key = external_settings.TONGYI_API_KEY
        self.base_url = external_settings.TONGYI_BASE_URL
        self.model = external_settings.TONGYI_EMBEDDING_MODEL

    def _parse_response(self, data: dict) -> List[List[float]]:
        return [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]

    def _headers(self) -> dict:
        if not self.api_key: raise ValueError("TONGYI_API_KEY is not set")
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    async def get_dense_embeddings(self, texts: List[str]) -> List[List[float]]:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/embeddings", headers=self._headers(), json={"model": self.model, "input": texts}, timeout=30.0)
            response.raise_for_status()
            return self._parse_response(response.json())

    def get_dense_embeddings_sync(self, texts: List[str]) -> List[List[float]]:
        with httpx.Client() as client:
            response = client.post(f"{self.base_url}/embeddings", headers=self._headers(), json={"model": self.model, "input": texts}, timeout=30.0)
            response.raise_for_status()
            return self._parse_response(response.json())

class HybridEmbeddingService:
    def __init__(self, provider: str = None):
        self.dense_provider = TongyiProvider()

    async def get_dense_embeddings(self, texts: List[str]) -> List[List[float]]:
        return await self.dense_provider.get_dense_embeddings(texts)

    def get_dense_embeddings_sync(self, texts: List[str]) -> List[List[float]]:
        return self.dense_provider.get_dense_embeddings_sync(texts)

embedding_service = HybridEmbeddingService()
