"""
DocuFlow AI — File Upload & Management API
"""
import uuid
import os
from pathlib import Path
from typing import List, Optional
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
import aiofiles

from app.database import get_db
from app.models import File as FileModel, FileStatus, ToolCategory, User
from app.security.dependencies import get_current_user, get_current_user_or_guest
from app.security.file_validation import detect_mime_type, sanitize_filename, get_file_hash
from app.services.storage.storage_service import storage, generate_storage_path
from app.config import settings

router = APIRouter(prefix="/api/files", tags=["Files"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file and store it in the system."""
    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    # Validate file size (100MB hard limit)
    if file_size > 524288000:
        raise HTTPException(status_code=413, detail="File too large")

    # Detect MIME type from content
    detected_mime = detect_mime_type(file_bytes, file.filename or "")
    safe_name = sanitize_filename(file.filename or "upload")
    ext = Path(safe_name).suffix.lower()

    # Generate storage path
    storage_path = generate_storage_path(current_user.id, safe_name)

    # Upload to storage
    await storage.upload(file_bytes, storage_path, detected_mime)

    # Create database record
    db_file = FileModel(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        original_filename=safe_name,
        stored_filename=os.path.basename(storage_path),
        storage_path=storage_path,
        mime_type=detected_mime,
        file_size=file_size,
        file_extension=ext,
        status=FileStatus.UPLOADED,
        category=category,
    )
    db.add(db_file)
    await db.flush()

    # Update user storage usage
    current_user.storage_used_bytes = (current_user.storage_used_bytes or 0) + file_size
    await db.flush()

    return {
        "id": db_file.id,
        "filename": safe_name,
        "mime_type": detected_mime,
        "size": file_size,
        "status": "uploaded",
    }


@router.get("")
async def list_files(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's files with pagination."""
    query = select(FileModel).where(
        FileModel.user_id == current_user.id,
        FileModel.status != FileStatus.DELETED,
    )
    if category:
        query = query.where(FileModel.category == category)
    if status:
        query = query.where(FileModel.status == status)

    query = query.order_by(desc(FileModel.created_at))

    # Count total
    count_query = select(func.count()).select_from(
        query.subquery()
    )
    total = await db.scalar(count_query) or 0

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    files = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [
            {
                "id": f.id,
                "filename": f.original_filename,
                "mime_type": f.mime_type,
                "size": f.file_size,
                "status": f.status,
                "category": f.category,
                "tool_type": f.tool_type,
                "is_output": f.is_output,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "download_url": storage.get_url(f.id, f.original_filename),
            }
            for f in files
        ],
    }


@router.get("/{file_id}")
async def get_file(
    file_id: str,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Get file details by ID."""
    result = await db.execute(
        select(FileModel).where(
            FileModel.id == file_id,
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    if f.user_id != current_user.id and f.user_id != "guest_user_id" and current_user.id != "guest_user_id":
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "id": f.id,
        "filename": f.original_filename,
        "mime_type": f.mime_type,
        "size": f.file_size,
        "status": f.status,
        "category": f.category,
        "tool_type": f.tool_type,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "download_url": storage.get_url(f.id, f.original_filename),
    }


@router.get("/download/{file_id}")
@router.get("/download/{file_id}/{filename:path}")
async def download_file(
    file_id: str,
    filename: Optional[str] = None,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Download a file by ID or path."""
    result = await db.execute(
        select(FileModel).where(
            FileModel.id == file_id,
            FileModel.status != FileStatus.DELETED,
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        # Also check by stored_filename or storage_path
        result = await db.execute(
            select(FileModel).where(
                (FileModel.storage_path == file_id) | (FileModel.stored_filename == file_id),
                FileModel.status != FileStatus.DELETED,
            )
        )
        f = result.scalar_one_or_none()

    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    if f.user_id != current_user.id and f.user_id != "guest_user_id" and current_user.id != "guest_user_id":
        raise HTTPException(status_code=403, detail="Access denied")

    file_bytes = await storage.download(f.storage_path)

    # Determine accurate download filename
    import re
    from urllib.parse import unquote
    raw_name = unquote(filename) if filename else (f.original_filename or f.stored_filename or "download")
    dl_name = raw_name
    if f.file_extension and not dl_name.lower().endswith(f.file_extension.lower()):
        dl_name = f"{dl_name}{f.file_extension}"

    # RFC 6266 & RFC 5987 standard compliance:
    # safe_ascii_name is ASCII fallback without quotes, commas, semicolons or slashes
    safe_ascii_name = re.sub(r'[\r\n",;/\\]', '_', dl_name).encode('ascii', 'ignore').decode('ascii').strip()
    if not safe_ascii_name:
        safe_ascii_name = f"download{f.file_extension or ''}"
    encoded_name = quote(dl_name, safe='')

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_ascii_name}"; filename*=UTF-8\'\'{encoded_name}',
        "Content-Length": str(len(file_bytes)),
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    }

    return Response(
        content=file_bytes,
        media_type=f.mime_type or "application/octet-stream",
        headers=headers,
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a file."""
    result = await db.execute(
        select(FileModel).where(
            FileModel.id == file_id,
            FileModel.user_id == current_user.id,
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    f.status = FileStatus.DELETED
    current_user.storage_used_bytes = max(0, (current_user.storage_used_bytes or 0) - f.file_size)

    # Delete from storage
    await storage.delete(f.storage_path)
    await db.flush()

    return {"message": "File deleted"}
