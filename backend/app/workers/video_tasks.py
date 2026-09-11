"""DocuFlow AI — Video Celery Tasks"""
from app.workers.celery_app import celery_app

@celery_app.task(bind=True, name="video.process")
def video_process_task(self, job_id: str, input_path: str, user_id: str, options: dict):
    from app.workers.pdf_tasks import _get_sync_db, _update_job, _create_output_file
    from app.services.video.video_service import VideoService
    from app.config import settings
    import os, uuid

    db = _get_sync_db()
    try:
        _update_job(db, job_id, "processing", 10)
        with open(f"{settings.storage_local_path}/{input_path}", "rb") as f:
            file_bytes = f.read()

        operation = options.get("operation", "cut")
        video_format = options.get("video_format", "mp4")
        output_bytes = None
        output_ext = video_format
        output_mime = "video/mp4"

        _update_job(db, job_id, "processing", 30)

        if operation == "cut":
            start = float(options.get("start_seconds", 0))
            end = float(options.get("end_seconds", 30))
            output_bytes = VideoService.cut_video(file_bytes, start, end, video_format)
        elif operation == "compress":
            crf = int(options.get("crf", 28))
            resolution = options.get("resolution")
            output_bytes = VideoService.compress_video(file_bytes, crf, video_format, resolution)
        elif operation == "extract_audio":
            audio_fmt = options.get("audio_format", "mp3")
            output_bytes = VideoService.extract_audio(file_bytes, video_format, audio_fmt)
            output_ext = audio_fmt
            output_mime = "audio/mpeg"
        elif operation == "to_gif":
            output_bytes = VideoService.video_to_gif(file_bytes, video_format)
            output_ext = "gif"
            output_mime = "image/gif"
        elif operation == "remove_audio":
            output_bytes = VideoService.remove_audio(file_bytes, video_format)
        elif operation == "change_speed":
            speed = float(options.get("speed", 2.0))
            output_bytes = VideoService.change_speed(file_bytes, speed, video_format)

        _update_job(db, job_id, "processing", 85)

        if output_bytes:
            orig = options.get("original_filename", "video")
            base = orig.rsplit(".", 1)[0]
            out_filename = f"{base}_{operation}.{output_ext}"
            out_path = f"outputs/{user_id}/{uuid.uuid4().hex}.{output_ext}"
            full = f"{settings.storage_local_path}/{out_path}"
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "wb") as f:
                f.write(output_bytes)
            output_file_id = _create_output_file(
                db, user_id, out_filename, out_path, output_mime, len(output_bytes), operation, "video"
            )
            _update_job(db, job_id, "completed", 100, output_file_id=output_file_id,
                        result={"output_file_id": output_file_id})
    except Exception as e:
        _update_job(db, job_id, "failed", error_message=str(e)[:500])
        raise
    finally:
        db.close()
