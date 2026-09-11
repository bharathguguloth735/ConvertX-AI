"""
DocuFlow AI — Celery Application Configuration
"""
from celery import Celery
from app.config import settings

celery_app = Celery(
    "docuflow",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.pdf_tasks",
        "app.workers.image_tasks",
        "app.workers.audio_tasks",
        "app.workers.video_tasks",
        "app.workers.ocr_tasks",
        "app.workers.ai_tasks",
        "app.workers.batch_tasks",
        "app.workers.cleanup_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=600,   # 10 minutes soft limit
    task_time_limit=900,        # 15 minutes hard limit
    result_expires=86400,       # Results expire after 24h
    beat_schedule={
        "purge-expired-files-hourly": {
            "task": "app.workers.cleanup_tasks.purge_expired_files_task",
            "schedule": 3600.0,  # Run every hour
            "kwargs": {"retention_hours": 24},
        },
    },
)
