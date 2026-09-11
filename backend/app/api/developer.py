"""
DocuFlow AI — Public Developer REST API & Webhooks
Enables external developers and B2B SaaS integrations to use ConvertX conversion pipelines.
"""
import hmac
import hashlib
import secrets
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, ApiKey, WebhookEndpoint, File as FileModel, FileStatus, ToolCategory
from app.security.dependencies import get_current_user
from app.services.storage.storage_service import storage, generate_storage_path
from app.security.file_validation import sanitize_filename, detect_mime_type
from app.services.pdf.pdf_service import PDFService

router = APIRouter(tags=["Developer API"])


# ─── Auth Dependency: API Key Authentication ──────────────────────────────────
async def get_api_key_user(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Authenticate a request using a public API Key (df_live_...).
    Can be passed via X-API-Key header or Bearer df_live_...
    """
    raw_key = x_api_key
    if not raw_key and authorization and authorization.startswith("Bearer df_live_"):
        raw_key = authorization.replace("Bearer ", "").strip()

    if not raw_key or not raw_key.startswith("df_live_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid DocuFlow API Key required (format: df_live_...)",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
    )
    api_key_record = result.scalar_one_or_none()
    if not api_key_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API Key",
        )

    # Update last used timestamp
    api_key_record.last_used_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()

    user_res = await db.execute(select(User).where(User.id == api_key_record.user_id))
    user = user_res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account associated with this API key is inactive",
        )

    return user


# ─── Developer Portal: Key Management ─────────────────────────────────────────

class CreateApiKeyRequest(BaseModel):
    name: str = "Production App"


class CreateWebhookRequest(BaseModel):
    url: str
    events: Optional[str] = "job.completed,job.failed"


@router.get("/api/developer/api-keys")
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys belonging to the current user."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "key_prefix": k.key_prefix,
            "rate_limit_per_min": k.rate_limit_per_min,
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        }
        for k in keys
    ]


@router.post("/api/developer/api-keys")
async def create_api_key(
    data: CreateApiKeyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new secure API Key. The full key is only displayed once."""
    token = secrets.token_hex(24)
    full_key = f"df_live_{token}"
    prefix = f"df_live_{token[:8]}..."
    key_hash = hashlib.sha256(full_key.encode("utf-8")).hexdigest()

    # Rate limit based on plan
    plan = getattr(current_user, "plan", "free")
    rate_limit = 1000 if plan in ("pro", "business", "enterprise") else 60

    api_key = ApiKey(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=data.name.strip() or "Standard API Key",
        key_prefix=prefix,
        key_hash=key_hash,
        rate_limit_per_min=rate_limit,
        is_active=True,
    )
    db.add(api_key)
    await db.flush()

    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": full_key,
        "key_prefix": prefix,
        "rate_limit_per_min": rate_limit,
        "warning": "Save this secret key securely. It will never be displayed again.",
    }


@router.delete("/api/developer/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke and permanently deactivate an API key."""
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(404, "API Key not found")

    await db.delete(key)
    await db.flush()
    return {"message": "API Key revoked successfully"}


# ─── Webhook Endpoints ────────────────────────────────────────────────────────

@router.get("/api/developer/webhooks")
async def list_webhooks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List configured webhooks."""
    result = await db.execute(
        select(WebhookEndpoint).where(WebhookEndpoint.user_id == current_user.id)
    )
    hooks = result.scalars().all()
    return [
        {
            "id": h.id,
            "url": h.url,
            "events": h.events,
            "is_active": h.is_active,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in hooks
    ]


@router.post("/api/developer/webhooks")
async def create_webhook(
    data: CreateWebhookRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a new webhook endpoint."""
    secret = secrets.token_hex(32)
    hook = WebhookEndpoint(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        url=data.url.strip(),
        secret=secret,
        events=data.events or "job.completed,job.failed",
        is_active=True,
    )
    db.add(hook)
    await db.flush()

    return {
        "id": hook.id,
        "url": hook.url,
        "events": hook.events,
        "secret": secret,
        "message": "Webhook created. Verify incoming notifications using X-DocuFlow-Signature header.",
    }


@router.delete("/api/developer/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook endpoint."""
    result = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == webhook_id, WebhookEndpoint.user_id == current_user.id
        )
    )
    hook = result.scalar_one_or_none()
    if not hook:
        raise HTTPException(404, "Webhook not found")

    await db.delete(hook)
    await db.flush()
    return {"message": "Webhook deleted"}


# ─── Public REST API v1 ───────────────────────────────────────────────────────

@router.post("/api/v1/convert")
async def public_v1_convert(
    file: UploadFile = File(...),
    operation: str = Form("pdf_to_docx"),
    api_user: User = Depends(get_api_key_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Public REST API conversion endpoint for developers.
    Requires X-API-Key header or Bearer df_live_...
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Uploaded file is empty")

    safe_name = sanitize_filename(file.filename or "input.pdf")
    detected_mime = detect_mime_type(file_bytes, safe_name)
    base = safe_name.rsplit(".", 1)[0]

    output_bytes = None
    out_ext = ".docx"
    out_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    try:
        if operation == "pdf_to_docx":
            output_bytes = PDFService.pdf_to_docx(file_bytes)
            out_ext = ".docx"
            out_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        elif operation == "pdf_to_txt":
            txt = PDFService.pdf_to_text(file_bytes)
            output_bytes = txt.encode("utf-8")
            out_ext = ".txt"
            out_mime = "text/plain"

        elif operation == "docx_to_pdf":
            output_bytes = PDFService.docx_to_pdf(file_bytes)
            out_ext = ".pdf"
            out_mime = "application/pdf"

        else:
            raise HTTPException(400, f"Unsupported developer conversion operation: {operation}")

        out_name = f"{base}_converted{out_ext}"
        out_path = generate_storage_path(api_user.id, out_name, "api_outputs")
        await storage.upload(output_bytes, out_path, out_mime)

        out_file = FileModel(
            id=str(uuid.uuid4()),
            user_id=api_user.id,
            original_filename=out_name,
            stored_filename=out_name,
            storage_path=out_path,
            mime_type=out_mime,
            file_size=len(output_bytes),
            file_extension=out_ext,
            status=FileStatus.COMPLETED,
            tool_type="developer_convert",
            category=ToolCategory.PDF,
            is_output=True,
        )
        db.add(out_file)
        await db.flush()

        return {
            "status": "success",
            "operation": operation,
            "input_filename": safe_name,
            "output_filename": out_name,
            "output_file_id": out_file.id,
            "file_size": len(output_bytes),
            "download_url": storage.get_url(out_file.id, out_name),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"API conversion failed: {str(e)[:200]}")
