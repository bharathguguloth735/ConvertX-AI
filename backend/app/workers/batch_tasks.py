"""DocuFlow AI — Batch Processing Celery Task"""
from app.workers.celery_app import celery_app

@celery_app.task(bind=True, name="batch.process")
def batch_process_task(self, batch_id: str, user_id: str, options: dict):
    from app.workers.pdf_tasks import _get_sync_db
    from app.models import BatchJob, JobStatus
    from app.config import settings
    import os, uuid, zipfile

    db = _get_sync_db()
    try:
        batch = db.query(BatchJob).filter(BatchJob.id == batch_id).first()
        if not batch:
            return

        batch.status = "processing"
        db.commit()

        file_paths = options.get("file_paths", [])
        operation = options.get("operation", "convert")
        output_format = options.get("output_format", "webp")

        processed = []
        failed = 0

        for i, path in enumerate(file_paths):
            try:
                full_path = f"{settings.storage_local_path}/{path}"
                with open(full_path, "rb") as f:
                    fb = f.read()

                ext = path.rsplit(".", 1)[-1].lower()
                out_path = f"outputs/{user_id}/batch_{batch_id}/{uuid.uuid4().hex}.{output_format}"
                full_out = f"{settings.storage_local_path}/{out_path}"
                os.makedirs(os.path.dirname(full_out), exist_ok=True)

                if operation == "convert_image":
                    from app.services.image.image_service import ImageService
                    out_bytes = ImageService.convert_format(fb, output_format.upper())
                    with open(full_out, "wb") as f:
                        f.write(out_bytes)
                    processed.append(full_out)
                elif operation == "compress_image":
                    from app.services.image.image_service import ImageService
                    out_bytes = ImageService.compress(fb, quality=int(options.get("quality", 70)))
                    with open(full_out, "wb") as f:
                        f.write(out_bytes)
                    processed.append(full_out)
                elif operation == "pdf_to_txt":
                    from app.services.pdf.pdf_service import PDFService
                    text = PDFService.pdf_to_text(fb)
                    out_path_txt = out_path.replace(f".{output_format}", ".txt")
                    full_out_txt = f"{settings.storage_local_path}/{out_path_txt}"
                    with open(full_out_txt, "w", encoding="utf-8") as f:
                        f.write(text)
                    processed.append(full_out_txt)

                batch.processed_files = i + 1
                db.commit()

            except Exception:
                failed += 1
                batch.failed_files = failed
                db.commit()

        # Create ZIP
        if processed:
            zip_path = f"outputs/{user_id}/batch_{batch_id}/result.zip"
            full_zip = f"{settings.storage_local_path}/{zip_path}"
            with zipfile.ZipFile(full_zip, "w", zipfile.ZIP_DEFLATED) as zf:
                for p in processed:
                    zf.write(p, os.path.basename(p))
            batch.output_zip_path = zip_path

        batch.status = "completed"
        db.commit()

    except Exception as e:
        if batch:
            batch.status = "failed"
            batch.error_message = str(e)[:500]
            db.commit()
        raise
    finally:
        db.close()
