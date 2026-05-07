from datetime import datetime, timedelta
from sqlalchemy import select
from app.tasks import celery_app
from app.utils.scraper_api import JobScraper
from app.services.vector_service import vector_service
from app.database import sync_session_maker
from app.models.job import Job
from app.models.resume import Resume
from app.external.llm import tongyi_llm


@celery_app.task
def encode_job_vector_task(job_id: int):
    with sync_session_maker() as session:
        if not (job := session.get(Job, job_id)): return {"job_id": job_id, "status": "failed", "error": "Job not found"}
        try:
            vector_service.insert_job_vector_sync(job)
            return {"job_id": job_id, "status": "indexed"}
        except Exception as e:
            return {"job_id": job_id, "status": "failed", "error": str(e)}


@celery_app.task
def batch_encode_jobs_task():
    with sync_session_maker() as session:
        jobs = session.query(Job).all()
        indexed, failed = 0, 0
        for job in jobs:
            try:
                vector_service.insert_job_vector_sync(job)
                indexed += 1
            except Exception:
                failed += 1
        return {"status": "completed", "indexed": indexed, "failed": failed, "total": len(jobs)}


@celery_app.task
def encode_resume_vector_task(resume_id: int):
    with sync_session_maker() as session:
        if not (resume := session.get(Resume, resume_id)): return {"resume_id": resume_id, "status": "failed", "error": "Resume not found"}
        if not resume.content: return {"resume_id": resume_id, "status": "skipped", "reason": "No content"}
        try:
            vector_service.insert_resume_vector_sync(resume.id, resume.content)
            return {"resume_id": resume_id, "status": "indexed"}
        except Exception as e:
            return {"resume_id": resume_id, "status": "failed", "error": str(e)}


@celery_app.task
def scrape_jobs_task():
    from app.utils.scraper import scrape_jobs
    return scrape_jobs()


@celery_app.task
def scrape_campus_task():
    from app.utils.scraper_campus import scrape_campus
    return scrape_campus()


@celery_app.task
def daily_sync_all_task():
    return {"jobs": scrape_jobs_task(), "campus": scrape_campus_task()}


@celery_app.task
def scrape_jobs_for_resume_task(resume_id: int):
    with sync_session_maker() as session:
        if not (resume := session.get(Resume, resume_id)): return {"resume_id": resume_id, "status": "failed", "error": "Resume not found"}
        if not resume.original_text or not resume.original_text.strip(): return {"resume_id": resume_id, "status": "skipped", "reason": "No original_text"}
        try:
            if not (major := tongyi_llm.extract_major_sync(resume.original_text)): return {"resume_id": resume_id, "status": "failed", "error": "Failed to extract major"}
        except Exception as e:
            return {"resume_id": resume_id, "status": "failed", "error": f"Extract major failed: {str(e)}"}
        scraper = JobScraper()
        try:
            jobs_data = scraper.fetch_jobs_api(demo_id="cs", direction=f"{major}专业", max_pages=2)
            before_save = datetime.now() - timedelta(seconds=5)
            saved_count = scraper.save_jobs(jobs_data)
        except Exception as e:
            return {"resume_id": resume_id, "major": major, "status": "failed", "error": str(e)}
        finally:
            scraper.close()
        new_jobs = session.execute(select(Job).where(Job.created_at >= before_save).order_by(Job.id)).scalars().all()
        for job in new_jobs:
            encode_job_vector_task.delay(job.id)
        return {"resume_id": resume_id, "major": major, "status": "success", "fetched": len(jobs_data), "saved": saved_count, "encoded_jobs": len(new_jobs)}
