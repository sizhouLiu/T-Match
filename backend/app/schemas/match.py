from pydantic import BaseModel
from typing import List, Optional
from app.schemas.job import JobResponse

class MatchRequest(BaseModel):
    resume_text: Optional[str] = None
    resume_id: Optional[int] = None
    top_k: int = 20

class MatchResult(BaseModel):
    job: JobResponse
    score: float

class MatchResponse(BaseModel):
    results: List[MatchResult]
    query_time_ms: float
