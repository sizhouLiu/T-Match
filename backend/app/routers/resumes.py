from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.schemas import ResumeCreate, ResumeUpdate, ResumeResponse
from app.models import Resume

router = APIRouter(prefix="/resumes", tags=["resumes"])

@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.user_id == user_id))
    return result.scalars().all()

@router.post("/", response_model=ResumeResponse)
async def create_resume(resume_data: ResumeCreate, user_id: int, db: AsyncSession = Depends(get_db)):
    resume = Resume(user_id=user_id, **resume_data.model_dump())
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    if resume.original_text:
        from app.tasks.ai_tasks import scrape_jobs_for_resume_task
        scrape_jobs_for_resume_task.delay(resume.id)
    return resume

@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    if not (resume := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@router.patch("/{resume_id}", response_model=ResumeResponse)
async def update_resume(resume_id: int, update_data: ResumeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    if not (resume := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Resume not found")
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(resume, key, value)
    await db.commit()
    await db.refresh(resume)
    return resume

@router.delete("/{resume_id}")
async def delete_resume(resume_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    if not (resume := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Resume not found")
    await db.delete(resume)
    await db.commit()
    return {"message": "Resume deleted"}
