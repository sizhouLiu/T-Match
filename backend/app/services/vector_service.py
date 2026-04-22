from typing import List, Dict, Any
from pymilvus import AnnSearchRequest, WeightedRanker
from app.services.milvus_client import milvus_conn
from app.external.embedding import embedding_service
from app.config import settings
from app.models.job import Job

class VectorService:
    @staticmethod
    def build_search_text(job: Job) -> str:
        """Combine job fields into a single text block for embedding."""
        parts = []
        if job.title:
            parts.append(job.title)
        if job.company:
            parts.append(job.company)
        if getattr(job, "industry", None):
            parts.append(job.industry)
        if job.description:
            parts.append(job.description)
        if job.requirements:
            parts.append(job.requirements)
        if getattr(job, "major", None):
            parts.append(job.major)

        return " ".join(parts)

    @staticmethod
    async def insert_job_vector(job_db_id: int, position_id: str, text: str) -> None:
        """Encode text and insert into Milvus."""
        # Generate embeddings
        dense_vectors, sparse_vectors = await embedding_service.generate_hybrid_embeddings([text])

        client = milvus_conn.get_client()

        # Format data for insert
        data = [{
            "job_db_id": job_db_id,
            "position_id": position_id or "",
            "dense_vector": dense_vectors[0],
            "sparse_vector": sparse_vectors[0]
        }]

        client.insert(
            collection_name=settings.MILVUS_COLLECTION_NAME,
            data=data
        )

    @staticmethod
    def delete_job_vector(job_db_id: int) -> None:
        """Delete a job vector from Milvus."""
        client = milvus_conn.get_client()
        client.delete(
            collection_name=settings.MILVUS_COLLECTION_NAME,
            filter=f"job_db_id == {job_db_id}"
        )

    @staticmethod
    async def hybrid_search(query_text: str, top_k: int = None) -> List[Dict[str, Any]]:
        """
        Perform a hybrid search using dense and sparse vectors.
        Returns a list of dicts containing job_db_id, position_id, and match score.
        """
        if top_k is None:
            top_k = settings.VECTOR_SEARCH_TOP_K

        # Generate embeddings for the query
        dense_vectors, sparse_vectors = await embedding_service.generate_query_hybrid_embeddings([query_text])

        client = milvus_conn.get_client()

        # Prepare dense search request
        dense_search_req = AnnSearchRequest(
            data=[dense_vectors[0]],
            anns_field="dense_vector",
            param={"metric_type": "COSINE"},
            limit=top_k
        )

        # Prepare sparse search request
        sparse_search_req = AnnSearchRequest(
            data=[sparse_vectors[0]],
            anns_field="sparse_vector",
            param={"metric_type": "IP"},
            limit=top_k
        )

        # Combine with ranker
        ranker = WeightedRanker(
            settings.VECTOR_SEARCH_DENSE_WEIGHT,
            settings.VECTOR_SEARCH_SPARSE_WEIGHT
        )

        # Execute search
        results = client.hybrid_search(
            collection_name=settings.MILVUS_COLLECTION_NAME,
            reqs=[dense_search_req, sparse_search_req],
            ranker=ranker,
            limit=top_k,
            output_fields=["job_db_id", "position_id"]
        )

        # Parse results
        matches = []
        # hybrid_search returns a list of results (one per query vector)
        if results and len(results) > 0:
            for hit in results[0]:
                matches.append({
                    "job_db_id": hit.entity.get("job_db_id"),
                    "position_id": hit.entity.get("position_id"),
                    "score": hit.distance
                })

        return matches

vector_service = VectorService()
