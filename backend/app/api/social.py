"""
DocuFlow AI — Social Media Tools API Router
Exposes URL validation, metadata analysis, media download, and history endpoints.
"""
import uuid
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, SocialMediaDownload, DownloadStatus
from app.security.dependencies import get_optional_user, get_current_user, get_current_user_or_guest
from app.security.rate_limiter import social_rate_limiter
from app.schemas.social import (
    ValidateURLRequest, ValidateURLResponse,
    AnalyzeURLRequest, AnalyzeURLResponse, MediaOptionSchema,
    DownloadMediaRequest, DownloadMediaResponse,
    SocialMediaHistoryResponse, SocialMediaHistoryItem
)
from app.services.social.social_service import social_service, TEMP_SOCIAL_DIR

router = APIRouter(prefix="/api/social", tags=["Social Media Tools"])

# In-memory store for analyzed items before download selection
ANALYZED_ITEMS_CACHE: Dict[str, Dict] = {}


@router.post("/validate", response_model=ValidateURLResponse, dependencies=[Depends(social_rate_limiter)])
async def validate_social_url(data: ValidateURLRequest):
    """
    Validate social media URL syntax and platform support.
    """
    url = data.url.strip() if data.url else ""
    is_valid, platform, message = social_service.validate_url(url)
    return ValidateURLResponse(
        valid=is_valid,
        platform=platform,
        message=message,
    )


@router.post("/analyze", response_model=AnalyzeURLResponse, dependencies=[Depends(social_rate_limiter)])
async def analyze_social_url(data: AnalyzeURLRequest):
    """
    Analyze public URL, verify permissions, retrieve metadata, thumbnail & available options.
    """
    url = data.url.strip() if data.url else ""
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This URL is not supported.",
        )

    try:
        metadata = await social_service.analyze_url(url, data.platform)

        options_schema = [
            MediaOptionSchema(
                id=opt.id,
                label=opt.label,
                format=opt.format,
                quality=opt.quality,
                media_type=opt.media_type,
                file_size_approx=opt.file_size_approx,
                downloadable=opt.downloadable,
            )
            for opt in metadata.options
        ]

        item_id = str(uuid.uuid4())
        item_data = {
            "id": item_id,
            "platform": metadata.platform,
            "source_url": metadata.source_url,
            "media_type": metadata.media_type,
            "status": DownloadStatus.AVAILABLE.value,
            "title": metadata.title,
            "author": metadata.author,
            "thumbnail_url": metadata.thumbnail_url,
            "video_preview_url": metadata.video_preview_url,
            "duration": metadata.duration,
            "is_public": metadata.is_public,
            "options": metadata.options,
        }

        # Cache item for download phase
        ANALYZED_ITEMS_CACHE[item_id] = item_data

        return AnalyzeURLResponse(
            id=item_id,
            platform=metadata.platform,
            source_url=metadata.source_url,
            media_type=metadata.media_type,
            status=DownloadStatus.AVAILABLE.value,
            title=metadata.title,
            author=metadata.author,
            thumbnail_url=metadata.thumbnail_url,
            video_preview_url=metadata.video_preview_url,
            duration=metadata.duration,
            is_public=metadata.is_public,
            options=options_schema,
            message="Media analyzed successfully.",
        )

    except ValueError as ve:
        error_str = str(ve)
        if "private" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This content is private and cannot be accessed.",
            )
        elif "not supported" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This URL is not supported.",
            )
        elif "not available" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The requested media is not available for permitted download.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_str,
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't process this URL. Please verify the link and try again.",
        )


@router.get("/media/{id}", response_model=AnalyzeURLResponse)
async def get_analyzed_media(id: str):
    """
    Get metadata & options for an analyzed media item by ID.
    """
    item = ANALYZED_ITEMS_CACHE.get(id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media session expired or not found. Please analyze the URL again.",
        )

    options_schema = [
        MediaOptionSchema(
            id=opt.id,
            label=opt.label,
            format=opt.format,
            quality=opt.quality,
            media_type=opt.media_type,
            file_size_approx=opt.file_size_approx,
            downloadable=opt.downloadable,
        )
        for opt in item["options"]
    ]

    return AnalyzeURLResponse(
        id=item["id"],
        platform=item["platform"],
        source_url=item["source_url"],
        media_type=item["media_type"],
        status=item["status"],
        title=item["title"],
        author=item["author"],
        thumbnail_url=item["thumbnail_url"],
        video_preview_url=item.get("video_preview_url"),
        duration=item.get("duration"),
        is_public=item["is_public"],
        options=options_schema,
    )


@router.post("/download", response_model=DownloadMediaResponse, dependencies=[Depends(social_rate_limiter)])
async def download_social_media(
    data: DownloadMediaRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """
    Download user-selected option of permitted public media.
    Creates DB record in social_media_downloads and returns file link.
    """
    item = ANALYZED_ITEMS_CACHE.get(data.media_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested media is not available for permitted download.",
        )

    try:
        content_bytes, filename, mime_type = await social_service.download_media(
            item["source_url"], data.option_id
        )

        temp_path = social_service.save_temp_file(content_bytes, filename)
        file_size = len(content_bytes)

        # Expiration after 1 hour
        created_at_dt = datetime.now(timezone.utc).replace(tzinfo=None)
        expires_at_dt = created_at_dt + timedelta(hours=1)

        download_id = str(uuid.uuid4())
        user_id = current_user.id if current_user else None

        # Save record in database
        db_record = SocialMediaDownload(
            id=download_id,
            user_id=user_id,
            platform=item["platform"],
            source_url=item["source_url"],
            media_type=item["media_type"],
            status=DownloadStatus.COMPLETED.value,
            file_size=file_size,
            filename=filename,
            storage_path=temp_path,
            title=item["title"],
            author=item["author"],
            thumbnail_url=item["thumbnail_url"],
            created_at=created_at_dt,
            expires_at=expires_at_dt,
        )

        db.add(db_record)
        await db.flush()

        download_url = f"/api/social/file/{filename}"

        return DownloadMediaResponse(
            download_id=download_id,
            download_url=download_url,
            filename=filename,
            file_size=file_size,
            expires_at=expires_at_dt.isoformat(),
            status=DownloadStatus.COMPLETED.value,
            message="Media download ready.",
        )

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't process this URL. Please verify the link and try again.",
        )


@router.get("/file/{filename}")
async def serve_social_media_file(filename: str):
    """
    Serve temporary social media download file directly with proper Content-Disposition.
    """
    safe_name = os.path.basename(filename)
    file_path = os.path.join(TEMP_SOCIAL_DIR, safe_name)

    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested file has expired or was not found. Please initiate the download again.",
        )

    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    mime_map = {
        "mp4": "video/mp4",
        "mp3": "audio/mpeg",
        "m4a": "audio/mp4",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
    }
    media_type = mime_map.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        filename=safe_name,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Accept-Ranges": "bytes",
        },
    )


@router.get("/proxy-preview")
async def proxy_preview_media(url: str):
    """
    Safely proxy media previews (thumbnails / images) to bypass CORS and Referer hotlink blocks.
    """
    import httpx
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid preview URL")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
        "Referer": "https://www.instagram.com/",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            res = await client.get(url, headers=headers)
            if res.status_code == 200:
                ct = res.headers.get("content-type", "image/jpeg")
                return Response(
                    content=res.content,
                    media_type=ct,
                    headers={"Cache-Control": "public, max-age=86400"},
                )
            raise HTTPException(status_code=res.status_code, detail="Preview unavailable")
    except Exception as e:
        raise HTTPException(status_code=502, detail="Failed to load preview media")


@router.get("/history", response_model=SocialMediaHistoryResponse)
async def get_social_download_history(
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get social media download history for current user or session.
    """
    if not current_user:
        return SocialMediaHistoryResponse(items=[])

    stmt = (
        select(SocialMediaDownload)
        .where(SocialMediaDownload.user_id == current_user.id)
        .order_by(SocialMediaDownload.created_at.desc())
        .limit(20)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    items = [
        SocialMediaHistoryItem(
            id=r.id,
            platform=r.platform,
            source_url=r.source_url,
            media_type=r.media_type,
            status=r.status,
            title=r.title,
            author=r.author,
            filename=r.filename,
            file_size=r.file_size or 0,
            download_url=f"/api/social/file/{r.filename}" if r.filename else None,
            created_at=r.created_at.isoformat() if r.created_at else "",
            expires_at=r.expires_at.isoformat() if r.expires_at else None,
        )
        for r in records
    ]

    return SocialMediaHistoryResponse(items=items)
