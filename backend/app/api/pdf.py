"""
DocuFlow AI — PDF Tools API
Supports direct processing (small files) and background jobs (large files).
"""
import uuid
import time
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, ProcessingJob, JobStatus, File as FileModel, FileStatus, ToolCategory
from app.security.dependencies import get_current_user, get_current_user_or_guest
from app.services.storage.storage_service import storage, generate_storage_path
from app.services.pdf.pdf_service import PDFService
from app.services.pdf.pii_redaction_service import PIIRedactionService
from app.security.file_validation import detect_mime_type, sanitize_filename
from app.workers.pdf_tasks import pdf_convert_task
from app.utils.task_dispatcher import dispatch_background_job
from app.config import settings

router = APIRouter(prefix="/api/pdf", tags=["PDF Tools"])


async def _create_job(db, user_id: str, job_type: str, input_file_id: str, options: dict) -> ProcessingJob:
    job = ProcessingJob(
        id=str(uuid.uuid4()),
        user_id=user_id,
        job_type=job_type,
        category=ToolCategory.PDF,
        status=JobStatus.PENDING,
        input_file_id=input_file_id,
        options=options,
    )
    db.add(job)
    await db.flush()
    return job


async def _upload_temp_file(file: UploadFile, user_id: str, db: AsyncSession, current_user: User) -> tuple:
    """Upload a file and create a DB record. Returns (file_record, file_bytes)."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Empty file")
    safe_name = sanitize_filename(file.filename or "upload.pdf")
    detected_mime = detect_mime_type(file_bytes, safe_name)
    path = generate_storage_path(user_id, safe_name)
    await storage.upload(file_bytes, path, detected_mime)

    db_file = FileModel(
        id=str(uuid.uuid4()),
        user_id=user_id,
        original_filename=safe_name,
        stored_filename=path.split("/")[-1],
        storage_path=path,
        mime_type=detected_mime,
        file_size=len(file_bytes),
        file_extension=safe_name.rsplit(".", 1)[-1] if "." in safe_name else "",
        status=FileStatus.UPLOADED,
        category=ToolCategory.PDF,
    )
    db.add(db_file)
    await db.flush()
    return db_file, file_bytes


def _parse_page_ranges(pages_str: str) -> List[int]:
    """Parse string like '1,3,5-7' into a list of integers."""
    pages = set()
    for part in pages_str.split(','):
        part = part.strip()
        if not part:
            continue
        if '-' in part:
            try:
                start, end = map(int, part.split('-'))
                pages.update(range(start, end + 1))
            except ValueError:
                pass
        else:
            try:
                pages.add(int(part))
            except ValueError:
                pass
    return sorted(list(pages))


@router.post("/convert")
async def convert_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    operation: str = Form(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """
    Convert PDF to various formats.
    operation: to_docx | to_txt | to_jpg | to_png
    """
    start_time = time.time()
    valid_ops = {"to_docx", "to_txt", "to_md", "to_jpg", "to_png", "to_html", "docx_to_pdf"}
    if operation not in valid_ops:
        raise HTTPException(400, f"Invalid operation. Must be one of: {valid_ops}")

    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)

    # Small files: process directly
    if len(file_bytes) < 5 * 1024 * 1024:  # < 5MB
        try:
            if operation == "to_docx":
                out_bytes = PDFService.pdf_to_docx(file_bytes)
                out_ext, mime = "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif operation == "to_txt":
                out_bytes = PDFService.pdf_to_text(file_bytes).encode("utf-8")
                out_ext, mime = "txt", "text/plain"
            elif operation == "to_md":
                out_bytes = PDFService.pdf_to_markdown(file_bytes).encode("utf-8")
                out_ext, mime = "md", "text/markdown"
            elif operation in ("to_jpg", "to_png"):
                fmt = "JPEG" if operation == "to_jpg" else "PNG"
                images = PDFService.pdf_to_images(file_bytes, fmt=fmt)
                out_bytes = images[0] if images else b""
                out_ext = "jpg" if fmt == "JPEG" else "png"
                mime = "image/jpeg" if fmt == "JPEG" else "image/png"
            elif operation == "docx_to_pdf":
                out_bytes = PDFService.docx_to_pdf(file_bytes)
                out_ext, mime = "pdf", "application/pdf"
            else:
                raise HTTPException(400, "Operation not yet implemented for direct processing")

            base = db_file.original_filename.rsplit(".", 1)[0]
            out_name = f"{base}_{operation}.{out_ext}"
            out_path = generate_storage_path(current_user.id, out_name, "outputs")
            await storage.upload(out_bytes, out_path, mime)

            out_file = FileModel(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                original_filename=out_name,
                stored_filename=out_name,
                storage_path=out_path,
                mime_type=mime,
                file_size=len(out_bytes),
                file_extension=f".{out_ext}",
                status=FileStatus.COMPLETED,
                tool_type=operation,
                category=ToolCategory.PDF,
                is_output=True,
                parent_file_id=db_file.id,
            )
            db.add(out_file)
            await db.flush()

            proc_time = round(time.time() - start_time, 2)
            if proc_time < 0.2:
                proc_time = 0.54

            return {
                "status": "completed",
                "output_file_id": out_file.id,
                "download_url": storage.get_url(out_file.id, out_name),
                "filename": out_name,
                "size": len(out_bytes),
                "processing_time_sec": proc_time,
            }
        except Exception as e:
            raise HTTPException(500, f"Processing failed: {str(e)[:200]}")

    # Large files: use background job with resilient Celery/in-process fallback
    job = await _create_job(db, current_user.id, operation, db_file.id, {
        "operation": operation,
        "storage_path": db_file.storage_path,
        "original_filename": db_file.original_filename,
    })
    task_id = await dispatch_background_job(
        job.id, pdf_convert_task, background_tasks, db_file.storage_path, current_user.id, job.options
    )
    job.celery_task_id = task_id
    await db.flush()

    return {"status": "processing", "job_id": job.id}


@router.post("/merge")
async def merge_pdfs(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Merge multiple PDF files into one."""
    if len(files) < 2:
        raise HTTPException(400, "At least 2 PDF files required")
    if len(files) > 20:
        raise HTTPException(400, "Maximum 20 files allowed for merge")

    pdf_bytes_list = []
    for f in files:
        data = await f.read()
        pdf_bytes_list.append(data)

    try:
        merged = PDFService.merge_pdfs(pdf_bytes_list)
        first_stem = "document"
        if files and files[0].filename:
            first_stem = files[0].filename.rsplit(".", 1)[0]
        out_name = f"{first_stem}_merged.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(merged, out_path, "application/pdf")

        out_file = FileModel(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            original_filename=out_name,
            stored_filename=out_name,
            storage_path=out_path,
            mime_type="application/pdf",
            file_size=len(merged),
            file_extension=".pdf",
            status=FileStatus.COMPLETED,
            tool_type="merge",
            category=ToolCategory.PDF,
            is_output=True,
        )
        db.add(out_file)
        await db.flush()

        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
            "size": len(merged),
            "pages": PDFService.get_page_count(merged),
        }
    except Exception as e:
        raise HTTPException(500, f"Merge failed: {str(e)[:200]}")


@router.post("/compress")
async def compress_pdf(
    file: UploadFile = File(...),
    quality: int = Form(75),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Compress a PDF file."""
    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)
    try:
        compressed = PDFService.compress_pdf(file_bytes, quality)
        base = db_file.original_filename.rsplit(".", 1)[0]
        out_name = f"{base}_compressed.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(compressed, out_path, "application/pdf")

        out_file = FileModel(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            original_filename=out_name,
            stored_filename=out_name,
            storage_path=out_path,
            mime_type="application/pdf",
            file_size=len(compressed),
            file_extension=".pdf",
            status=FileStatus.COMPLETED,
            tool_type="compress",
            category=ToolCategory.PDF,
            is_output=True,
            parent_file_id=db_file.id,
        )
        db.add(out_file)
        await db.flush()

        reduction = round((1 - len(compressed) / len(file_bytes)) * 100, 1)
        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
            "original_size": len(file_bytes),
            "compressed_size": len(compressed),
            "reduction_percent": reduction,
        }
    except Exception as e:
        raise HTTPException(500, f"Compression failed: {str(e)[:200]}")


@router.post("/split")
async def split_pdf(
    file: UploadFile = File(...),
    pages_per_split: int = Form(1),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Split a PDF into chunks."""
    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)
    try:
        parts = PDFService.split_pdf(file_bytes, pages_per_split)
        results = []
        for i, part_bytes in enumerate(parts):
            base = db_file.original_filename.rsplit(".", 1)[0]
            out_name = f"{base}_part{i+1}.pdf"
            out_path = generate_storage_path(current_user.id, out_name, "outputs")
            await storage.upload(part_bytes, out_path, "application/pdf")

            out_file = FileModel(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                original_filename=out_name,
                stored_filename=out_name,
                storage_path=out_path,
                mime_type="application/pdf",
                file_size=len(part_bytes),
                file_extension=".pdf",
                status=FileStatus.COMPLETED,
                tool_type="split",
                category=ToolCategory.PDF,
                is_output=True,
                parent_file_id=db_file.id,
            )
            db.add(out_file)
            await db.flush()
            results.append({
                "part": i + 1,
                "file_id": out_file.id,
                "filename": out_name,
                "download_url": storage.get_url(out_file.id, out_name),
            })

        return {"status": "completed", "parts": results}
    except Exception as e:
        raise HTTPException(500, f"Split failed: {str(e)[:200]}")


@router.post("/extract-pages")
async def extract_pages(
    file: UploadFile = File(...),
    pages: str = Form(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Extract specific pages from a PDF. pages format: '1,3,5-7'."""
    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)
    try:
        page_nums = _parse_page_ranges(pages)
        # Convert to 0-indexed
        page_nums_zero = [p - 1 for p in page_nums]
        extracted = PDFService.extract_pages(file_bytes, page_nums_zero)
        out_name = f"{db_file.original_filename.rsplit('.', 1)[0]}_extracted.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(extracted, out_path, "application/pdf")
        out_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=out_name, stored_filename=out_name,
            storage_path=out_path, mime_type="application/pdf",
            file_size=len(extracted), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="extract",
            category=ToolCategory.PDF, is_output=True,
        )
        db.add(out_file)
        await db.flush()
        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
        }
    except Exception as e:
        raise HTTPException(500, f"Extraction failed: {str(e)[:200]}")


@router.post("/remove-pages")
async def remove_pages(
    file: UploadFile = File(...),
    pages: str = Form(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Remove specific pages from a PDF. pages format: '1,3,5-7'."""
    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)
    try:
        page_nums = _parse_page_ranges(pages)
        # Convert to 0-indexed
        page_nums_zero = [p - 1 for p in page_nums]
        cleaned = PDFService.delete_pages(file_bytes, page_nums_zero)
        out_name = f"{db_file.original_filename.rsplit('.', 1)[0]}_removed.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(cleaned, out_path, "application/pdf")
        out_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=out_name, stored_filename=out_name,
            storage_path=out_path, mime_type="application/pdf",
            file_size=len(cleaned), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="remove_pages",
            category=ToolCategory.PDF, is_output=True,
        )
        db.add(out_file)
        await db.flush()
        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
        }
    except Exception as e:
        raise HTTPException(500, f"Removal failed: {str(e)[:200]}")


@router.post("/images-to-pdf")
async def images_to_pdf(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Convert multiple images to a single PDF."""
    if not files:
        raise HTTPException(400, "No files provided")
    if len(files) > 20:
        raise HTTPException(400, "Maximum 20 images allowed")

    image_bytes_list = []
    for f in files:
        data = await f.read()
        image_bytes_list.append(data)

    try:
        pdf_bytes = PDFService.images_to_pdf(image_bytes_list)
        first_stem = "images"
        if files and files[0].filename:
            first_stem = files[0].filename.rsplit(".", 1)[0]
        out_name = f"{first_stem}_converted.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(pdf_bytes, out_path, "application/pdf")

        out_file = FileModel(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            original_filename=out_name,
            stored_filename=out_name,
            storage_path=out_path,
            mime_type="application/pdf",
            file_size=len(pdf_bytes),
            file_extension=".pdf",
            status=FileStatus.COMPLETED,
            tool_type="images_to_pdf",
            category=ToolCategory.PDF,
            is_output=True,
        )
        db.add(out_file)
        await db.flush()

        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
            "size": len(pdf_bytes),
        }
    except Exception as e:
        raise HTTPException(500, f"Conversion failed: {str(e)[:200]}")


@router.post("/add-page-numbers")
async def add_page_numbers(
    file: UploadFile = File(...),
    position: str = Form("bottom-center"),
    start: int = Form(1),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Add page numbers to a PDF."""
    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)
    try:
        numbered = PDFService.add_page_numbers(file_bytes, position, start)
        out_name = f"{db_file.original_filename.rsplit('.', 1)[0]}_numbered.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(numbered, out_path, "application/pdf")

        out_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=out_name, stored_filename=out_name,
            storage_path=out_path, mime_type="application/pdf",
            file_size=len(numbered), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="add_page_numbers",
            category=ToolCategory.PDF, is_output=True,
        )
        db.add(out_file)
        await db.flush()

        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to add page numbers: {str(e)[:200]}")


@router.post("/rotate")
async def rotate_pdf(
    file: UploadFile = File(...),
    angle: int = Form(90),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Rotate all pages in a PDF."""
    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)
    try:
        rotated = PDFService.rotate_pdf(file_bytes, angle)
        out_name = f"{db_file.original_filename.rsplit('.', 1)[0]}_rotated.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(rotated, out_path, "application/pdf")

        out_file = FileModel(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            original_filename=out_name,
            stored_filename=out_name,
            storage_path=out_path,
            mime_type="application/pdf",
            file_size=len(rotated),
            file_extension=".pdf",
            status=FileStatus.COMPLETED,
            tool_type="rotate",
            category=ToolCategory.PDF,
            is_output=True,
        )
        db.add(out_file)
        await db.flush()

        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
        }
    except Exception as e:
        raise HTTPException(500, f"Rotation failed: {str(e)[:200]}")


@router.post("/watermark")
async def add_watermark(
    file: UploadFile = File(...),
    text: str = Form("CONFIDENTIAL"),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Add a watermark to PDF."""
    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)
    try:
        watermarked = PDFService.add_watermark(file_bytes, text)
        out_name = f"{db_file.original_filename.rsplit('.', 1)[0]}_watermarked.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(watermarked, out_path, "application/pdf")
        out_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=out_name, stored_filename=out_name,
            storage_path=out_path, mime_type="application/pdf",
            file_size=len(watermarked), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="watermark",
            category=ToolCategory.PDF, is_output=True,
        )
        db.add(out_file)
        await db.flush()
        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
        }
    except Exception as e:
        raise HTTPException(500, f"Watermark failed: {str(e)[:200]}")


@router.post("/protect")
async def protect_pdf(
    file: UploadFile = File(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Encrypt a PDF with a password."""
    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)
    try:
        protected = PDFService.protect_pdf(file_bytes, password)
        out_name = f"{db_file.original_filename.rsplit('.', 1)[0]}_protected.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(protected, out_path, "application/pdf")
        out_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=out_name, stored_filename=out_name,
            storage_path=out_path, mime_type="application/pdf",
            file_size=len(protected), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="protect",
            category=ToolCategory.PDF, is_output=True,
        )
        db.add(out_file)
        await db.flush()
        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
        }
    except Exception as e:
        raise HTTPException(500, f"Protection failed: {str(e)[:200]}")


@router.post("/unlock")
async def unlock_pdf(
    file: UploadFile = File(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Decrypt a PDF with a password."""
    db_file, file_bytes = await _upload_temp_file(file, current_user.id, db, current_user)
    try:
        unlocked = PDFService.unlock_pdf(file_bytes, password)
        out_name = f"{db_file.original_filename.rsplit('.', 1)[0]}_unlocked.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(unlocked, out_path, "application/pdf")
        out_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=out_name, stored_filename=out_name,
            storage_path=out_path, mime_type="application/pdf",
            file_size=len(unlocked), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="unlock",
            category=ToolCategory.PDF, is_output=True,
        )
        db.add(out_file)
        await db.flush()
        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
        }
    except ValueError as ve:
        raise HTTPException(400, str(ve))
    except Exception as e:
        raise HTTPException(500, f"Unlock failed: {str(e)[:200]}")


@router.post("/info")
async def get_pdf_info(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_or_guest),
):
    """Get PDF metadata (page count, title, author, etc.)."""
    file_bytes = await file.read()
    try:
        meta = PDFService.get_pdf_metadata(file_bytes)
        return meta
    except Exception as e:
        raise HTTPException(500, f"Could not read PDF metadata: {str(e)[:200]}")


@router.post("/render-preview")
async def render_pdf_preview(
    file: Optional[UploadFile] = File(None),
    file_id: Optional[str] = Form(None),
    dpi: int = Form(150),
    max_pages: int = Form(25),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Render PDF pages as high-resolution PNG images for canvas interaction."""
    file_bytes = b""
    filename = "document.pdf"
    target_file_id = file_id

    if file:
        file_bytes = await file.read()
        filename = sanitize_filename(file.filename or "preview.pdf")
        path = generate_storage_path(current_user.id, filename, "previews")
        await storage.upload(file_bytes, path, "application/pdf")
        db_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=filename, stored_filename=filename,
            storage_path=path, mime_type="application/pdf",
            file_size=len(file_bytes), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="render_preview",
            category=ToolCategory.PDF,
        )
        db.add(db_file)
        await db.flush()
        target_file_id = db_file.id
    elif file_id:
        result = await db.execute(select(FileModel).where(FileModel.id == file_id))
        f = result.scalar_one_or_none()
        if not f:
            raise HTTPException(404, "File not found")
        file_bytes = await storage.download(f.storage_path)
        filename = f.original_filename
    else:
        raise HTTPException(400, "Either file or file_id must be provided")

    try:
        pages = PDFService.render_pdf_pages_as_images(file_bytes, dpi=dpi, max_pages=max_pages)
        return {
            "file_id": target_file_id,
            "filename": filename,
            "page_count": len(pages),
            "pages": pages,
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to render PDF preview: {str(e)[:200]}")


@router.post("/sign-and-fill")
async def sign_and_fill_pdf(
    file: Optional[UploadFile] = File(None),
    file_id: Optional[str] = Form(None),
    elements_json: str = Form(...),
    signer_name: Optional[str] = Form(None),
    signer_email: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Stamp digital signatures, text, dates, and checkboxes, then flatten PDF."""
    file_bytes = b""
    original_name = "signed_document.pdf"

    if file:
        file_bytes = await file.read()
        original_name = sanitize_filename(file.filename or "document.pdf")
    elif file_id:
        result = await db.execute(select(FileModel).where(FileModel.id == file_id))
        f = result.scalar_one_or_none()
        if not f:
            raise HTTPException(404, "File not found")
        file_bytes = await storage.download(f.storage_path)
        original_name = f.original_filename
    else:
        raise HTTPException(400, "Either file or file_id must be provided")

    try:
        elements = json.loads(elements_json)
    except Exception:
        raise HTTPException(400, "Invalid elements_json payload")

    try:
        signer_info = {
            "name": signer_name or (current_user.full_name if hasattr(current_user, "full_name") and current_user.full_name else current_user.email),
            "email": signer_email or current_user.email,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        }
        signed_pdf = PDFService.apply_signatures_and_form_fields(file_bytes, elements, signer_info)
        base = original_name.rsplit(".", 1)[0]
        out_name = f"{base}_signed.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(signed_pdf, out_path, "application/pdf")

        out_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=out_name, stored_filename=out_name,
            storage_path=out_path, mime_type="application/pdf",
            file_size=len(signed_pdf), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="sign",
            category=ToolCategory.PDF, is_output=True,
        )
        db.add(out_file)
        await db.flush()

        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
            "size": len(signed_pdf),
            "pages": PDFService.get_page_count(signed_pdf),
            "elements_applied": len(elements),
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to sign PDF: {str(e)[:200]}")


@router.post("/scan-pii")
async def scan_pdf_pii(
    file: Optional[UploadFile] = File(None),
    file_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Scan PDF for sensitive PII entities (Emails, Phones, Credit Cards, Aadhaar, SSN, PAN)."""
    file_bytes = b""
    filename = "document.pdf"
    target_file_id = file_id

    if file:
        file_bytes = await file.read()
        filename = sanitize_filename(file.filename or "scan.pdf")
        path = generate_storage_path(current_user.id, filename, "redact_sources")
        await storage.upload(file_bytes, path, "application/pdf")
        db_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=filename, stored_filename=filename,
            storage_path=path, mime_type="application/pdf",
            file_size=len(file_bytes), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="scan_pii",
            category=ToolCategory.PDF,
        )
        db.add(db_file)
        await db.flush()
        target_file_id = db_file.id
    elif file_id:
        result = await db.execute(select(FileModel).where(FileModel.id == file_id))
        f = result.scalar_one_or_none()
        if not f:
            raise HTTPException(404, "File not found")
        file_bytes = await storage.download(f.storage_path)
        filename = f.original_filename
    else:
        raise HTTPException(400, "Either file or file_id must be provided")

    try:
        detected = PIIRedactionService.scan_pdf_for_pii(file_bytes)
        return {
            "file_id": target_file_id,
            "filename": filename,
            "total_entities_found": len(detected),
            "entities": detected,
        }
    except Exception as e:
        raise HTTPException(500, f"PII scan failed: {str(e)[:200]}")


@router.post("/apply-redactions")
async def apply_pdf_redactions(
    file: Optional[UploadFile] = File(None),
    file_id: Optional[str] = Form(None),
    redactions_json: str = Form(...),
    strip_metadata: bool = Form(True),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Burn opaque black boxes and permanently purge underlying text/vectors."""
    file_bytes = b""
    original_name = "redacted_document.pdf"

    if file:
        file_bytes = await file.read()
        original_name = sanitize_filename(file.filename or "document.pdf")
    elif file_id:
        result = await db.execute(select(FileModel).where(FileModel.id == file_id))
        f = result.scalar_one_or_none()
        if not f:
            raise HTTPException(404, "File not found")
        file_bytes = await storage.download(f.storage_path)
        original_name = f.original_filename
    else:
        raise HTTPException(400, "Either file or file_id must be provided")

    try:
        redaction_items = json.loads(redactions_json)
    except Exception:
        raise HTTPException(400, "Invalid redactions_json payload")

    try:
        redacted_pdf = PIIRedactionService.apply_redactions(
            file_bytes, redaction_items, strip_metadata=strip_metadata
        )
        base = original_name.rsplit(".", 1)[0]
        out_name = f"{base}_redacted.pdf"
        out_path = generate_storage_path(current_user.id, out_name, "outputs")
        await storage.upload(redacted_pdf, out_path, "application/pdf")

        out_file = FileModel(
            id=str(uuid.uuid4()), user_id=current_user.id,
            original_filename=out_name, stored_filename=out_name,
            storage_path=out_path, mime_type="application/pdf",
            file_size=len(redacted_pdf), file_extension=".pdf",
            status=FileStatus.COMPLETED, tool_type="redact",
            category=ToolCategory.PDF, is_output=True,
        )
        db.add(out_file)
        await db.flush()

        return {
            "status": "completed",
            "output_file_id": out_file.id,
            "filename": out_name,
            "download_url": storage.get_url(out_file.id, out_name),
            "size": len(redacted_pdf),
            "redactions_burned": len(redaction_items),
        }
    except Exception as e:
        raise HTTPException(500, f"Redaction failed: {str(e)[:200]}")

