from typing import List, Dict
import httpx
from .config import external_settings

class RerankResult:
    def __init__(self, index: int, score: float, document: str):
        self.index = index
        self.score = score
        self.document = document

class TongyiReranker:
    def __init__(self):
        self.api_key = external_settings.TONGYI_API_KEY
        self.base_url = external_settings.TONGYI_BASE_URL
        self.model = external_settings.TONGYI_RERANK_MODEL

    def _headers(self) -> dict:
        if not self.api_key: raise ValueError("TONGYI_API_KEY is not set")
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    async def rerank(self, query: str, documents: List[str], top_k: int = None) -> List[RerankResult]:
        if not documents: return []
        async with httpx.AsyncClient() as client:
            payload = {"model": self.model, "query": query, "documents": documents}
            if top_k: payload["top_n"] = top_k
            response = await client.post(f"{self.base_url}/rerank", headers=self._headers(), json=payload, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            return [RerankResult(index=r["index"], score=r["relevance_score"], document=documents[r["index"]]) for r in data["results"]]

    def rerank_sync(self, query: str, documents: List[str], top_k: int = None) -> List[RerankResult]:
        if not documents: return []
        with httpx.Client() as client:
            payload = {"model": self.model, "query": query, "documents": documents}
            if top_k: payload["top_n"] = top_k
            response = client.post(f"{self.base_url}/rerank", headers=self._headers(), json=payload, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            return [RerankResult(index=r["index"], score=r["relevance_score"], document=documents[r["index"]]) for r in data["results"]]

tongyi_reranker = TongyiReranker()
