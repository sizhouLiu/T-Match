from fastapi import APIRouter, BackgroundTasks
from typing import Dict, Any

from app.utils.scraper_api import scrape_jobs as scrape_jobs_api
from app.utils.scraper import scrape_jobs as scrape_jobs_browser

router = APIRouter(prefix="/scraper", tags=["scraper"])


@router.post("/run", response_model=Dict[str, Any])
async def run_scraper(background_tasks: BackgroundTasks):
    """运行爬虫（异步后台任务 - 使用API）"""
    from app.tasks.ai_tasks import scrape_jobs_task
    task = scrape_jobs_task.delay()
    return {
        "status": "started",
        "task_id": task.id,
        "message": "爬虫任务已启动"
    }


@router.get("/run-api", response_model=Dict[str, Any])
async def run_scraper_api(
    demo_id: str = "banking",
    direction: str = "金融学专业",
    max_pages: int = 1,
):
    """运行爬虫（同步 - 使用API，更节省token）
    
    Args:
        demo_id: 方向ID，如 banking, surveying 等
        direction: 方向名称，如 金融学专业, 测绘专业 等
        max_pages: 最大爬取页数，默认1页（每页50条）
    """
    result = scrape_jobs_api(
        demo_id=demo_id,
        direction=direction,
        max_pages=max_pages,
    )
    return result


@router.get("/run-browser", response_model=Dict[str, Any])
async def run_scraper_browser():
    """运行爬虫（同步 - 使用浏览器）"""
    result = scrape_jobs_browser()
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
