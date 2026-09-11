"""DocuFlow AI — Stub task files for audio, image, video, OCR, AI, batch workers."""
from app.workers.celery_app import celery_app

@celery_app.task(bind=True, name="audio.process")
def audio_process_task(self, job_id: str, input_path: str, user_id: str, options: dict):
    from app.workers.pdf_tasks import _get_sync_db, _update_job, _create_output_file, generate_storage_path
    from app.services.audio.audio_service import AudioService
    from app.config import settings
    import os, uuid

    db = _get_sync_db()
    try:
        _update_job(db, job_id, "processing", 10)
        with open(f"{settings.storage_local_path}/{input_path}", "rb") as f:
            file_bytes = f.read()

        operation = options.get("operation", "cut")
        input_format = options.get("input_format", "mp3")
        output_format = options.get("output_format", "mp3")
        output_bytes = None
        output_ext = output_format

        _update_job(db, job_id, "processing", 40)

        if operation == "cut":
            start = float(options.get("start_seconds", 0))
            end = float(options.get("end_seconds", 30))
            output_bytes = AudioService.cut_audio(file_bytes, start, end, input_format, output_format)
        elif operation == "convert":
            output_bytes = AudioService.convert_format(file_bytes, input_format, output_format)
        elif operation == "compress":
            bitrate = options.get("bitrate", "128k")
            output_bytes = AudioService.compress_audio(file_bytes, input_format, bitrate)
        elif operation == "change_speed":
            speed = float(options.get("speed", 1.5))
            output_bytes = AudioService.change_speed(file_bytes, speed, input_format)
        elif operation == "change_volume":
            db_change = float(options.get("db_change", 6.0))
            output_bytes = AudioService.change_volume(file_bytes, db_change, input_format)
        elif operation == "fade_in":
            ms = int(options.get("duration_ms", 3000))
            output_bytes = AudioService.fade_in(file_bytes, ms, input_format)
        elif operation == "fade_out":
            ms = int(options.get("duration_ms", 3000))
            output_bytes = AudioService.fade_out(file_bytes, ms, input_format)
        elif operation == "extract_from_video":
            output_bytes = AudioService.extract_from_video(file_bytes, input_format, output_format)
            output_ext = output_format

        _update_job(db, job_id, "processing", 80)

        if output_bytes:
            orig_name = options.get("original_filename", "audio")
            base = orig_name.rsplit(".", 1)[0]
            out_filename = f"{base}_{operation}.{output_ext}"
            out_path = f"outputs/{user_id}/{uuid.uuid4().hex}.{output_ext}"
            full = f"{settings.storage_local_path}/{out_path}"
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "wb") as f:
                f.write(output_bytes)
            mime_map = {"mp3": "audio/mpeg", "wav": "audio/wav", "aac": "audio/aac", "ogg": "audio/ogg"}
            output_file_id = _create_output_file(
                db, user_id, out_filename, out_path,
                mime_map.get(output_ext, "audio/mpeg"), len(output_bytes), operation, "audio"
            )
            _update_job(db, job_id, "completed", 100, output_file_id=output_file_id,
                        result={"output_file_id": output_file_id})
    except Exception as e:
        _update_job(db, job_id, "failed", error_message=str(e)[:500])
        raise
    finally:
        db.close()
