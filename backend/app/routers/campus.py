from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from pydantic import BaseModel

from app.database import get_db
from app.schemas import CampusRecruitmentCreate, CampusRecruitmentResponse
from app.models import CampusRecruitment
from app.utils.scraper_campus import scrape_campus

router = APIRouter(prefix="/campus", tags=["campus"])


@router.get("/", response_model=List[CampusRecruitmentResponse])
async def list_campus(skip: int = 0, limit: int = 200, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CampusRecruitment).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/run-scraper", response_model=Dict[str, Any])
async def run_campus_scraper(
    demo_id: str = "banking",
    direction: str = "金融学专业",
    max_pages: int = 3,
):
    """手动触发校招爬虫"""
    result = scrape_campus(demo_id=demo_id, direction=direction, max_pages=max_pages)
    return result


class CampusImportItem(BaseModel):
    id: int | None = None
    company: str
    positions: str = ""
    locations: str = ""
    deadline: str = ""
    industry: str = ""
    batch: str = ""
    urlType: str = ""
    sourceUrl: str = ""
    noticeUrl: str = ""
    applyUrl: str = ""
    typeTag: List[str] = []
    referralCode: str | None = None
    createTime: str = ""
    popular: int = 0


class CampusImportRequest(BaseModel):
    data: List[CampusImportItem]


@router.post("/import", response_model=Dict[str, Any])
async def import_campus_data(req: CampusImportRequest, db: AsyncSession = Depends(get_db)):
    """从求职方舟 localStorage 批量导入校招数据"""
    saved = 0
    updated = 0

    for item in req.data:
        rid = str(item.id) if item.id else None

        existing = None
        if rid:
            result = await db.execute(
                select(CampusRecruitment).where(CampusRecruitment.recruitment_id == rid)
            )
            existing = result.scalar_one_or_none()

        record_data = {
            "title": item.positions,
            "company": item.company,
            "location": item.locations,
            "industry": item.industry,
            "deadline": item.deadline,
            "source_type": item.urlType,
            "detail_url": item.sourceUrl,
            "notice_url": item.noticeUrl,
            "apply_url": item.applyUrl,
            "batch": item.batch,
            "company_type": ", ".join(item.typeTag) if item.typeTag else "",
            "referral_code": item.referralCode or "",
            "update_date": item.createTime.split("T")[0] if item.createTime else "",
        }

        if existing:
            for key, value in record_data.items():
                setattr(existing, key, value)
            updated += 1
        else:
            record = CampusRecruitment(recruitment_id=rid, **record_data)
            db.add(record)
            saved += 1

    await db.commit()
    return {"status": "success", "saved": saved, "updated": updated}


@router.post("/run-scraper-async", response_model=Dict[str, Any])
async def run_campus_scraper_async():
    """异步触发校招爬虫（Celery任务）"""
    from app.tasks.ai_tasks import scrape_campus_task
    task = scrape_campus_task.delay()
    return {
        "status": "started",
        "task_id": task.id,
        "message": "校招爬虫任务已启动",
    }


@router.get("/{campus_id}", response_model=CampusRecruitmentResponse)
async def get_campus(campus_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CampusRecruitment).where(CampusRecruitment.id == campus_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Campus recruitment not found")
    return record
