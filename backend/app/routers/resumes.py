from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging
import os

from app.database import get_db
from app.schemas import ResumeCreate, ResumeUpdate, ResumeResponse, MarkdownEditRequest
from app.models import Resume
from app.routers.auth import get_current_user, User

router = APIRouter(prefix="/resumes", tags=["resumes"])
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.user_id == current_user.id))
    return result.scalars().all()

@router.post("/", response_model=ResumeResponse)
async def create_resume(resume_data: ResumeCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    resume = Resume(user_id=current_user.id, **resume_data.model_dump())
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    from app.tasks.ai_tasks import scrape_jobs_for_resume_task, encode_resume_vector_task
    if resume.original_text:
        scrape_jobs_for_resume_task.delay(resume.id)
    if resume.content:
        encode_resume_vector_task.delay(resume.id)
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
    from app.tasks.ai_tasks import encode_resume_vector_task
    if resume.content:
        encode_resume_vector_task.delay(resume.id)
    return resume

@router.delete("/{resume_id}")
async def delete_resume(resume_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    if not (resume := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Resume not found")
    await db.delete(resume)
    await db.commit()
    return {"message": "Resume deleted"}

@router.post("/{resume_id}/optimize")
async def optimize_resume(resume_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    if not (resume := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Resume not found")
    try:
        from app.services.ai_service import optimize_resume_with_ai
        import json
        resume_text = json.dumps(resume.content, ensure_ascii=False, indent=2)
        optimized = await optimize_resume_with_ai(resume_text)
        return {"optimized_text": optimized}
    except Exception as e:
        logger.exception("optimize_failed")
        raise HTTPException(status_code=500, detail=f"优化失败: {str(e)}")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 10 * 1024 * 1024

@router.post("/{resume_id}/convert-to-markdown")
async def convert_to_markdown(resume_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    if not (resume := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Resume not found")
    from app.services.markdown_service import resume_to_markdown
    markdown = resume_to_markdown(resume.content)
    resume.original_text = markdown
    await db.commit()
    return {"markdown": markdown}

@router.post("/{resume_id}/convert-from-markdown", response_model=ResumeResponse)
async def convert_from_markdown(resume_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    if not (resume := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Resume not found")
    if not resume.original_text: raise HTTPException(status_code=400, detail="No markdown text found in original_text")
    from app.services.markdown_service import markdown_to_resume
    resume.content = markdown_to_resume(resume.original_text)
    await db.commit()
    await db.refresh(resume)
    from app.tasks.ai_tasks import encode_resume_vector_task
    encode_resume_vector_task.delay(resume.id)
    return resume

@router.post("/{resume_id}/ai-edit-markdown")
async def ai_edit_markdown(resume_id: int, request: MarkdownEditRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    if not (resume := result.scalar_one_or_none()): raise HTTPException(status_code=404, detail="Resume not found")
    if not request.markdown.strip(): raise HTTPException(status_code=400, detail="Markdown内容不能为空")
    if not request.instruction.strip(): raise HTTPException(status_code=400, detail="编辑指令不能为空")
    from app.services.ai_markdown_service import edit_resume_markdown
    from app.services.markdown_service import markdown_to_resume
    edited_md = await edit_resume_markdown(request.markdown, request.instruction)
    if not edited_md: raise HTTPException(status_code=500, detail="AI 编辑返回空内容")
    try:
        parsed = markdown_to_resume(edited_md)
    except Exception as e:
        logger.exception("markdown_parse_failed")
        raise HTTPException(status_code=500, detail=f"AI 返回的 Markdown 解析失败: {str(e)}")
    resume.original_text = edited_md
    resume.content = parsed
    await db.commit()
    await db.refresh(resume)
    from app.tasks.ai_tasks import encode_resume_vector_task
    encode_resume_vector_task.delay(resume.id)
    return {"markdown": edited_md, "content": parsed}

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
