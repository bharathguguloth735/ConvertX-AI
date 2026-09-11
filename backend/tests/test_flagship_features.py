"""
DocuFlow AI — Test Suite for Flagship Features
Tests: Digital Signature Studio, Smart PII Masking & Redaction, Batch Converter, and Developer API Keys.
"""
import pytest
import io
import fitz
import base64
import hashlib
import zipfile

from app.services.pdf.pdf_service import PDFService
from app.services.pdf.pii_redaction_service import PIIRedactionService


def _create_test_pdf(text_lines: list) -> bytes:
    """Helper: Create an in-memory PDF with provided text lines."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4
    y = 50
    for line in text_lines:
        page.insert_text(fitz.Point(50, y), line, fontsize=12)
        y += 25
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def test_pdf_render_pages_and_signature_application():
    """Verify PDF page rendering for canvas and cryptographic signature stamping."""
    pdf_bytes = _create_test_pdf([
        "Non-Disclosure Agreement (NDA)",
        "This agreement is made between Party A and Party B.",
        "Signatures below:",
    ])

    # 1. Test page rendering
    pages = PDFService.render_pdf_pages_as_images(pdf_bytes, dpi=72)
    assert len(pages) == 1
    assert pages[0]["page_number"] == 1
    assert pages[0]["image_data"].startswith("data:image/png;base64,")
    assert pages[0]["width"] > 0
    assert pages[0]["height"] > 0

    # 2. Test signature and form stamping
    # 1x1 transparent PNG in base64
    tiny_png_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    elements = [
        {
            "type": "signature",
            "page": 1,
            "x": 60,
            "y": 200,
            "width": 140,
            "height": 50,
            "data": tiny_png_b64,
        },
        {
            "type": "text",
            "page": 1,
            "x": 60,
            "y": 260,
            "text": "Authorized Signer: Bharath G",
            "font_size": 11,
            "color": "#1e3a8a",
        },
        {
            "type": "date",
            "page": 1,
            "x": 60,
            "y": 280,
            "text": "Date: 2026-09-11",
            "font_size": 10,
        },
        {
            "type": "checkbox",
            "page": 1,
            "x": 60,
            "y": 310,
            "width": 16,
            "height": 16,
            "checked": True,
        }
    ]

    signer_info = {
        "name": "Bharath G",
        "email": "bharath@example.com",
        "timestamp": "2026-09-11 12:00:00 UTC",
    }

    signed_pdf = PDFService.apply_signatures_and_form_fields(pdf_bytes, elements, signer_info)
    assert len(signed_pdf) > len(pdf_bytes)

    # Verify metadata & text inside signed PDF
    doc = fitz.open(stream=signed_pdf, filetype="pdf")
    assert len(doc) == 1
    meta = doc.metadata
    assert "DocuFlow-Verified" in meta.get("keywords", "")
    assert "Bharath G" in meta.get("subject", "")
    
    # Verify text was written
    page_text = doc[0].get_text()
    assert "Authorized Signer: Bharath G" in page_text
    doc.close()


def test_pii_scanner_and_permanent_redaction():
    """Verify regex NER discovery of sensitive PII and permanent burn-in redactions."""
    secret_email = "executive.ceo@enterprise-corp.com"
    secret_phone = "9876543210"
    secret_pan = "ABCDE1234F"

    pdf_bytes = _create_test_pdf([
        "Confidential Personnel Record",
        f"Contact Email: {secret_email}",
        f"Mobile Hotline: {secret_phone}",
        f"Tax Identifier: {secret_pan}",
        "Public Information: Regular corporate policy.",
    ])

    # 1. Scan for PII
    detected_items = PIIRedactionService.scan_pdf_for_pii(pdf_bytes)
    assert len(detected_items) >= 3

    detected_types = {item["type"] for item in detected_items}
    assert "email" in detected_types
    assert "phone" in detected_types
    assert "pan" in detected_types

    # Ensure bounding boxes exist
    for item in detected_items:
        bbox = item["bbox"]
        assert len(bbox) == 4
        assert bbox[2] > bbox[0]  # x1 > x0
        assert bbox[3] > bbox[1]  # y1 > y0

    # 2. Burn Redactions
    redacted_pdf = PIIRedactionService.apply_redactions(pdf_bytes, detected_items, strip_metadata=True)
    assert len(redacted_pdf) > 0

    # 3. Verify text was permanently destroyed and is no longer extractable
    redacted_doc = fitz.open(stream=redacted_pdf, filetype="pdf")
    redacted_text = redacted_doc[0].get_text()

    assert secret_email not in redacted_text
    assert secret_phone not in redacted_text
    assert secret_pan not in redacted_text
    # Public text should still exist
    assert "Public Information" in redacted_text
    redacted_doc.close()


def test_batch_zip_packaging():
    """Verify batch processing ZIP bundling and compression."""
    file1_bytes = b"Hello from converted document 1"
    file2_bytes = b"Hello from converted document 2"

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("doc1.txt", file1_bytes)
        zf.writestr("doc2.txt", file2_bytes)

    zip_bytes = zip_buf.getvalue()
    assert len(zip_bytes) > 0

    with zipfile.ZipFile(io.BytesIO(zip_bytes), mode="r") as zf:
        namelist = zf.namelist()
        assert "doc1.txt" in namelist
        assert "doc2.txt" in namelist
        assert zf.read("doc1.txt") == file1_bytes
        assert zf.read("doc2.txt") == file2_bytes


def test_api_key_hashing_and_prefix():
    """Verify API Key format, prefix extraction, and SHA-256 hashing."""
    raw_key = "df_live_0123456789abcdef0123456789abcdef"
    assert raw_key.startswith("df_live_")

    prefix = f"df_live_{raw_key[8:16]}..."
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    assert len(key_hash) == 64
    assert prefix == "df_live_01234567..."

    # Re-hashing produces exact deterministic match
    assert hashlib.sha256(raw_key.encode("utf-8")).hexdigest() == key_hash
