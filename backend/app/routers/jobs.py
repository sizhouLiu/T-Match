from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.schemas import JobCreate, JobResponse, JobApplicationCreate, JobApplicationResponse, JobApplicationUpdate
from app.models import Job, JobApplication
from app.tasks.ai_tasks import encode_job_vector_task

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("/", response_model=List[JobResponse])
async def list_jobs(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=JobResponse)
async def create_job(job_data: JobCreate, db: AsyncSession = Depends(get_db)):
    job = Job(**job_data.model_dump())
    db.add(job)
    await db.commit()
    await db.refresh(job)
    encode_job_vector_task.delay(job.id)
    return job

@router.post("/batch", response_model=List[JobResponse])
async def create_jobs_batch(jobs_data: List[JobCreate], db: AsyncSession = Depends(get_db)):
    jobs = []
    for job_data in jobs_data:
        result = await db.execute(select(Job).where(Job.title == job_data.title, Job.company == job_data.company))
        if not (existing := result.scalar_one_or_none()):
            job = Job(**job_data.model_dump())
            db.add(job)
            jobs.append(job)
    await db.commit()
    for job in jobs:
        await db.refresh(job)
        encode_job_vector_task.delay(job.id)
    return jobs

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    if not (job := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/apply", response_model=JobApplicationResponse)
async def apply_job(application_data: JobApplicationCreate, user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == application_data.job_id))
    if not result.scalar_one_or_none(): raise HTTPException(status_code=404, detail="Job not found")
    application = JobApplication(user_id=user_id, **application_data.model_dump())
    db.add(application)
    await db.commit()
    await db.refresh(application)
    return application

@router.get("/applications/{user_id}", response_model=List[JobApplicationResponse])
async def get_user_applications(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobApplication).where(JobApplication.user_id == user_id))
    return result.scalars().all()

@router.patch("/applications/{application_id}", response_model=JobApplicationResponse)
async def update_application(application_id: int, update_data: JobApplicationUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobApplication).where(JobApplication.id == application_id))
    if not (application := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Application not found")
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(application, key, value)
    await db.commit()
    await db.refresh(application)
    return application
