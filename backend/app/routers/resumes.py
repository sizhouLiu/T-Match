from fastapi import APIRouter, Depends, HTTPException, UploadFile, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging
import os

from app.database import get_db
from app.schemas import ResumeCreate, ResumeUpdate, ResumeResponse
from app.models import Resume

router = APIRouter(prefix="/resumes", tags=["resumes"])
logger = logging.getLogger(__name__)

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

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 10 * 1024 * 1024

@router.post("/parse-file")
async def parse_resume_file(file: UploadFile):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS: raise HTTPException(status_code=400, detail=f"不支持的文件格式: {ext}，仅支持 PDF/Word")
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE: raise HTTPException(status_code=400, detail="文件大小超过 10MB 限制")
    try:
        from app.external.llm import tongyi_llm
        if ext == ".pdf":
            from app.utils.file_converter import pdf_to_images_b64
            images = await pdf_to_images_b64(file_bytes)
            if not images: raise HTTPException(status_code=400, detail="PDF 文件无有效页面")
            return await tongyi_llm.parse_resume_vl(images)
        else:
            from app.utils.file_converter import docx_to_text
            text = await docx_to_text(file_bytes)
            if not text.strip(): raise HTTPException(status_code=400, detail="Word 文件无有效内容")
            return await tongyi_llm.parse_resume_text(text)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("resume_parse_failed")
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")
