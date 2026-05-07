from typing import List, Dict, Any
from pymilvus import AnnSearchRequest, WeightedRanker
from sqlalchemy import select
from app.services.milvus_client import milvus_conn
from app.external.embedding import embedding_service
from app.external.rerank import tongyi_reranker
from app.config import settings
from app.models.job import Job
from app.utils.chunking import chunk_job, chunk_resume


class VectorService:
    @staticmethod
    def build_search_text(job: Job) -> str:
        parts = [p for p in [job.title, job.company, getattr(job, "industry", None), job.description, job.requirements, getattr(job, "major", None)] if p]
        return " ".join(parts)

    # ── Job vectors ──────────────────────────────────────────────────────────

    @staticmethod
    async def insert_job_vector(job: Job) -> None:
        chunks = chunk_job(job)
        dense_vectors = await embedding_service.get_dense_embeddings(chunks)
        client = milvus_conn.get_client()
        client.delete(collection_name=settings.MILVUS_COLLECTION_NAME, filter=f"job_db_id == {job.id}")
        data = [{"job_db_id": job.id, "position_id": job.position_id or "", "chunk_index": i, "text": text, "dense_vector": vec} for i, (text, vec) in enumerate(zip(chunks, dense_vectors))]
        client.insert(collection_name=settings.MILVUS_COLLECTION_NAME, data=data)

    @staticmethod
    def insert_job_vector_sync(job: Job) -> None:
        chunks = chunk_job(job)
        dense_vectors = embedding_service.get_dense_embeddings_sync(chunks)
        client = milvus_conn.get_client()
        client.delete(collection_name=settings.MILVUS_COLLECTION_NAME, filter=f"job_db_id == {job.id}")
        data = [{"job_db_id": job.id, "position_id": job.position_id or "", "chunk_index": i, "text": text, "dense_vector": vec} for i, (text, vec) in enumerate(zip(chunks, dense_vectors))]
        client.insert(collection_name=settings.MILVUS_COLLECTION_NAME, data=data)

    @staticmethod
    def delete_job_vector(job_db_id: int) -> None:
        milvus_conn.get_client().delete(collection_name=settings.MILVUS_COLLECTION_NAME, filter=f"job_db_id == {job_db_id}")

    # ── Resume vectors ───────────────────────────────────────────────────────

    @staticmethod
    async def insert_resume_vector(resume_id: int, resume_data: dict) -> None:
        chunks = chunk_resume(resume_data)
        dense_vectors = await embedding_service.get_dense_embeddings(chunks)
        client = milvus_conn.get_client()
        client.delete(collection_name=settings.MILVUS_RESUME_COLLECTION, filter=f"resume_db_id == {resume_id}")
        data = [{"resume_db_id": resume_id, "chunk_index": i, "text": text, "dense_vector": vec} for i, (text, vec) in enumerate(zip(chunks, dense_vectors))]
        client.insert(collection_name=settings.MILVUS_RESUME_COLLECTION, data=data)

    @staticmethod
    def insert_resume_vector_sync(resume_id: int, resume_data: dict) -> None:
        chunks = chunk_resume(resume_data)
        dense_vectors = embedding_service.get_dense_embeddings_sync(chunks)
        client = milvus_conn.get_client()
        client.delete(collection_name=settings.MILVUS_RESUME_COLLECTION, filter=f"resume_db_id == {resume_id}")
        data = [{"resume_db_id": resume_id, "chunk_index": i, "text": text, "dense_vector": vec} for i, (text, vec) in enumerate(zip(chunks, dense_vectors))]
        client.insert(collection_name=settings.MILVUS_RESUME_COLLECTION, data=data)

    @staticmethod
    def delete_resume_vector(resume_id: int) -> None:
        milvus_conn.get_client().delete(collection_name=settings.MILVUS_RESUME_COLLECTION, filter=f"resume_db_id == {resume_id}")

    # ── Search ───────────────────────────────────────────────────────────────

    @staticmethod
    async def hybrid_search(query_text: str, top_k: int = None, use_rerank: bool = False, db_session=None) -> List[Dict[str, Any]]:
        if top_k is None: top_k = settings.VECTOR_SEARCH_TOP_K
        recall_k = min(int(top_k * 3), 100) if use_rerank else top_k * 2
        dense_vectors = await embedding_service.get_dense_embeddings([query_text])
        client = milvus_conn.get_client()
        dense_req = AnnSearchRequest(data=[dense_vectors[0]], anns_field="dense_vector", param={"metric_type": "COSINE"}, limit=recall_k)
        sparse_req = AnnSearchRequest(data=[query_text], anns_field="sparse_vector", param={"metric_type": "BM25"}, limit=recall_k)
        ranker = WeightedRanker(settings.VECTOR_SEARCH_DENSE_WEIGHT, settings.VECTOR_SEARCH_SPARSE_WEIGHT)
        results = client.hybrid_search(collection_name=settings.MILVUS_COLLECTION_NAME, reqs=[dense_req, sparse_req], ranker=ranker, limit=recall_k, output_fields=["job_db_id", "position_id"])
        if not results or not results[0]: return []
        # 按 job_db_id 去重，保留最高分 chunk
        seen: Dict[int, Dict] = {}
        for hit in results[0]:
            jid = hit.entity.get("job_db_id")
            if jid is None: continue
            if jid not in seen or hit.distance > seen[jid]["score"]:
                seen[jid] = {"job_db_id": jid, "position_id": hit.entity.get("position_id"), "score": hit.distance}
        matches = sorted(seen.values(), key=lambda x: x["score"], reverse=True)
        if not use_rerank or not db_session: return matches[:top_k]
        job_ids = [m["job_db_id"] for m in matches]
        result = await db_session.execute(select(Job).filter(Job.id.in_(job_ids)))
        jobs = {job.id: job for job in result.scalars().all()}
        documents = [VectorService.build_search_text(jobs[m["job_db_id"]]) for m in matches if m["job_db_id"] in jobs]
        rerank_results = await tongyi_reranker.rerank(query_text, documents, top_k=top_k)
        return [{"job_db_id": matches[rr.index]["job_db_id"], "position_id": matches[rr.index]["position_id"], "score": rr.score} for rr in rerank_results]


vector_service = VectorService()
