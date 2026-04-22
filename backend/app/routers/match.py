import time
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.match import MatchRequest, MatchResponse, MatchResult
from app.services.vector_service import vector_service

router = APIRouter(prefix="/match", tags=["match"])

@router.post("/resume-to-jobs", response_model=MatchResponse)
async def match_resume_to_jobs(
    request: MatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search for jobs that match a resume.
    Provide either resume_id (stored resume) or resume_text (raw text).
    """
    start_time = time.time()

    query_text = ""

    if request.resume_text:
        query_text = request.resume_text
    elif request.resume_id:
        result = await db.execute(
            select(Resume).filter(Resume.id == request.resume_id, Resume.user_id == current_user.id)
        )
        resume = result.scalars().first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        query_text = resume.original_text or str(resume.content)
    else:
        raise HTTPException(status_code=400, detail="Must provide either resume_text or resume_id")

    if not query_text:
        raise HTTPException(status_code=400, detail="Query text is empty")

    # Perform hybrid search
    try:
        matches = await vector_service.hybrid_search(query_text, top_k=request.top_k)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    if not matches:
        return MatchResponse(results=[], query_time_ms=(time.time() - start_time) * 1000)

    # Extract job IDs and order mapping
    job_ids = [m["job_db_id"] for m in matches if m["job_db_id"] is not None]

    if not job_ids:
        return MatchResponse(results=[], query_time_ms=(time.time() - start_time) * 1000)

    score_map = {m["job_db_id"]: m["score"] for m in matches}

    # Fetch jobs from PostgreSQL
    result = await db.execute(select(Job).filter(Job.id.in_(job_ids)))
    jobs = result.scalars().all()

    # Combine jobs and scores, maintaining the sort order from Milvus
    job_results = []
    for job in jobs:
        score = score_map.get(job.id, 0.0)
        job_results.append(MatchResult(job=job, score=score))

    # Sort descending by score
    job_results.sort(key=lambda x: x.score, reverse=True)

    end_time = time.time()

    return MatchResponse(
        results=job_results,
        query_time_ms=(end_time - start_time) * 1000
    )


@router.post("/reindex")
async def reindex_all_jobs(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Admin endpoint to reindex all jobs into Milvus.
    (Simple implementation requires checking user role in a real app)
    """
    # Trigger celery task for batch reindexing
    from app.tasks.ai_tasks import batch_encode_jobs_task
    batch_encode_jobs_task.delay()

    return {"message": "Reindex task submitted"}
