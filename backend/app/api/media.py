"""
DocuFlow AI — Image & Audio & Video API Routers (combined for brevity)
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import User, File as FileModel, FileStatus, ToolCategory
from app.security.dependencies import get_current_user, get_current_user_or_guest
from app.services.image.image_service import ImageService
from app.services.audio.audio_service import AudioService
from app.services.video.video_service import VideoService
from app.services.storage.storage_service import storage, generate_storage_path
from app.security.file_validation import sanitize_filename, detect_mime_type

# ─── Image Router ─────────────────────────────────────────────────────────────
image_router = APIRouter(prefix="/api/image", tags=["Image Tools"])


async def _upload_and_get(file: UploadFile, user_id: str, db: AsyncSession, tool_cat: str) -> tuple:
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    safe_name = sanitize_filename(file.filename or "image.jpg")
    mime = detect_mime_type(data, safe_name)
    path = generate_storage_path(user_id, safe_name)
    await storage.upload(data, path, mime)
    return data, safe_name, mime, path


async def _save_output(db: AsyncSession, user_id: str, data: bytes, name: str,
                       mime: str, tool: str, category: str) -> FileModel:
    path = generate_storage_path(user_id, name, "outputs")
    await storage.upload(data, path, mime)
    ext = name.rsplit(".", 1)[-1] if "." in name else ""
    f = FileModel(
        id=str(uuid.uuid4()), user_id=user_id, original_filename=name,
        stored_filename=name, storage_path=path, mime_type=mime,
        file_size=len(data), file_extension=f".{ext}",
        status=FileStatus.COMPLETED, tool_type=tool,
        category=category, is_output=True,
    )
    db.add(f)
    await db.flush()
    return f


@image_router.post("/crop")
async def crop_image(
    file: UploadFile = File(...),
    x: int = Form(0), y: int = Form(0),
    width: int = Form(500), height: int = Form(500),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data, safe_name, _, _ = await _upload_and_get(file, current_user.id, db, "image")
    try:
        ext = safe_name.rsplit('.', 1)[-1].lower() if '.' in safe_name else 'jpg'
        out = ImageService.crop(data, x, y, width, height)
        name = f"{safe_name.rsplit('.', 1)[0]}_cropped.{ext}"
        mime = "image/png" if ext == "png" else ("image/webp" if ext == "webp" else "image/jpeg")
        f = await _save_output(db, current_user.id, out, name, mime, "crop", "image")
        return {"status": "completed", "output_file_id": f.id, "filename": name, "download_url": storage.get_url(f.id, name)}
    except Exception as e:
        raise HTTPException(500, f"Crop failed: {str(e)[:200]}")


@image_router.post("/resize")
async def resize_image(
    file: UploadFile = File(...),
    width: int = Form(800), height: int = Form(600),
    keep_aspect: bool = Form(True),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data, safe_name, _, _ = await _upload_and_get(file, current_user.id, db, "image")
    try:
        ext = safe_name.rsplit('.', 1)[-1].lower() if '.' in safe_name else 'jpg'
        out = ImageService.resize(data, width, height, keep_aspect)
        name = f"{safe_name.rsplit('.', 1)[0]}_resized.{ext}"
        mime = "image/png" if ext == "png" else ("image/webp" if ext == "webp" else "image/jpeg")
        f = await _save_output(db, current_user.id, out, name, mime, "resize", "image")
        return {"status": "completed", "output_file_id": f.id, "filename": name, "download_url": storage.get_url(f.id, name)}
    except Exception as e:
        raise HTTPException(500, f"Resize failed: {str(e)[:200]}")


@image_router.post("/compress")
async def compress_image(
    file: UploadFile = File(...),
    quality: int = Form(70),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data, safe_name, _, _ = await _upload_and_get(file, current_user.id, db, "image")
    original_size = len(data)
    try:
        out = ImageService.compress(data, quality)
        name = f"{safe_name.rsplit('.', 1)[0]}_compressed.jpg"
        f = await _save_output(db, current_user.id, out, name, "image/jpeg", "compress", "image")
        reduction = round((1 - len(out) / original_size) * 100, 1)
        return {
            "output_file_id": f.id,
            "filename": name,
            "download_url": storage.get_url(f.id, name),
            "original_size": original_size,
            "compressed_size": len(out),
            "reduction_percent": reduction,
        }
    except Exception as e:
        raise HTTPException(500, f"Compression failed: {str(e)[:200]}")


@image_router.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    target_format: str = Form("webp"),
    quality: int = Form(85),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data, safe_name, _, _ = await _upload_and_get(file, current_user.id, db, "image")
    try:
        norm_format = target_format.lower().strip()
        if norm_format == "jpeg":
            norm_format = "jpg"
        out = ImageService.convert_format(data, norm_format, quality)
        stem = safe_name.rsplit(".", 1)[0]
        name = f"{stem}_converted.{norm_format}"
        mime_map = {
            "jpeg": "image/jpeg",
            "jpg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "gif": "image/gif",
            "bmp": "image/bmp",
            "tiff": "image/tiff",
        }
        mime = mime_map.get(norm_format, "image/jpeg")
        f = await _save_output(db, current_user.id, out, name, mime, "convert", "image")
        return {
            "status": "completed",
            "output_file_id": f.id,
            "filename": name,
            "download_url": storage.get_url(f.id, name),
        }
    except Exception as e:
        raise HTTPException(500, f"Conversion failed: {str(e)[:200]}")


@image_router.post("/rotate")
async def rotate_image(
    file: UploadFile = File(...),
    angle: float = Form(90),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data, safe_name, orig_mime, _ = await _upload_and_get(file, current_user.id, db, "image")
    try:
        out = ImageService.rotate(data, angle)
        ext = safe_name.rsplit(".", 1)[-1] if "." in safe_name else "jpg"
        name = f"{safe_name.rsplit('.', 1)[0]}_rotated.{ext}"
        f = await _save_output(db, current_user.id, out, name, orig_mime, "rotate", "image")
        return {"status": "completed", "output_file_id": f.id, "filename": name, "download_url": storage.get_url(f.id, name)}
    except Exception as e:
        raise HTTPException(500, f"Rotation failed: {str(e)[:200]}")


@image_router.post("/info")
async def get_image_info(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    data = await file.read()
    try:
        info = ImageService.get_image_info(data)
        return info
    except Exception as e:
        raise HTTPException(500, str(e)[:200])


# ─── Audio Router ─────────────────────────────────────────────────────────────
audio_router = APIRouter(prefix="/api/audio", tags=["Audio Tools"])


@audio_router.post("/cut")
async def cut_audio(
    file: UploadFile = File(...),
    start_seconds: float = Form(0),
    end_seconds: float = Form(30),
    output_format: str = Form("mp3"),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    safe_name = sanitize_filename(file.filename or "audio.mp3")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "mp3"
    try:
        out = AudioService.cut_audio(data, start_seconds, end_seconds, ext, output_format)
        name = f"{safe_name.rsplit('.', 1)[0]}_cut.{output_format}"
        f = await _save_output(db, current_user.id, out, name, f"audio/{output_format}", "cut", "audio")
        return {"output_file_id": f.id, "filename": name, "download_url": storage.get_url(f.id, name), "duration": end_seconds - start_seconds}
    except Exception as e:
        raise HTTPException(500, f"Audio cut failed: {str(e)[:200]}")


@audio_router.post("/convert")
async def convert_audio(
    file: UploadFile = File(...),
    output_format: str = Form("mp3"),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    safe_name = sanitize_filename(file.filename or "audio.mp3")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "mp3"
    try:
        out = AudioService.convert_format(data, ext, output_format)
        name = f"{safe_name.rsplit('.', 1)[0]}.{output_format}"
        f = await _save_output(db, current_user.id, out, name, f"audio/{output_format}", "convert", "audio")
        return {"output_file_id": f.id, "filename": name, "download_url": storage.get_url(f.id, name)}
    except Exception as e:
        raise HTTPException(500, f"Audio conversion failed: {str(e)[:200]}")


@audio_router.post("/compress")
async def compress_audio(
    file: UploadFile = File(...),
    bitrate: str = Form("128k"),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    safe_name = sanitize_filename(file.filename or "audio.mp3")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "mp3"
    try:
        out = AudioService.compress_audio(data, ext, bitrate)
        name = f"{safe_name.rsplit('.', 1)[0]}_compressed.mp3"
        f = await _save_output(db, current_user.id, out, name, "audio/mpeg", "compress", "audio")
        return {"output_file_id": f.id, "filename": name, "download_url": storage.get_url(f.id, name)}
    except Exception as e:
        raise HTTPException(500, f"Compression failed: {str(e)[:200]}")


@audio_router.post("/info")
async def get_audio_info(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_or_guest),
):
    data = await file.read()
    safe_name = sanitize_filename(file.filename or "audio.mp3")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "mp3"
    try:
        return AudioService.get_audio_info(data, ext)
    except Exception as e:
        raise HTTPException(500, str(e)[:200])


# ─── Video Router ─────────────────────────────────────────────────────────────
video_router = APIRouter(prefix="/api/video", tags=["Video Tools"])


@video_router.post("/cut")
async def cut_video(
    file: UploadFile = File(...),
    start_seconds: float = Form(0),
    end_seconds: float = Form(30),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    safe_name = sanitize_filename(file.filename or "video.mp4")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "mp4"
    try:
        out = VideoService.cut_video(data, start_seconds, end_seconds, ext)
        name = f"{safe_name.rsplit('.', 1)[0]}_cut.{ext}"
        f = await _save_output(db, current_user.id, out, name, "video/mp4", "cut", "video")
        return {"output_file_id": f.id, "filename": name, "download_url": storage.get_url(f.id, name)}
    except Exception as e:
        raise HTTPException(500, f"Video cut failed: {str(e)[:200]}")


@video_router.post("/extract-audio")
async def extract_audio_from_video(
    file: UploadFile = File(...),
    audio_format: str = Form("mp3"),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    safe_name = sanitize_filename(file.filename or "video.mp4")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "mp4"
    try:
        out = VideoService.extract_audio(data, ext, audio_format)
        name = f"{safe_name.rsplit('.', 1)[0]}.{audio_format}"
        f = await _save_output(db, current_user.id, out, name, f"audio/{audio_format}", "extract_audio", "video")
        return {"output_file_id": f.id, "filename": name, "download_url": storage.get_url(f.id, name)}
    except Exception as e:
        raise HTTPException(500, f"Audio extraction failed: {str(e)[:200]}")


@video_router.post("/compress")
async def compress_video(
    file: UploadFile = File(...),
    crf: int = Form(28),
    resolution: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()
    safe_name = sanitize_filename(file.filename or "video.mp4")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "mp4"
    try:
        out = VideoService.compress_video(data, crf, ext, resolution)
        name = f"{safe_name.rsplit('.', 1)[0]}_compressed.mp4"
        f = await _save_output(db, current_user.id, out, name, "video/mp4", "compress", "video")
        return {"output_file_id": f.id, "filename": name, "download_url": storage.get_url(f.id, name)}
    except Exception as e:
        raise HTTPException(500, f"Compression failed: {str(e)[:200]}")


@video_router.post("/info")
async def get_video_info(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_or_guest),
):
    data = await file.read()
    safe_name = sanitize_filename(file.filename or "video.mp4")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "mp4"
    try:
        return VideoService.get_video_info(data, ext)
    except Exception as e:
        raise HTTPException(500, str(e)[:200])
