from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CampusRecruitmentBase(BaseModel):
    title: str
    company: str
    company_type: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    education: Optional[str] = None
    grade: Optional[str] = None
    major: Optional[str] = None
    deadline: Optional[str] = None
    source_type: Optional[str] = None
    detail_url: Optional[str] = None
    credit_score: Optional[str] = None
    update_date: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    notice_url: Optional[str] = None
    apply_url: Optional[str] = None
    batch: Optional[str] = None
    referral_code: Optional[str] = None


class CampusRecruitmentCreate(CampusRecruitmentBase):
    recruitment_id: Optional[str] = None


class CampusRecruitmentResponse(CampusRecruitmentBase):
    id: int
    recruitment_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
