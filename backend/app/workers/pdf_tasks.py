"""
DocuFlow AI — PDF Celery Tasks
"""
import uuid
from datetime import datetime, timezone
from celery import shared_task
from app.workers.celery_app import celery_app


def _get_sync_db():
    """Get a synchronous SQLAlchemy session for Celery workers."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.config import settings
    engine = create_engine(settings.sync_database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def _update_job(db, job_id: str, status: str, progress: int = 0,
                output_file_id: str = None, error_message: str = None, result: dict = None):
    from app.models import ProcessingJob, JobStatus
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if job:
        job.status = status
        job.progress = progress
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if status == "processing" and not job.started_at:
            job.started_at = now
        if output_file_id:
            job.output_file_id = output_file_id
        if error_message:
            job.error_message = error_message
        if result:
            import json
            job.result = json.dumps(result) if isinstance(result, (dict, list)) else str(result)
        if status == "completed":
            job.completed_at = now
            if job.started_at:
                job.processing_time_ms = int(
                    (job.completed_at - job.started_at).total_seconds() * 1000
                )
        db.commit()


def _create_output_file(db, user_id: str, filename: str, storage_path: str,
                        mime_type: str, size: int, tool_type: str, category: str):
    from app.models import File, FileStatus, ToolCategory
    f = File(
        id=str(uuid.uuid4()),
        user_id=user_id,
        original_filename=filename,
        stored_filename=filename,
        storage_path=storage_path,
        mime_type=mime_type,
        file_size=size,
        file_extension="." + filename.rsplit(".", 1)[-1] if "." in filename else "",
        status=FileStatus.COMPLETED,
        tool_type=tool_type,
        is_output=True,
        category=category,
    )
    db.add(f)
    db.commit()
    return f.id


@celery_app.task(bind=True, name="pdf.convert")
def pdf_convert_task(self, job_id: str, input_path: str, user_id: str, options: dict):
    """Background task for PDF conversion operations."""
    from app.services.pdf.pdf_service import PDFService
    from app.services.storage.storage_service import storage, generate_storage_path

    db = _get_sync_db()
    try:
        _update_job(db, job_id, "processing", 10)

        # Read input file using storage abstraction
        file_bytes = storage.download_sync(input_path)

        operation = options.get("operation", "to_docx")
        _update_job(db, job_id, "processing", 40)

        output_bytes = None
        output_ext = "docx"
        output_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        if operation == "to_docx":
            output_bytes = PDFService.pdf_to_docx(file_bytes)
            output_ext = "docx"
            output_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif operation == "to_txt":
            text = PDFService.pdf_to_text(file_bytes)
            output_bytes = text.encode("utf-8")
            output_ext = "txt"
            output_mime = "text/plain"
        elif operation == "to_jpg":
            images = PDFService.pdf_to_images(file_bytes, fmt="JPEG")
            output_bytes = images[0] if images else b""
            output_ext = "jpg"
            output_mime = "image/jpeg"
        elif operation == "merge":
            extra_paths = options.get("extra_file_paths", [])
            pdf_list = [file_bytes]
            for p in extra_paths:
                pdf_list.append(storage.download_sync(p))
            output_bytes = PDFService.merge_pdfs(pdf_list)
            output_ext = "pdf"
            output_mime = "application/pdf"
        elif operation == "compress":
            output_bytes = PDFService.compress_pdf(file_bytes)
            output_ext = "pdf"
            output_mime = "application/pdf"
        elif operation == "rotate":
            angle = options.get("angle", 90)
            output_bytes = PDFService.rotate_pdf(file_bytes, angle)
            output_ext = "pdf"
            output_mime = "application/pdf"
        elif operation == "watermark":
            text = options.get("text", "CONFIDENTIAL")
            output_bytes = PDFService.add_watermark(file_bytes, text)
            output_ext = "pdf"
            output_mime = "application/pdf"
        elif operation == "add_page_numbers":
            output_bytes = PDFService.add_page_numbers(file_bytes)
            output_ext = "pdf"
            output_mime = "application/pdf"

        _update_job(db, job_id, "processing", 80)

        if output_bytes:
            orig_name = options.get("original_filename", "output")
            base_name = orig_name.rsplit(".", 1)[0]
            out_filename = f"{base_name}_{operation}.{output_ext}"
            out_path = generate_storage_path(user_id, out_filename, "outputs")
            storage.upload_sync(output_bytes, out_path, output_mime)

            output_file_id = _create_output_file(
                db, user_id, out_filename, out_path, output_mime,
                len(output_bytes), operation, "pdf"
            )
            _update_job(db, job_id, "completed", 100, output_file_id=output_file_id,
                        result={"output_file_id": output_file_id, "size": len(output_bytes)})

    except Exception as e:
        _update_job(db, job_id, "failed", error_message=str(e)[:500])
        raise
    finally:
        db.close()
