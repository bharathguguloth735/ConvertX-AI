"""
DocuFlow AI — PDF Processing Unit Tests
Tests merge, split, rotate, watermark, page deletion/extraction, and compression.
"""
import io
import fitz
import pytest
from app.services.pdf.pdf_service import PDFService


def _create_sample_pdf(num_pages: int = 2, text_prefix: str = "Page") -> bytes:
    """Helper to generate a lightweight in-memory PDF document."""
    doc = fitz.open()
    for i in range(num_pages):
        page = doc.new_page(width=595, height=842)  # A4 size
        page.insert_text((50, 100), f"DocuFlow AI Test: {text_prefix} {i + 1}", fontsize=18)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def test_pdf_creation_and_text_extraction():
    """Verify in-memory PDF generation and text extraction."""
    pdf_bytes = _create_sample_pdf(num_pages=2, text_prefix="Hello")
    extracted_text = PDFService.pdf_to_text(pdf_bytes)

    assert "DocuFlow AI Test: Hello 1" in extracted_text
    assert "DocuFlow AI Test: Hello 2" in extracted_text

    meta = PDFService.get_pdf_metadata(pdf_bytes)
    assert meta["page_count"] == 2


def test_pdf_merging():
    """Verify merging multiple PDFs into a single continuous document."""
    doc1 = _create_sample_pdf(num_pages=1, text_prefix="First")
    doc2 = _create_sample_pdf(num_pages=2, text_prefix="Second")

    merged_bytes = PDFService.merge_pdfs([doc1, doc2])
    merged_doc = fitz.open(stream=merged_bytes, filetype="pdf")

    assert len(merged_doc) == 3
    merged_doc.close()


def test_pdf_splitting():
    """Verify splitting a multi-page PDF into single page files."""
    doc = _create_sample_pdf(num_pages=4, text_prefix="Split")
    splits = PDFService.split_pdf(doc, pages_per_split=1)

    assert len(splits) == 4
    for sp in splits:
        d = fitz.open(stream=sp, filetype="pdf")
        assert len(d) == 1
        d.close()


def test_pdf_page_extraction_and_deletion():
    """Verify selective page extraction and page removal."""
    doc = _create_sample_pdf(num_pages=5, text_prefix="Page")

    # Extract pages 0 and 2
    extracted = PDFService.extract_pages(doc, [0, 2])
    d_extracted = fitz.open(stream=extracted, filetype="pdf")
    assert len(d_extracted) == 2
    d_extracted.close()

    # Delete page 1
    deleted = PDFService.delete_pages(doc, [1])
    d_deleted = fitz.open(stream=deleted, filetype="pdf")
    assert len(d_deleted) == 4
    d_deleted.close()


def test_pdf_watermark():
    """Verify watermarking PDF adds expected text."""
    doc = _create_sample_pdf(num_pages=1, text_prefix="WatermarkTarget")
    watermarked = PDFService.add_watermark(doc, "CONFIDENTIAL")

    watermarked_text = PDFService.pdf_to_text(watermarked)
    assert "CONFIDENTIAL" in watermarked_text


def test_pdf_rotate():
    """Verify page rotation modification."""
    doc = _create_sample_pdf(num_pages=1, text_prefix="RotateTarget")
    rotated = PDFService.rotate_pdf(doc, rotation=90)

    d_rotated = fitz.open(stream=rotated, filetype="pdf")
    assert d_rotated[0].rotation == 90
    d_rotated.close()


def test_pdf_compress():
    """Verify PDF compression produces a valid readable document."""
    doc = _create_sample_pdf(num_pages=2, text_prefix="CompressTarget")
    compressed = PDFService.compress_pdf(doc)

    assert len(compressed) > 0
    d_compressed = fitz.open(stream=compressed, filetype="pdf")
    assert len(d_compressed) == 2
    d_compressed.close()
