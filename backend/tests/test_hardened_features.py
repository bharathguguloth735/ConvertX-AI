"""
DocuFlow AI — Unit Tests for Hardened Bug Fixes and Security Features
Tests:
1. Job model fields & worker timing calculations (_update_job, started_at, processing_time_ms, celery_task_id).
2. Payment cryptographic verification & amount validation.
3. Social media clustered cache (Redis + in-memory fallback).
4. Rate limiter trusted proxy validation & anti-spoofing client IP extraction.
5. Storage sync download and upload methods for Celery workers.
"""
import uuid
import time
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.models.core import Job, JobStatus, DocumentChunk, OCRResult
from app.workers.pdf_tasks import _update_job, _get_sync_db
from app.api.payments import _generate_order_token, _verify_order_token, PLAN_PRICING
from app.api.social import save_analyzed_item, get_analyzed_item
from app.security.rate_limiter import is_trusted_proxy, extract_client_ip
from app.services.storage.storage_service import LocalStorageService


def test_job_model_fields_and_worker_timing():
    """Verify Job model fields (celery_task_id, started_at, processing_time_ms) and worker timing."""
    db = _get_sync_db()
    try:
        job_id = str(uuid.uuid4())
        test_job = Job(
            id=job_id,
            user_id="test_user_timing",
            job_type="pdf.convert",
            status=JobStatus.PENDING.value,
            celery_task_id="celery-task-12345",
        )
        db.add(test_job)
        db.commit()

        # Step 1: Worker marks job as processing
        _update_job(db, job_id, "processing", progress=25)
        reloaded = db.query(Job).filter(Job.id == job_id).first()
        assert reloaded.status == "processing"
        assert reloaded.started_at is not None
        assert reloaded.celery_task_id == "celery-task-12345"

        # Simulate small delay
        time.sleep(0.05)

        # Step 2: Worker marks job as completed
        _update_job(db, job_id, "completed", progress=100, result={"test": "success"})
        reloaded_done = db.query(Job).filter(Job.id == job_id).first()
        assert reloaded_done.status == "completed"
        assert reloaded_done.completed_at is not None
        assert reloaded_done.processing_time_ms is not None
        assert reloaded_done.processing_time_ms >= 10
    finally:
        db.close()


def test_payment_token_security_and_amount_verification():
    """Verify HMAC-SHA256 order token generation and tamper detection."""
    order_id = "DF_ORD_TEST_999"
    plan_id = "pro"
    valid_amount = PLAN_PRICING["pro"]["price"]

    # 1. Valid token succeeds
    token = _generate_order_token(order_id, plan_id, valid_amount)
    assert _verify_order_token(order_id, plan_id, valid_amount, token) is True

    # 2. Tampered amount fails
    assert _verify_order_token(order_id, plan_id, 1.0, token) is False

    # 3. Tampered plan fails
    assert _verify_order_token(order_id, "business", valid_amount, token) is False

    # 4. Tampered order ID fails
    assert _verify_order_token("DF_ORD_FORGED", plan_id, valid_amount, token) is False

    # 5. Empty token fails
    assert _verify_order_token(order_id, plan_id, valid_amount, "") is False


@pytest.mark.asyncio
async def test_social_clustered_caching():
    """Verify social media cache storage, retrieval, and option preservation."""
    item_id = str(uuid.uuid4())
    item_data = {
        "id": item_id,
        "platform": "instagram",
        "source_url": "https://www.instagram.com/reel/C8X9L0P1234/",
        "media_type": "video",
        "status": "available",
        "title": "Test Reel",
        "author": "tester",
        "options": [
            {
                "id": "opt_hd",
                "label": "HD Video (1080p)",
                "format": "mp4",
                "quality": "1080p",
                "media_type": "video",
                "downloadable": True,
            }
        ],
    }

    # Save item
    await save_analyzed_item(item_id, item_data, ttl_seconds=60)

    # Retrieve item
    retrieved = await get_analyzed_item(item_id)
    assert retrieved is not None
    assert retrieved["id"] == item_id
    assert retrieved["platform"] == "instagram"
    assert len(retrieved["options"]) == 1
    assert retrieved["options"][0]["id"] == "opt_hd"

    # Non-existent item returns None
    missing = await get_analyzed_item("non_existent_id_12345")
    assert missing is None


def test_rate_limiter_trusted_proxy_and_ip_extraction():
    """Verify trusted proxy detection and that untrusted clients cannot spoof X-Forwarded-For."""
    # 1. Trusted proxies
    assert is_trusted_proxy("127.0.0.1") is True
    assert is_trusted_proxy("::1") is True
    assert is_trusted_proxy("172.17.0.2") is True  # Docker default bridge subnet
    assert is_trusted_proxy("192.168.1.50") is True

    # 2. Untrusted public IPs
    assert is_trusted_proxy("203.0.113.195") is False
    assert is_trusted_proxy("8.8.8.8") is False

    # 3. Untrusted direct client sends spoofed X-Forwarded-For -> Ignored!
    mock_req_untrusted = MagicMock()
    mock_req_untrusted.client.host = "203.0.113.195"
    mock_req_untrusted.headers = {"X-Forwarded-For": "1.1.1.1"}
    assert extract_client_ip(mock_req_untrusted) == "203.0.113.195"

    # 4. Trusted reverse proxy (e.g. 127.0.0.1 / Nginx) sends X-Forwarded-For -> Accepted!
    mock_req_proxy = MagicMock()
    mock_req_proxy.client.host = "127.0.0.1"
    mock_req_proxy.headers = {"X-Forwarded-For": "203.0.113.50, 10.0.0.1"}
    assert extract_client_ip(mock_req_proxy) == "203.0.113.50"


def test_storage_sync_methods():
    """Verify synchronous download_sync and upload_sync for worker execution."""
    storage = LocalStorageService("./uploads")
    test_bytes = b"Hello ConvertX AI Sync Storage Worker!"
    test_path = f"tests/sync_test_{uuid.uuid4().hex[:8]}.txt"

    # Upload synchronously
    stored_path = storage.upload_sync(test_bytes, test_path, "text/plain")
    assert stored_path == test_path

    # Download synchronously
    read_bytes = storage.download_sync(test_path)
    assert read_bytes == test_bytes

    # Path traversal protection in sync operations
    with pytest.raises(ValueError, match="Path traversal detected"):
        storage.upload_sync(b"attack", "../evil.txt")
