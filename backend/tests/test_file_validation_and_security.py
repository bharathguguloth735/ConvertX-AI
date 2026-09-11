"""
DocuFlow AI — File Validation, Security & Storage Tests
Tests path traversal barriers, HMAC token signatures, filename sanitization, and MIME detection.
"""
import pytest
import time
from pathlib import Path
from app.security.file_validation import (
    is_safe_filename,
    sanitize_filename,
    validate_file_size,
    detect_mime_type,
    get_file_hash,
)
from app.services.storage.storage_service import (
    LocalStorageService,
    generate_signed_download_token,
    verify_signed_download_token,
)


def test_safe_filename_validation():
    """Verify detection of malicious path traversal in filenames."""
    assert is_safe_filename("document.pdf") is True
    assert is_safe_filename("my-report_2026.docx") is True
    assert is_safe_filename("../secret.env") is False
    assert is_safe_filename("..\\..\\windows\\system32") is False
    assert is_safe_filename("subfolder/file.txt") is False
    assert is_safe_filename("C:\\Users\\admin\\file.txt") is False


def test_filename_sanitization():
    """Verify filename sanitization removes special characters and path markers."""
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("my file (1) [final]!.pdf") == "my file 1 final.pdf"
    assert sanitize_filename("") == "file"
    assert len(sanitize_filename("a" * 300)) <= 200


def test_file_size_validation():
    """Verify file size category limits."""
    # 5MB PDF is valid
    assert validate_file_size(5 * 1024 * 1024, "pdf") is True
    # 2GB PDF exceeds limit
    assert validate_file_size(2 * 1024 * 1024 * 1024, "pdf") is False


def test_mime_type_detection():
    """Verify MIME detection on synthetic byte signatures."""
    pdf_header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    jpeg_header = b"\xff\xd8\xff\xe0\x00\x10JFIF"

    assert "pdf" in detect_mime_type(pdf_header, "test.pdf")
    assert "image" in detect_mime_type(png_header, "image.png")
    assert "image" in detect_mime_type(jpeg_header, "photo.jpg")


def test_file_hash_computation():
    """Verify SHA-256 computation."""
    content = b"DocuFlow AI Test Document"
    h1 = get_file_hash(content)
    h2 = get_file_hash(content)
    assert h1 == h2
    assert len(h1) == 64


def test_local_storage_path_traversal_prevention(tmp_path):
    """Verify that LocalStorageService rejects directory escapes."""
    storage = LocalStorageService(str(tmp_path))

    # Safe subpaths should succeed
    safe_path = storage._full_path("user123/output.pdf")
    assert str(safe_path).startswith(str(tmp_path.resolve()))

    # Malicious escapes must raise ValueError
    with pytest.raises(ValueError, match="Path traversal detected"):
        storage._full_path("../../windows/system32/cmd.exe")

    with pytest.raises(ValueError, match="Path traversal detected"):
        storage._full_path("/etc/shadow")


def test_signed_download_token_lifecycle():
    """Verify HMAC token signature creation, validation, and expiration."""
    file_path = "uploads/user_1/document.pdf"

    # Valid token within window
    valid_token = generate_signed_download_token(file_path, expires_in=60)
    assert verify_signed_download_token(file_path, valid_token) is True

    # Token for a different file should fail
    assert verify_signed_download_token("uploads/user_2/private.pdf", valid_token) is False

    # Tampered token should fail
    parts = valid_token.split(":")
    tampered_token = f"{parts[0]}:deadbeef{parts[1][8:]}"
    assert verify_signed_download_token(file_path, tampered_token) is False

    # Expired token should fail
    expired_token = generate_signed_download_token(file_path, expires_in=-10)
    assert verify_signed_download_token(file_path, expired_token) is False
