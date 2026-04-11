from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any


class ResumeBase(BaseModel):
    title: str
    content: Dict[str, Any]
    original_text: Optional[str] = None


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    optimized_text: Optional[str] = None
    is_primary: Optional[int] = None


class ResumeResponse(ResumeBase):
    id: int
    user_id: int
    optimized_text: Optional[str] = None
    is_primary: int
    created_at: datetime

    class Config:
        from_attributes = True
