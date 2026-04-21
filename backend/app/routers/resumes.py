import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.schemas import ResumeCreate, ResumeUpdate, ResumeResponse
from app.models import Resume, User
from app.services.ai_service import optimize_resume_with_ai
from app.middleware.auth import require_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    # 只能查看自己的简历
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(select(Resume).where(Resume.user_id == user_id))
    return result.scalars().all()


@router.post("/", response_model=ResumeResponse)
async def create_resume(
    resume_data: ResumeCreate,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    # 只能为自己创建简历
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    resume = Resume(user_id=user_id, **resume_data.model_dump())
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # 只能查看自己的简历
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return resume


@router.patch("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: int,
    update_data: ResumeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # 只能修改自己的简历
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(resume, key, value)

    await db.commit()
    await db.refresh(resume)
    return resume


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # 只能删除自己的简历
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.delete(resume)
    await db.commit()
    return {"message": "Resume deleted"}


@router.post("/{resume_id}/optimize")
async def ai_optimize_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # 只能优化自己的简历
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        resume_text = json.dumps(resume.content, ensure_ascii=False, indent=2)
        optimized_text = await optimize_resume_with_ai(resume_text)
    except Exception as e:
        logger.error(f"AI optimize failed: {e}")
        raise HTTPException(status_code=500, detail="AI 优化服务暂时不可用")

    resume.optimized_text = optimized_text
    await db.commit()
    await db.refresh(resume)

    return {"optimized_text": optimized_text}
