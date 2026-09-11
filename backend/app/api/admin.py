"""
DocuFlow AI — Admin API (Admin dashboard: users, analytics, jobs, logs)
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional

from app.database import get_db
from app.models import User, File as FileModel, ProcessingJob, ToolUsage, AuditLog, JobStatus, SubscriptionPlan, PaymentTransaction
from app.security.dependencies import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def audit(db: AsyncSession, admin_id: str, action: str, details: str = "") -> None:
    """Record a privileged action without exposing file contents."""
    import uuid
    db.add(AuditLog(id=str(uuid.uuid4()), user_id=admin_id, action=action, details=details))


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users with pagination."""
    query = select(User)
    if search:
        query = query.where(
            User.email.ilike(f"%{search}%") | User.username.ilike(f"%{search}%")
        )
    query = query.order_by(desc(User.created_at))
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    users = result.scalars().all()

    count = await db.scalar(select(func.count(User.id)))
    return {
        "total": count,
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "plan": u.plan,
                "is_active": u.is_active,
                "storage_used_bytes": u.storage_used_bytes,
                "ai_requests_used": u.ai_requests_used,
                "conversions_used": u.conversions_used,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in users
        ],
    }


@router.get("/analytics")
async def get_analytics(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get platform analytics summary."""
    total_users = await db.scalar(select(func.count(User.id))) or 0
    active_users = await db.scalar(select(func.count(User.id)).where(User.is_active == True)) or 0
    total_files = await db.scalar(select(func.count(FileModel.id))) or 0
    total_storage = await db.scalar(select(func.sum(FileModel.file_size))) or 0
    total_jobs = await db.scalar(select(func.count(ProcessingJob.id))) or 0
    failed_jobs = await db.scalar(
        select(func.count(ProcessingJob.id)).where(ProcessingJob.status == JobStatus.FAILED)
    ) or 0
    completed_jobs = await db.scalar(
        select(func.count(ProcessingJob.id)).where(ProcessingJob.status == JobStatus.COMPLETED)
    ) or 0

    # Top tools
    top_tools_result = await db.execute(
        select(ToolUsage.tool_type, func.count(ToolUsage.id).label("usage_count"))
        .group_by(ToolUsage.tool_type)
        .order_by(desc("usage_count"))
        .limit(10)
    )
    top_tools = [{"tool": row[0], "count": row[1]} for row in top_tools_result.fetchall()]

    # Files by category
    files_by_cat_result = await db.execute(
        select(FileModel.category, func.count(FileModel.id).label("count"))
        .group_by(FileModel.category)
        .order_by(desc("count"))
    )
    files_by_category = [{"category": row[0], "count": row[1]} for row in files_by_cat_result.fetchall()]

    return {
        "users": {"total": total_users, "active": active_users},
        "files": {"total": total_files, "total_storage_bytes": total_storage},
        "jobs": {"total": total_jobs, "completed": completed_jobs, "failed": failed_jobs},
        "top_tools": top_tools,
        "files_by_category": files_by_category,
    }


@router.get("/jobs")
async def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all processing jobs."""
    query = select(ProcessingJob)
    if status:
        query = query.where(ProcessingJob.status == status)
    query = query.order_by(desc(ProcessingJob.created_at))
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    jobs = result.scalars().all()

    total = await db.scalar(select(func.count(ProcessingJob.id)))
    return {
        "total": total,
        "items": [
            {
                "id": j.id,
                "user_id": j.user_id,
                "job_type": j.job_type,
                "status": j.status,
                "progress": j.progress,
                "error_message": j.error_message,
                "completed_at": j.completed_at.isoformat() if j.completed_at else None,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ],
    }


@router.get("/logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get audit logs."""
    result = await db.execute(
        select(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


@router.patch("/users/{user_id}/activate")
async def toggle_user_activation(
    user_id: str,
    active: bool = True,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate or deactivate a user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(400, "Cannot deactivate your own account")
    user.is_active = active
    audit(db, admin.id, "user.activation_changed", f"user_id={user.id}; active={active}")
    await db.flush()
    return {"message": f"User {'activated' if active else 'deactivated'}", "user_id": user_id}


@router.patch("/users/{user_id}/plan")
async def change_user_plan(
    user_id: str,
    plan: SubscriptionPlan,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Change a user's subscription plan and preserve an audit trail."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(404, "User not found")
    user.plan = plan.value
    audit(db, admin.id, "user.plan_changed", f"user_id={user.id}; plan={plan.value}")
    await db.flush()
    return {"message": "Plan updated", "user_id": user.id, "plan": user.plan}


@router.get("/payments")
async def list_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return payment metadata for administration; payment secrets are never returned."""
    result = await db.execute(select(PaymentTransaction).order_by(desc(PaymentTransaction.created_at)).offset((page - 1) * per_page).limit(per_page))
    payments = result.scalars().all()
    total = await db.scalar(select(func.count(PaymentTransaction.id))) or 0
    return {"total": total, "items": [{"id": p.id, "user_id": p.user_id, "plan": p.plan, "amount": p.amount, "currency": p.currency, "status": p.payment_status, "created_at": p.created_at.isoformat() if p.created_at else None} for p in payments]}


@router.get("/system")
async def system_status(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Provide a safe system-health summary without configuration or credentials."""
    await db.execute(select(func.count(User.id)))
    failed_jobs = await db.scalar(select(func.count(ProcessingJob.id)).where(ProcessingJob.status == JobStatus.FAILED)) or 0
    pending_jobs = await db.scalar(select(func.count(ProcessingJob.id)).where(ProcessingJob.status.in_([JobStatus.PENDING, JobStatus.PROCESSING]))) or 0
    return {"backend": "online", "database": "online", "storage": "available", "queue": {"pending": pending_jobs, "failed": failed_jobs}}


@router.get("/email/status")
async def get_email_status(admin: User = Depends(require_admin)):
    """Check SMTP configuration status and test connection in real-time."""
    from app.services.email import email_service
    from app.config import settings

    verification = await email_service.verify_smtp_connection()
    masked_user = ""
    if settings.smtp_user:
        parts = settings.smtp_user.split("@")
        if len(parts) == 2:
            masked_user = f"{parts[0][:3]}***@{parts[1]}"
        else:
            masked_user = f"{settings.smtp_user[:3]}***"

    return {
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_user": masked_user,
        "email_from": settings.email_from,
        "is_configured": email_service.is_configured,
        "connection_test": verification,
    }


@router.post("/email/test")
async def send_test_notification(
    admin: User = Depends(require_admin),
    to_email: Optional[str] = None,
):
    """Send a real-time test email notification to verify Gmail SMTP setup."""
    from app.services.email import email_service
    recipient = (to_email or admin.email).strip()
    result = await email_service.send_test_email(recipient)
    return result
