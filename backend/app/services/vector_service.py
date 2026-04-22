from typing import List, Dict, Any
from pymilvus import AnnSearchRequest, WeightedRanker
from sqlalchemy import select
from app.services.milvus_client import milvus_conn
from app.external.embedding import embedding_service
from app.external.rerank import tongyi_reranker
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
    async def hybrid_search(query_text: str, top_k: int = None, use_rerank: bool = False, db_session = None) -> List[Dict[str, Any]]:
        if top_k is None: top_k = settings.VECTOR_SEARCH_TOP_K
        recall_k = int(top_k * 2.5) if use_rerank else top_k
        dense_vectors = await embedding_service.get_dense_embeddings([query_text])
        client = milvus_conn.get_client()
        dense_search_req = AnnSearchRequest(data=[dense_vectors[0]], anns_field="dense_vector", param={"metric_type": "COSINE"}, limit=recall_k)
        sparse_search_req = AnnSearchRequest(data=[query_text], anns_field="sparse_vector", param={"metric_type": "BM25"}, limit=recall_k)
        ranker = WeightedRanker(settings.VECTOR_SEARCH_DENSE_WEIGHT, settings.VECTOR_SEARCH_SPARSE_WEIGHT)
        results = client.hybrid_search(collection_name=settings.MILVUS_COLLECTION_NAME, reqs=[dense_search_req, sparse_search_req], ranker=ranker, limit=recall_k, output_fields=["job_db_id", "position_id"])
        if not results or not results[0]: return []
        matches = [{"job_db_id": hit.entity.get("job_db_id"), "position_id": hit.entity.get("position_id"), "score": hit.distance} for hit in results[0]]
        if not use_rerank or not db_session: return matches[:top_k]
        job_ids = [m["job_db_id"] for m in matches]
        result = await db_session.execute(select(Job).filter(Job.id.in_(job_ids)))
        jobs = {job.id: job for job in result.scalars().all()}
        documents = [VectorService.build_search_text(jobs[m["job_db_id"]]) for m in matches if m["job_db_id"] in jobs]
        rerank_results = await tongyi_reranker.rerank(query_text, documents, top_k=top_k)
        reranked_matches = []
        for rr in rerank_results:
            original_match = matches[rr.index]
            reranked_matches.append({"job_db_id": original_match["job_db_id"], "position_id": original_match["position_id"], "score": rr.score})
        return reranked_matches

vector_service = VectorService()
