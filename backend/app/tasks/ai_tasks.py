import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.tasks import celery_app
from app.utils.scraper_api import JobScraper
from app.services.vector_service import vector_service
from app.database import sync_session_maker
from app.models.job import Job
from app.models.resume import Resume
from app.external.llm import tongyi_llm

def run_async(coro):
    loop = asyncio.get_event_loop()
    if loop.is_running():
        import nest_asyncio
        nest_asyncio.apply()
    return loop.run_until_complete(coro)

@celery_app.task
def encode_job_vector_task(job_id: int):
    with sync_session_maker() as session:
        if not (job := session.get(Job, job_id)): return {"job_id": job_id, "status": "failed", "error": "Job not found"}
        if not (text := vector_service.build_search_text(job)): return {"job_id": job_id, "status": "skipped", "reason": "No text content"}
        try:
            run_async(vector_service.insert_job_vector(job.id, job.position_id, text))
            return {"job_id": job_id, "status": "indexed"}
        except Exception as e:
            return {"job_id": job_id, "status": "failed", "error": str(e)}

@celery_app.task
def batch_encode_jobs_task():
    with sync_session_maker() as session:
        jobs = session.query(Job).all()
        indexed_count = 0
        failed_count = 0
        for job in jobs:
            if not (text := vector_service.build_search_text(job)): continue
            try:
                run_async(vector_service.insert_job_vector(job.id, job.position_id, text))
                indexed_count += 1
            except Exception:
                failed_count += 1
        return {"status": "completed", "indexed": indexed_count, "failed": failed_count, "total": len(jobs)}

@celery_app.task
def optimize_resume_task(resume_id: int, job_description: str):
    return {"resume_id": resume_id, "status": "optimized", "suggestions": ["Add more quantifiable achievements", "Include relevant keywords from job description", "Highlight transferable skills"]}

@celery_app.task
def auto_fill_application_task(job_url: str, user_data: dict):
    return {"job_url": job_url, "status": "filled", "fields_populated": len(user_data)}

@celery_app.task
def scrape_jobs_task():
    from app.utils.scraper import scrape_jobs
    return scrape_jobs()

@celery_app.task
def scrape_jobs_for_resume_task(resume_id: int):
    with sync_session_maker() as session:
        if not (resume := session.get(Resume, resume_id)): return {"resume_id": resume_id, "status": "failed", "error": "Resume not found"}
        if not resume.original_text or not resume.original_text.strip(): return {"resume_id": resume_id, "status": "skipped", "reason": "No original_text"}
        try:
            if not (major := run_async(tongyi_llm.extract_major(resume.original_text))): return {"resume_id": resume_id, "status": "failed", "error": "Failed to extract major"}
        except Exception as e:
            return {"resume_id": resume_id, "status": "failed", "error": f"Extract major failed: {str(e)}"}
        scraper = JobScraper()
        try:
            jobs_data = scraper.fetch_jobs_api(demo_id="cs", direction=f"{major}专业", max_pages=2)
        except Exception as e:
            scraper.close()
            return {"resume_id": resume_id, "major": major, "status": "failed", "error": f"Scrape failed: {str(e)}"}
        before_save = datetime.now() - timedelta(seconds=5)
        try:
            saved_count = scraper.save_jobs(jobs_data)
        except Exception as e:
            scraper.close()
            return {"resume_id": resume_id, "major": major, "status": "failed", "error": f"Save failed: {str(e)}"}
        finally:
            scraper.close()
        result = session.execute(select(Job).where(Job.created_at >= before_save).order_by(Job.id))
        new_jobs = result.scalars().all()
        saved_job_ids = [job.id for job in new_jobs]
        for job_id in saved_job_ids:
            encode_job_vector_task.delay(job_id)
        return {"resume_id": resume_id, "major": major, "status": "success", "fetched": len(jobs_data), "saved": saved_count, "encoded_jobs": len(saved_job_ids)}