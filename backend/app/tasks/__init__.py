from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "t_match",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.ai_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=False,
    beat_schedule={
        "daily-sync-all": {
            "task": "app.tasks.ai_tasks.daily_sync_all_task",
            "schedule": crontab(hour=8, minute=0),
            "options": {"queue": "default"},
        },
        "daily-sync-jobs-noon": {
            "task": "app.tasks.ai_tasks.scrape_jobs_task",
            "schedule": crontab(hour=12, minute=0),
            "options": {"queue": "default"},
        },
        "daily-sync-campus-evening": {
            "task": "app.tasks.ai_tasks.scrape_campus_task",
            "schedule": crontab(hour=18, minute=0),
            "options": {"queue": "default"},
        },
    },
)
