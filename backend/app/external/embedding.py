from typing import List, Dict, Tuple, Any
from abc import ABC, abstractmethod
import httpx
from .config import external_settings
from pymilvus.model.sparse import BM25EmbeddingFunction

class EmbeddingProvider(ABC):
    @abstractmethod
    async def get_dense_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate dense embeddings for a list of texts."""
        pass

    def get_sparse_embeddings(self, texts: List[str]) -> List[Dict[int, float]]:
        """
        Generate sparse embeddings.
        Default implementation uses local BM25 as it doesn't require an external API.
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


# Singleton for BM25 to avoid reloading/re-fitting frequently
_bm25_model = None

def get_bm25_model():
    global _bm25_model
    if _bm25_model is None:
        _bm25_model = BM25EmbeddingFunction()
        # In a real production system, you'd load a pre-fitted corpus here:
        # _bm25_model.load("bm25_model.json")
        # For now, if no model is loaded, calling encode_documents will raise an error.
        # So we'll provide a mock sparse vector fallback if it's not fitted.
    return _bm25_model

class HybridEmbeddingService:
    """Service that orchestrates dense and sparse embedding generation."""

    def __init__(self, provider: str = None):
        self.provider_name = provider or external_settings.EMBEDDING_PROVIDER

        if self.provider_name == "tongyi":
            self.dense_provider = TongyiProvider()
        else:
            # Fallback or stub
            self.dense_provider = TongyiProvider()

    def _get_mock_sparse(self, texts: List[str]) -> List[Dict[int, float]]:
        # Mock sparse vectors (just `{0: 1.0}`) to allow Milvus insertion without errors
        # when BM25 is not yet fitted.
        results = []
        for _ in texts:
            # Milvus expects a dict {index: weight} or scipy csr_matrix for sparse vectors
            results.append({0: 1.0})
        return results

    async def generate_hybrid_embeddings(self, texts: List[str]) -> Tuple[List[List[float]], List[Any]]:
        """Generate both dense and sparse embeddings concurrently where possible."""
        dense_vectors = await self.dense_provider.get_dense_embeddings(texts)

        try:
            bm25 = get_bm25_model()
            sparse_vectors = bm25.encode_documents(texts)
        except Exception:
            # Fallback if BM25 is not fitted or fails
            sparse_vectors = self._get_mock_sparse(texts)

        return dense_vectors, sparse_vectors

    async def generate_query_hybrid_embeddings(self, texts: List[str]) -> Tuple[List[List[float]], List[Any]]:
        """Generate embeddings for query text."""
        dense_vectors = await self.dense_provider.get_dense_embeddings(texts)

        try:
            bm25 = get_bm25_model()
            sparse_vectors = bm25.encode_queries(texts)
        except Exception:
            sparse_vectors = self._get_mock_sparse(texts)

        return dense_vectors, sparse_vectors

# Global instance
embedding_service = HybridEmbeddingService()
