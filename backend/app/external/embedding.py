from typing import List, Dict, Tuple, Any
from abc import ABC, abstractmethod
import httpx
from .config import external_settings

class EmbeddingProvider(ABC):
    @abstractmethod
    async def get_dense_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate dense embeddings for a list of texts."""
        pass

    def get_sparse_embeddings(self, texts: List[str]) -> List[Dict[int, float]]:
        """
        Generate sparse embeddings.
        """
        pass


class TongyiProvider(EmbeddingProvider):
    """Aliyun Tongyi (DashScope) implementation for dense embeddings."""

    def __init__(self):
        self.api_key = external_settings.TONGYI_API_KEY
        self.base_url = external_settings.TONGYI_BASE_URL
        self.model = external_settings.TONGYI_EMBEDDING_MODEL

    async def get_dense_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            raise ValueError("TONGYI_API_KEY is not set")

        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model,
                "input": texts
            }

            response = await client.post(
                f"{self.base_url}/embeddings",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()

            data = response.json()
            # Sort by index to maintain order
            embeddings = sorted(data["data"], key=lambda x: x["index"])
            return [item["embedding"] for item in embeddings]


class HybridEmbeddingService:
    """Service that orchestrates dense and sparse embedding generation."""

    def __init__(self, provider: str = None):
        self.provider_name = provider or external_settings.EMBEDDING_PROVIDER

        if self.provider_name == "tongyi":
            self.dense_provider = TongyiProvider()
        else:
            self.dense_provider = TongyiProvider()

    async def get_dense_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate dense embeddings via the configured provider."""
        return await self.dense_provider.get_dense_embeddings(texts)

# Global instance
embedding_service = HybridEmbeddingService()
