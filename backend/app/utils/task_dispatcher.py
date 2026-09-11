"""
DocuFlow AI — Task Dispatcher with Resilient Celery & In-Process Fallback
Ensures background tasks never fail or hang when Redis/Celery workers are offline.
"""
import logging
import asyncio
from typing import Callable, Any
from fastapi import BackgroundTasks

logger = logging.getLogger("docuflow.tasks")


def _run_worker_task_in_thread(task_func: Callable, *args, **kwargs):
    """Execute a synchronous Celery task function in an in-process thread."""
    try:
        task_func(*args, **kwargs)
    except Exception as e:
        logger.error(f"In-process background task {getattr(task_func, '__name__', 'task')} failed: {e}", exc_info=True)


async def dispatch_background_job(
    job_id: str,
    celery_task: Any,
    background_tasks: BackgroundTasks,
    *args,
    **kwargs
) -> str:
    """
    Attempt to schedule via Celery distributed queue.
    If Redis or Celery broker is unreachable, gracefully falls back to FastAPI BackgroundTasks.
    Returns task identifier.
    """
    try:
        # Attempt to queue via Celery
        task = celery_task.delay(job_id, *args, **kwargs)
        logger.info(f"Dispatched job {job_id} to Celery worker queue (task {task.id})")
        return task.id
    except Exception as e:
        logger.warning(
            f"Celery worker queue unavailable for job {job_id} ({e}). "
            "Falling back to in-process background task execution."
        )
        # Use direct worker task execution function (unwrap if Celery @task wrapper)
        underlying_func = getattr(celery_task, "run", celery_task)
        background_tasks.add_task(_run_worker_task_in_thread, underlying_func, job_id, *args, **kwargs)
        return f"in-process-{job_id[:8]}"
