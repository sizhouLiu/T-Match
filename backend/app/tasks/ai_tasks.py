import asyncio
from datetime import datetime, timedelta
from app.tasks import celery_app
from app.config import settings
from app.utils.scraper import scrape_jobs
from app.utils.scraper_api import JobScraper
from app.services.vector_service import vector_service
from app.database import sync_session_maker
from app.models.job import Job
from app.models.resume import Resume
from app.external.llm import tongyi_llm

def run_async(coro):
    """Run async coroutine in a synchronous context."""
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # If loop is already running, we can't use run_until_complete directly.
        # But in a Celery worker, it typically isn't running.
        import nest_asyncio
        nest_asyncio.apply()
    return loop.run_until_complete(coro)

@celery_app.task
def encode_job_vector_task(job_id: int):
    """Encode job and insert into Milvus"""
    with sync_session_maker() as session:
        job = session.get(Job, job_id)
        if not job:
            return {"job_id": job_id, "status": "failed", "error": "Job not found"}

        text = vector_service.build_search_text(job)
        if not text:
            return {"job_id": job_id, "status": "skipped", "reason": "No text content"}

        try:
            # We must use run_async since the embedding provider uses httpx.AsyncClient
            run_async(vector_service.insert_job_vector(job.id, job.position_id, text))
            return {"job_id": job_id, "status": "indexed"}
        except Exception as e:
            return {"job_id": job_id, "status": "failed", "error": str(e)}

@celery_app.task
def batch_encode_jobs_task():
    """Encode all jobs that are not yet in Milvus (simple backfill implementation)"""
    with sync_session_maker() as session:
        jobs = session.query(Job).all()

        indexed_count = 0
        failed_count = 0

        for job in jobs:
            text = vector_service.build_search_text(job)
            if not text:
                continue

            try:
                run_async(vector_service.insert_job_vector(job.id, job.position_id, text))
                indexed_count += 1
            except Exception:
                failed_count += 1

        return {
            "status": "completed",
            "indexed": indexed_count,
            "failed": failed_count,
            "total": len(jobs)
        }


@celery_app.task
def optimize_resume_task(resume_id: int, job_description: str):
    """Optimize resume using AI"""
    # This is a placeholder - integrate with actual AI service
    result = {
        "resume_id": resume_id,
        "status": "optimized",
        "suggestions": [
            "Add more quantifiable achievements",
            "Include relevant keywords from job description",
            "Highlight transferable skills"
        ]
    }
    return result


@celery_app.task
def auto_fill_application_task(job_url: str, user_data: dict):
    """Auto-fill job application - requires browser automation"""
    result = {
        "job_url": job_url,
        "status": "filled",
        "fields_populated": len(user_data)
    }
    return result


@celery_app.task
def scrape_jobs_task():
    """爬取职位数据任务"""
    result = scrape_jobs()
    return result

@celery_app.task
def scrape_jobs_for_resume_task(resume_id: int):
    """根据简历专业爬取相关岗位并编码入 Milvus"""
    with sync_session_maker() as session:
        resume = session.get(Resume, resume_id)
        if not resume:
            return {"resume_id": resume_id, "status": "failed", "error": "Resume not found"}

        if not resume.original_text or not resume.original_text.strip():
            return {"resume_id": resume_id, "status": "skipped", "reason": "No original_text"}

        # 1. 提取专业
        try:
            major = run_async(tongyi_llm.extract_major(resume.original_text))
            if not major:
                return {"resume_id": resume_id, "status": "failed", "error": "Failed to extract major"}
        except Exception as e:
            return {"resume_id": resume_id, "status": "failed", "error": f"Extract major failed: {str(e)}"}

        # 2. 爬取岗位
        scraper = JobScraper()
        try:
            jobs_data = scraper.fetch_jobs_api(
                demo_id="cs",  # 默认用 cs，可以根据专业映射
                direction=f"{major}专业",
                max_pages=2
            )
        except Exception as e:
            scraper.close()
            return {"resume_id": resume_id, "major": major, "status": "failed", "error": f"Scrape failed: {str(e)}"}

        # 3. 保存岗位并收集 job_id
        saved_job_ids = []
        before_save = datetime.now() - timedelta(seconds=5)

        try:
            saved_count = scraper.save_jobs(jobs_data)
        except Exception as e:
            scraper.close()
            return {"resume_id": resume_id, "major": major, "status": "failed", "error": f"Save failed: {str(e)}"}
        finally:
            scraper.close()

        # 4. 查询刚保存的 jobs（通过 created_at 时间范围）
        from sqlalchemy import select
        result = session.execute(
            select(Job).where(Job.created_at >= before_save).order_by(Job.id)
        )
        new_jobs = result.scalars().all()
        saved_job_ids = [job.id for job in new_jobs]

        # 5. 触发向量编码任务
        for job_id in saved_job_ids:
            encode_job_vector_task.delay(job_id)

        return {
            "resume_id": resume_id,
            "major": major,
            "status": "success",
            "fetched": len(jobs_data),
            "saved": saved_count,
            "encoded_jobs": len(saved_job_ids)
        }

def test2():
    pass