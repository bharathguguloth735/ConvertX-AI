"""
DocuFlow AI — High-Performance Batch Processing & Bulk File Converter API
Enables users to upload multiple files at once, convert them in parallel, and export as a ZIP bundle.
"""
import io
import os
import zipfile
import uuid
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, File as FileModel, FileStatus, ToolCategory
from app.security.dependencies import get_current_user_or_guest
from app.services.storage.storage_service import storage, generate_storage_path
from app.security.file_validation import sanitize_filename, detect_mime_type
from app.services.pdf.pdf_service import PDFService

router = APIRouter(prefix="/api/batch", tags=["Batch Processing"])


@router.post("/convert")
async def batch_convert(
    files: List[UploadFile] = File(...),
    operation: str = Form("pdf_to_docx"),  # pdf_to_docx | pdf_to_jpg | pdf_to_txt | docx_to_pdf | images_to_pdf | image_compress
    quality: int = Form(80),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """
    Convert up to 50 files in a single batch operation and package into a .ZIP archive.
    """
    if not files:
        raise HTTPException(400, "No files uploaded")
    if len(files) > 50:
        raise HTTPException(400, "Maximum batch limit is 50 files at once")

    batch_id = str(uuid.uuid4())
    zip_buffer = io.BytesIO()
    results = []
    success_count = 0
    fail_count = 0

    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for idx, upload in enumerate(files):
            orig_name = sanitize_filename(upload.filename or f"file_{idx+1}")
            try:
                content = await upload.read()
                if not content:
                    fail_count += 1
                    results.append({
                        "filename": orig_name,
                        "status": "failed",
                        "error": "Empty file",
                    })
                    continue

                output_bytes = None
                output_name = None

                base = orig_name.rsplit(".", 1)[0]

                if operation == "pdf_to_docx":
                    output_bytes = PDFService.pdf_to_docx(content)
                    output_name = f"{base}.docx"

                elif operation == "pdf_to_txt":
                    txt = PDFService.pdf_to_text(content)
                    output_bytes = txt.encode("utf-8")
                    output_name = f"{base}.txt"

                elif operation == "docx_to_pdf":
                    output_bytes = PDFService.docx_to_pdf(content)
                    output_name = f"{base}.pdf"

                elif operation == "pdf_to_jpg":
                    imgs = PDFService.pdf_to_images(content, dpi=150, fmt="JPEG")
                    if imgs:
                        # Write images into subfolder inside zip
                        for page_idx, img in enumerate(imgs):
                            page_filename = f"{base}/page_{page_idx+1}.jpg"
                            zf.writestr(page_filename, img)
                        success_count += 1
                        results.append({
                            "filename": orig_name,
                            "output_name": f"{base} (pages 1-{len(imgs)})",
                            "status": "completed",
                            "pages": len(imgs),
                        })
                        continue
                    else:
                        raise ValueError("No pages converted")

                elif operation == "image_compress":
                    from app.services.image.image_service import ImageService
                    output_bytes = ImageService.compress_image(content, quality=quality)
                    ext = orig_name.rsplit(".", 1)[-1].lower() if "." in orig_name else "jpg"
                    output_name = f"{base}_compressed.{ext}"

                else:
                    # Fallback / generic conversion
                    output_bytes = content
                    output_name = orig_name

                if output_bytes and output_name:
                    zf.writestr(output_name, output_bytes)
                    success_count += 1
                    results.append({
                        "filename": orig_name,
                        "output_name": output_name,
                        "status": "completed",
                        "size": len(output_bytes),
                    })
                else:
                    fail_count += 1
                    results.append({
                        "filename": orig_name,
                        "status": "failed",
                        "error": "Conversion produced empty output",
                    })

            except Exception as e:
                fail_count += 1
                results.append({
                    "filename": orig_name,
                    "status": "failed",
                    "error": str(e)[:150],
                })

    zip_data = zip_buffer.getvalue()
    zip_filename = f"ConvertX_Batch_{int(time.time())}.zip"
    zip_path = generate_storage_path(current_user.id, zip_filename, "batches")
    await storage.upload(zip_data, zip_path, "application/zip")

    db_zip = FileModel(
        id=batch_id,
        user_id=current_user.id,
        original_filename=zip_filename,
        stored_filename=zip_filename,
        storage_path=zip_path,
        mime_type="application/zip",
        file_size=len(zip_data),
        file_extension=".zip",
        status=FileStatus.COMPLETED,
        tool_type="batch_convert",
        category=ToolCategory.PDF,
        is_output=True,
    )
    db.add(db_zip)
    await db.flush()

    return {
        "batch_id": batch_id,
        "operation": operation,
        "total_files": len(files),
        "successful_count": success_count,
        "failed_count": fail_count,
        "items": results,
        "zip_filename": zip_filename,
        "zip_size_bytes": len(zip_data),
        "zip_download_url": f"/api/files/download/{db_zip.id}",
    }
