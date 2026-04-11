from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.job import ApplicationStatus


class JobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    job_type: Optional[str] = None
    source_url: Optional[str] = None
    # 求职方舟字段
    update_date: Optional[str] = None
    company_type: Optional[str] = None
    industry: Optional[str] = None
    credit_score: Optional[str] = None
    match_score: Optional[str] = None
    education: Optional[str] = None
    grade: Optional[str] = None
    major: Optional[str] = None
    detail_url: Optional[str] = None


class JobCreate(JobBase):
    pass


class JobResponse(JobBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class JobApplicationBase(BaseModel):
    job_id: int
    notes: Optional[str] = None


class JobApplicationCreate(JobApplicationBase):
    pass


class JobApplicationResponse(JobApplicationBase):
    id: int
    user_id: int
    status: ApplicationStatus
    applied_at: datetime

    class Config:
        from_attributes = True


class JobApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
