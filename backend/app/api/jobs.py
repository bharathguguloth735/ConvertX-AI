"""
DocuFlow AI — Jobs API (Celery background job status & management)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import ProcessingJob, JobStatus, User
from app.security.dependencies import get_current_user
from app.workers.celery_app import celery_app

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the status and result of a processing job."""
    result = await db.execute(
        select(ProcessingJob).where(
            ProcessingJob.id == job_id,
            ProcessingJob.user_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Also check Celery task status if available
    celery_status = None
    if job.celery_task_id:
        task = celery_app.AsyncResult(job.celery_task_id)
        celery_status = task.status

    return {
        "id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "celery_status": celery_status,
        "result": job.result,
        "error_message": job.error_message,
        "processing_time_ms": job.processing_time_ms,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "output_file_id": job.output_file_id,
    }


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending or processing job."""
    result = await db.execute(
        select(ProcessingJob).where(
            ProcessingJob.id == job_id,
            ProcessingJob.user_id == current_user.id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in (JobStatus.PENDING, JobStatus.PROCESSING):
        raise HTTPException(status_code=400, detail="Job cannot be cancelled in its current state")

    # Revoke Celery task
    if job.celery_task_id:
        celery_app.control.revoke(job.celery_task_id, terminate=True)

    job.status = JobStatus.CANCELLED
    await db.flush()

    return {"message": "Job cancelled"}


@router.get("")
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List recent jobs for current user."""
    result = await db.execute(
        select(ProcessingJob)
        .where(ProcessingJob.user_id == current_user.id)
        .order_by(ProcessingJob.created_at.desc())
        .limit(50)
    )
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "job_type": j.job_type,
            "status": j.status,
            "progress": j.progress,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "output_file_id": j.output_file_id,
        }
        for j in jobs
    ]
