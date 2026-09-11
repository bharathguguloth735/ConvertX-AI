"""DocuFlow AI — Image Celery Tasks"""
from app.workers.celery_app import celery_app

@celery_app.task(bind=True, name="image.process")
def image_process_task(self, job_id: str, input_path: str, user_id: str, options: dict):
    from app.workers.pdf_tasks import _get_sync_db, _update_job, _create_output_file
    from app.services.image.image_service import ImageService
    from app.services.storage.storage_service import storage, generate_storage_path
    import uuid

    db = _get_sync_db()
    try:
        _update_job(db, job_id, "processing", 10)
        file_bytes = storage.download_sync(input_path)

        operation = options.get("operation", "crop")
        output_bytes = None
        output_ext = options.get("output_format", "jpg")

        _update_job(db, job_id, "processing", 40)

        if operation == "crop":
            x, y, w, h = options.get("x",0), options.get("y",0), options.get("w",100), options.get("h",100)
            output_bytes = ImageService.crop(file_bytes, x, y, w, h)
        elif operation == "resize":
            w, h = int(options.get("width",800)), int(options.get("height",600))
            output_bytes = ImageService.resize(file_bytes, w, h, options.get("keep_aspect", True))
        elif operation == "compress":
            output_bytes = ImageService.compress(file_bytes, int(options.get("quality", 70)))
            output_ext = "jpg"
        elif operation == "convert":
            fmt = options.get("target_format", "png").upper()
            output_bytes = ImageService.convert_format(file_bytes, fmt, int(options.get("quality",85)))
            output_ext = fmt.lower()
        elif operation == "rotate":
            output_bytes = ImageService.rotate(file_bytes, float(options.get("angle",90)))
        elif operation == "flip":
            output_bytes = ImageService.flip(file_bytes, options.get("direction","horizontal"))
        elif operation == "remove_metadata":
            output_bytes = ImageService.remove_metadata(file_bytes)

        _update_job(db, job_id, "processing", 80)

        if output_bytes:
            orig_name = options.get("original_filename", "image")
            base = orig_name.rsplit(".", 1)[0]
            out_filename = f"{base}_{operation}.{output_ext}"
            out_path = generate_storage_path(user_id, out_filename, "outputs")
            mime_map = {"jpg":"image/jpeg","jpeg":"image/jpeg","png":"image/png","webp":"image/webp"}
            out_mime = mime_map.get(output_ext,"image/jpeg")
            storage.upload_sync(output_bytes, out_path, out_mime)
            output_file_id = _create_output_file(
                db, user_id, out_filename, out_path,
                out_mime, len(output_bytes), operation, "image"
            )
            _update_job(db, job_id, "completed", 100, output_file_id=output_file_id,
                        result={"output_file_id": output_file_id})
    except Exception as e:
        _update_job(db, job_id, "failed", error_message=str(e)[:500])
        raise
    finally:
        db.close()
