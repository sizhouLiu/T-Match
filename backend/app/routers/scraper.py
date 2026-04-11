from fastapi import APIRouter, BackgroundTasks
from typing import Dict, Any

from app.tasks.ai_tasks import scrape_jobs_task
from app.utils.scraper import scrape_jobs

router = APIRouter(prefix="/scraper", tags=["scraper"])


@router.post("/run", response_model=Dict[str, Any])
async def run_scraper(background_tasks: BackgroundTasks):
    """运行爬虫（异步后台任务）"""
    task = scrape_jobs_task.delay()
    return {
        "status": "started",
        "task_id": task.id,
        "message": "爬虫任务已启动，请稍后查看结果"
    }


@router.get("/run-sync", response_model=Dict[str, Any])
async def run_scraper_sync():
    """运行爬虫（同步）"""
    result = scrape_jobs()
    return result


@router.get("/task/{task_id}")
async def get_task_result(task_id: str):
    """获取爬虫任务结果"""
    from celery.result import AsyncResult
    task_result = AsyncResult(task_id)
    
    return {
        "task_id": task_id,
        "status": task_result.status,
        "result": task_result.result if task_result.ready() else None,
    }
