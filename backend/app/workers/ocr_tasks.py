"""DocuFlow AI — OCR & AI Celery Tasks"""
from app.workers.celery_app import celery_app

@celery_app.task(bind=True, name="ocr.process")
def ocr_process_task(self, job_id: str, input_path: str, user_id: str, file_id: str, options: dict):
    from app.workers.pdf_tasks import _get_sync_db, _update_job
    from app.services.ocr.ocr_service import OCRService
    from app.models import OCRResult
    from app.config import settings
    import uuid

    db = _get_sync_db()
    try:
        _update_job(db, job_id, "processing", 10)
        with open(f"{settings.storage_local_path}/{input_path}", "rb") as f:
            file_bytes = f.read()

        language = options.get("language", "en")
        file_ext = options.get("file_ext", "pdf").lower()

        _update_job(db, job_id, "processing", 30)

        if file_ext == "pdf":
            result = OCRService.ocr_pdf(file_bytes, language)
        else:
            result = OCRService.extract_text_from_image(file_bytes, language)
            result["pages"] = [{"page": 1, "text": result["text"], "confidence": result["confidence"], "method": "ocr"}]
            result["page_count"] = 1

        _update_job(db, job_id, "processing", 80)

        # Save OCR result to DB
        ocr = OCRResult(
            id=str(uuid.uuid4()),
            file_id=file_id,
            user_id=user_id,
            extracted_text=result.get("text", ""),
            confidence=result.get("confidence"),
            language=language,
            page_count=result.get("page_count", 1),
            page_texts=result.get("pages"),
        )
        db.add(ocr)
        db.commit()

        _update_job(db, job_id, "completed", 100, result={
            "ocr_result_id": ocr.id,
            "text_preview": result.get("text", "")[:500],
            "word_count": result.get("word_count", 0),
            "confidence": result.get("confidence"),
        })
    except Exception as e:
        _update_job(db, job_id, "failed", error_message=str(e)[:500])
        raise
    finally:
        db.close()


@celery_app.task(bind=True, name="ai.process")
def ai_process_task(self, job_id: str, user_id: str, file_id: str, options: dict):
    from app.workers.pdf_tasks import _get_sync_db, _update_job
    from app.models import AIRequest
    from app.config import settings
    import uuid, asyncio

    db = _get_sync_db()
    try:
        _update_job(db, job_id, "processing", 10)
        operation = options.get("operation", "summarize")
        text = options.get("text", "")
        style = options.get("style", "detailed")

        _update_job(db, job_id, "processing", 40)

        # Run async AI provider in sync context
        from app.services.ai.ai_provider import get_ai_provider
        ai = get_ai_provider()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        if operation == "summarize":
            response = loop.run_until_complete(ai.summarize(text, style))
        elif operation == "classify":
            result = loop.run_until_complete(ai.classify(text))
            response = str(result)
        elif operation == "translate":
            target_lang = options.get("target_language", "Hindi")
            response = loop.run_until_complete(ai.translate(text, target_lang))
        else:
            response = loop.run_until_complete(ai.generate(text))

        loop.close()

        # Save AI request record
        ai_req = AIRequest(
            id=str(uuid.uuid4()),
            user_id=user_id,
            file_id=file_id,
            request_type=operation,
            prompt=text[:2000],
            response=response,
            model_used=options.get("model", "mock"),
        )
        db.add(ai_req)
        db.commit()

        _update_job(db, job_id, "completed", 100, result={
            "response": response,
            "ai_request_id": ai_req.id,
        })
    except Exception as e:
        _update_job(db, job_id, "failed", error_message=str(e)[:500])
        raise
    finally:
        db.close()
