from typing import List, Dict, Any
from pymilvus import AnnSearchRequest, WeightedRanker
from app.services.milvus_client import milvus_conn
from app.external.embedding import embedding_service
from app.config import settings
from app.models.job import Job

class VectorService:
    @staticmethod
    def build_search_text(job: Job) -> str:
        parts = []
        if job.title: parts.append(job.title)
        if job.company: parts.append(job.company)
        if getattr(job, "industry", None): parts.append(job.industry)
        if job.description: parts.append(job.description)
        if job.requirements: parts.append(job.requirements)
        if getattr(job, "major", None): parts.append(job.major)
        return " ".join(parts)

    @staticmethod
    async def insert_job_vector(job_db_id: int, position_id: str, text: str) -> None:
        dense_vectors = await embedding_service.get_dense_embeddings([text])
        client = milvus_conn.get_client()
        data = [{"job_db_id": job_db_id, "position_id": position_id or "", "text": text, "dense_vector": dense_vectors[0]}]
        client.insert(collection_name=settings.MILVUS_COLLECTION_NAME, data=data)

    @staticmethod
    def insert_job_vector_sync(job_db_id: int, position_id: str, text: str) -> None:
        dense_vectors = embedding_service.get_dense_embeddings_sync([text])
        client = milvus_conn.get_client()
        data = [{"job_db_id": job_db_id, "position_id": position_id or "", "text": text, "dense_vector": dense_vectors[0]}]
        client.insert(collection_name=settings.MILVUS_COLLECTION_NAME, data=data)

    @staticmethod
    def delete_job_vector(job_db_id: int) -> None:
        milvus_conn.get_client().delete(collection_name=settings.MILVUS_COLLECTION_NAME, filter=f"job_db_id == {job_db_id}")

    @staticmethod
    async def hybrid_search(query_text: str, top_k: int = None) -> List[Dict[str, Any]]:
        if top_k is None: top_k = settings.VECTOR_SEARCH_TOP_K
        dense_vectors = await embedding_service.get_dense_embeddings([query_text])
        client = milvus_conn.get_client()
        dense_search_req = AnnSearchRequest(data=[dense_vectors[0]], anns_field="dense_vector", param={"metric_type": "COSINE"}, limit=top_k)
        sparse_search_req = AnnSearchRequest(data=[query_text], anns_field="sparse_vector", param={"metric_type": "BM25"}, limit=top_k)
        ranker = WeightedRanker(settings.VECTOR_SEARCH_DENSE_WEIGHT, settings.VECTOR_SEARCH_SPARSE_WEIGHT)
        results = client.hybrid_search(collection_name=settings.MILVUS_COLLECTION_NAME, reqs=[dense_search_req, sparse_search_req], ranker=ranker, limit=top_k, output_fields=["job_db_id", "position_id"])
        if not results or not results[0]: return []
        return [{"job_db_id": hit.entity.get("job_db_id"), "position_id": hit.entity.get("position_id"), "score": hit.distance} for hit in results[0]]

vector_service = VectorService()
