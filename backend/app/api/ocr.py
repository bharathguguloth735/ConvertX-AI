"""
DocuFlow AI — OCR API Router
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, File as FileModel, FileStatus, ToolCategory, OCRResult
from app.security.dependencies import get_current_user, get_current_user_or_guest
from app.services.ocr.ocr_service import OCRService
from app.services.pdf.pdf_service import PDFService
from app.services.storage.storage_service import storage, generate_storage_path
from app.security.file_validation import sanitize_filename, detect_mime_type

router = APIRouter(prefix="/api/ocr", tags=["OCR"])


@router.post("")
async def run_ocr(
    file: UploadFile = File(...),
    language: str = Form("en"),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Extract text from an image or PDF using OCR."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Empty file")

    safe_name = sanitize_filename(file.filename or "document.pdf")
    detected_mime = detect_mime_type(file_bytes, safe_name)

    # Upload file
    path = generate_storage_path(current_user.id, safe_name, "ocr")
    await storage.upload(file_bytes, path, detected_mime)

    db_file = FileModel(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        original_filename=safe_name,
        stored_filename=safe_name,
        storage_path=path,
        mime_type=detected_mime,
        file_size=len(file_bytes),
        file_extension=safe_name.rsplit(".", 1)[-1] if "." in safe_name else "",
        status=FileStatus.PROCESSING,
        tool_type="ocr",
        category=ToolCategory.OCR,
    )
    db.add(db_file)
    await db.flush()

    # Extract text
    try:
        file_ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else "pdf"

        if "pdf" in detected_mime:
            result = OCRService.ocr_pdf(file_bytes, language)
        else:
            result = OCRService.extract_text_from_image(file_bytes, language)
            result["pages"] = [{"page": 1, "text": result["text"], "confidence": result["confidence"]}]
            result["page_count"] = 1

        db_file.status = FileStatus.COMPLETED

        # Save OCR result
        ocr_record = OCRResult(
            id=str(uuid.uuid4()),
            file_id=db_file.id,
            user_id=current_user.id,
            extracted_text=result.get("text", ""),
            confidence=int(result.get("confidence") or 0),
            language=language,
        )
        db.add(ocr_record)
        await db.flush()

        return {
            "status": "completed",
            "file_id": db_file.id,
            "ocr_result_id": ocr_record.id,
            "text": result.get("text", ""),
            "text_preview": result.get("text", "")[:500],
            "word_count": len(result.get("text", "").split()),
            "confidence": result.get("confidence"),
            "page_count": result.get("page_count", 1),
            "language": language,
        }
    except Exception as e:
        db_file.status = FileStatus.FAILED
        await db.flush()
        raise HTTPException(500, f"OCR failed: {str(e)[:200]}")


@router.get("/{result_id}")
async def get_ocr_result(
    result_id: str,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Get OCR result by ID with full extracted text."""
    from sqlalchemy import select
    result = await db.execute(
        select(OCRResult).where(
            OCRResult.id == result_id,
        )
    )
    ocr = result.scalar_one_or_none()
    if not ocr:
        raise HTTPException(404, "OCR result not found")
    if ocr.user_id != current_user.id and ocr.user_id != "guest_user_id" and current_user.id != "guest_user_id":
        raise HTTPException(403, "Access denied")
    return {
        "id": ocr.id,
        "file_id": ocr.file_id,
        "text": ocr.extracted_text,
        "word_count": len(ocr.extracted_text.split()) if ocr.extracted_text else 0,
        "confidence": ocr.confidence,
        "language": ocr.language,
        "created_at": ocr.created_at.isoformat() if ocr.created_at else None,
    }
