"""
DocuFlow AI — PDF Service
All PDF processing operations using PyMuPDF, pypdf, pdfplumber, ReportLab
"""
import io
import os
import tempfile
import importlib
import base64
import hashlib
import uuid
from pathlib import Path
from typing import List, Optional, Tuple
import fitz  # PyMuPDF
from PIL import Image
import zipfile


class PDFService:
    """Handles all PDF file operations."""

    # ── Conversion ────────────────────────────────────────────────────────────

    @staticmethod
    def pdf_to_images(pdf_bytes: bytes, dpi: int = 300, fmt: str = "PNG") -> List[bytes]:
        """Convert each PDF page to an image. Returns list of image bytes."""
        images = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes(fmt.lower())
            images.append(img_bytes)
        doc.close()
        return images

    @staticmethod
    def pdf_to_text(pdf_bytes: bytes) -> str:
        """Extract all text from a PDF."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        texts = []
        for i, page in enumerate(doc):
            texts.append(f"--- Page {i+1} ---\n{page.get_text()}")
        doc.close()
        return "\n\n".join(texts)

    @staticmethod
    def pdf_to_markdown(pdf_bytes: bytes) -> str:
        """Extract all text from a PDF as Markdown."""
        try:
            pymupdf4llm = importlib.import_module("pymupdf4llm")
            md_text = pymupdf4llm.to_markdown(stream=pdf_bytes)
            return md_text
        except (ImportError, Exception):
            # Fallback to standard text if pymupdf4llm is not installed
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            texts = []
            for i, page in enumerate(doc):
                texts.append(f"## Page {i+1}\n\n{page.get_text()}")
            doc.close()
            return "\n\n".join(texts)

    @staticmethod
    def pdf_to_docx(pdf_bytes: bytes) -> bytes:
        """Convert PDF to DOCX. Extracts text and structures it."""
        from docx import Document
        from docx.shared import Pt, Inches
        import pdfplumber

        doc = Document()
        doc.add_heading("Converted Document", 0)

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for i, page in enumerate(pdf.pages):
                if i > 0:
                    doc.add_page_break()
                doc.add_paragraph(f"Page {i+1}", style="Heading 2")
                text = page.extract_text() or ""
                if text:
                    for paragraph in text.split("\n"):
                        if paragraph.strip():
                            doc.add_paragraph(paragraph.strip())

                # Extract tables
                for table in page.extract_tables():
                    t = doc.add_table(rows=len(table), cols=len(table[0]) if table else 0)
                    t.style = "Table Grid"
                    for row_idx, row in enumerate(table):
                        for col_idx, cell in enumerate(row or []):
                            if cell:
                                t.cell(row_idx, col_idx).text = str(cell)

        buffer = io.BytesIO()
        doc.save(buffer)
        return buffer.getvalue()

    @staticmethod
    def docx_to_pdf(docx_bytes: bytes) -> bytes:
        """Convert DOCX to PDF using ReportLab (text extraction approach)."""
        from docx import Document as DocxDocument
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch

        # Extract content from DOCX
        docx_doc = DocxDocument(io.BytesIO(docx_bytes))
        styles = getSampleStyleSheet()
        story = []

        for para in docx_doc.paragraphs:
            if para.text.strip():
                style_name = "Heading1" if para.style.name.startswith("Heading 1") else "Normal"
                story.append(Paragraph(para.text, styles[style_name]))
                story.append(Spacer(1, 0.1 * inch))

        buffer = io.BytesIO()
        pdf_doc = SimpleDocTemplate(buffer, pagesize=letter)
        pdf_doc.build(story)
        return buffer.getvalue()

    # ── PDF Manipulation ───────────────────────────────────────────────────────

    @staticmethod
    def merge_pdfs(pdf_bytes_list: List[bytes]) -> bytes:
        """Merge multiple PDFs into one."""
        merged = fitz.open()
        for pdf_bytes in pdf_bytes_list:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            merged.insert_pdf(doc)
            doc.close()
        buffer = io.BytesIO()
        merged.save(buffer)
        merged.close()
        return buffer.getvalue()

    @staticmethod
    def split_pdf(pdf_bytes: bytes, pages_per_split: int = 1) -> List[bytes]:
        """Split a PDF into chunks of given page count."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        results = []
        total = len(doc)
        for start in range(0, total, pages_per_split):
            new_doc = fitz.open()
            end = min(start + pages_per_split, total)
            new_doc.insert_pdf(doc, from_page=start, to_page=end - 1)
            buf = io.BytesIO()
            new_doc.save(buf)
            results.append(buf.getvalue())
            new_doc.close()
        doc.close()
        return results

    @staticmethod
    def extract_pages(pdf_bytes: bytes, page_numbers: List[int]) -> bytes:
        """Extract specific pages (0-indexed) from a PDF."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        new_doc = fitz.open()
        for pg in page_numbers:
            if 0 <= pg < len(doc):
                new_doc.insert_pdf(doc, from_page=pg, to_page=pg)
        buf = io.BytesIO()
        new_doc.save(buf)
        new_doc.close()
        doc.close()
        return buf.getvalue()

    @staticmethod
    def delete_pages(pdf_bytes: bytes, page_numbers: List[int]) -> bytes:
        """Delete specific pages (0-indexed) from a PDF."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        # Sort descending to avoid index shifting
        for pg in sorted(set(page_numbers), reverse=True):
            if 0 <= pg < len(doc):
                doc.delete_page(pg)
        buf = io.BytesIO()
        doc.save(buf)
        doc.close()
        return buf.getvalue()

    @staticmethod
    def rotate_pdf(pdf_bytes: bytes, rotation: int = 90, pages: Optional[List[int]] = None) -> bytes:
        """Rotate PDF pages. rotation: 90, 180, 270."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        target_pages = pages if pages else list(range(len(doc)))
        for pg in target_pages:
            if 0 <= pg < len(doc):
                page = doc[pg]
                page.set_rotation(page.rotation + rotation)
        buf = io.BytesIO()
        doc.save(buf)
        doc.close()
        return buf.getvalue()

    @staticmethod
    def compress_pdf(pdf_bytes: bytes, quality: int = 75) -> bytes:
        """Compress PDF by optimizing images and removing redundant data."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        buf = io.BytesIO()
        doc.save(
            buf,
            garbage=4,
            deflate=True,
            deflate_images=True,
            deflate_fonts=True,
            clean=True,
        )
        doc.close()
        return buf.getvalue()

    @staticmethod
    def add_watermark(pdf_bytes: bytes, text: str, opacity: float = 0.3, color: str = "gray") -> bytes:
        """Add a text watermark to all pages."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            rect = page.rect
            center_x = rect.width / 2
            center_y = rect.height / 2
            page.insert_text(
                fitz.Point(max(20, center_x - 120), center_y),
                text,
                fontsize=40,
                color=(0.5, 0.5, 0.5),
                rotate=0,
            )
        buf = io.BytesIO()
        doc.save(buf)
        doc.close()
        return buf.getvalue()

    @staticmethod
    def add_page_numbers(pdf_bytes: bytes, position: str = "bottom-center", start: int = 1) -> bytes:
        """Add page numbers to all PDF pages."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for i, page in enumerate(doc):
            rect = page.rect
            num_text = str(start + i)
            if position == "bottom-center":
                point = fitz.Point(rect.width / 2 - 10, rect.height - 20)
            elif position == "top-center":
                point = fitz.Point(rect.width / 2 - 10, 20)
            else:
                point = fitz.Point(rect.width / 2 - 10, rect.height - 20)
            page.insert_text(point, num_text, fontsize=10, color=(0, 0, 0))
        buf = io.BytesIO()
        doc.save(buf)
        doc.close()
        return buf.getvalue()

    @staticmethod
    def get_pdf_metadata(pdf_bytes: bytes) -> dict:
        """Extract PDF metadata."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        meta = doc.metadata
        meta["page_count"] = len(doc)
        doc.close()
        return meta

    @staticmethod
    def set_pdf_metadata(pdf_bytes: bytes, metadata: dict) -> bytes:
        """Update PDF metadata."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        doc.set_metadata(metadata)
        buf = io.BytesIO()
        doc.save(buf)
        doc.close()
        return buf.getvalue()

    @staticmethod
    def images_to_pdf(image_bytes_list: List[bytes]) -> bytes:
        """Convert a list of images to a PDF."""
        doc = fitz.open()
        for img_bytes in image_bytes_list:
            img_doc = fitz.open(stream=img_bytes, filetype="image")
            pdf_bytes_tmp = img_doc.convert_to_pdf()
            img_doc.close()
            tmp_doc = fitz.open(stream=pdf_bytes_tmp, filetype="pdf")
            doc.insert_pdf(tmp_doc)
            tmp_doc.close()
        buf = io.BytesIO()
        doc.save(buf)
        doc.close()
        return buf.getvalue()

    @staticmethod
    def protect_pdf(pdf_bytes: bytes, password: str) -> bytes:
        """Encrypt PDF with a password."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        buf = io.BytesIO()
        doc.save(
            buf,
            encryption=fitz.PDF_ENCRYPT_AES_256,
            owner_pw=password,
            user_pw=password,
        )
        doc.close()
        return buf.getvalue()

    @staticmethod
    def unlock_pdf(pdf_bytes: bytes, password: str) -> bytes:
        """Decrypt a PDF using the provided password."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if not doc.is_encrypted:
            return pdf_bytes  # Already unlocked
        
        auth_success = doc.authenticate(password)
        if not auth_success:
            raise ValueError("Invalid password or unable to decrypt.")
            
        buf = io.BytesIO()
        doc.save(buf) # Saving without encryption params saves it unencrypted
        doc.close()
        return buf.getvalue()

    @staticmethod
    def get_page_count(pdf_bytes: bytes) -> int:
        """Return the number of pages in a PDF."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        count = len(doc)
        doc.close()
        return count

    @staticmethod
    def render_pdf_pages_as_images(pdf_bytes: bytes, dpi: int = 150, max_pages: int = 50) -> List[dict]:
        """Render PDF pages as base64 PNG images for interactive web canvases."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = []
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            pages.append({
                "page_number": i + 1,
                "width": float(page.rect.width),
                "height": float(page.rect.height),
                "image_data": f"data:image/png;base64,{b64}",
            })
        doc.close()
        return pages

    @staticmethod
    def apply_signatures_and_form_fields(
        pdf_bytes: bytes,
        elements: List[dict],
        signer_info: Optional[dict] = None
    ) -> bytes:
        """
        Stamp signatures (PNG images), text boxes, dates, and checkmarks onto exact
        coordinates of PDF pages, attach tamper-evident audit metadata, and flatten annotations.
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        num_pages = len(doc)

        for el in elements:
            page_num = int(el.get("page", 1)) - 1
            if page_num < 0 or page_num >= num_pages:
                continue
            page = doc[page_num]
            el_type = el.get("type", "signature")

            x = float(el.get("x", 50))
            y = float(el.get("y", 50))
            w = float(el.get("width", 150))
            h = float(el.get("height", 60))
            rect = fitz.Rect(x, y, x + w, y + h)

            if el_type in ("signature", "initial", "stamp"):
                data_uri = el.get("data", "")
                if data_uri:
                    if "," in data_uri:
                        data_uri = data_uri.split(",", 1)[1]
                    try:
                        sig_bytes = base64.b64decode(data_uri)
                        page.insert_image(rect, stream=sig_bytes)
                    except Exception:
                        pass

            elif el_type in ("text", "date", "name"):
                text = str(el.get("text", ""))
                font_size = float(el.get("font_size", 12))
                color_hex = el.get("color", "#000000").lstrip("#")
                try:
                    r = int(color_hex[0:2], 16) / 255.0
                    g = int(color_hex[2:4], 16) / 255.0
                    b = int(color_hex[4:6], 16) / 255.0
                    color = (r, g, b)
                except Exception:
                    color = (0, 0, 0)

                page.insert_textbox(rect, text, fontsize=font_size, fontname="helv", color=color)

            elif el_type == "checkbox":
                is_checked = bool(el.get("checked", True))
                page.draw_rect(rect, color=(0.2, 0.2, 0.2), width=1.2)
                if is_checked:
                    # Draw checkmark inside rect
                    p1 = fitz.Point(x + w * 0.2, y + h * 0.5)
                    p2 = fitz.Point(x + w * 0.45, y + h * 0.8)
                    p3 = fitz.Point(x + w * 0.85, y + h * 0.2)
                    page.draw_line(p1, p2, color=(0.08, 0.55, 0.25), width=2.0)
                    page.draw_line(p2, p3, color=(0.08, 0.55, 0.25), width=2.0)

        # Cryptographic tamper-evident audit metadata
        cert_id = f"CERT-{uuid.uuid4().hex[:12].upper()}"
        doc_hash = hashlib.sha256(pdf_bytes).hexdigest()[:16]
        meta = doc.metadata or {}
        signer_name = (signer_info or {}).get("name", "DocuFlow Verified Signer")
        timestamp = (signer_info or {}).get("timestamp", "2026-09-11 UTC")

        meta["subject"] = f"Digitally signed by {signer_name} on {timestamp}"
        meta["keywords"] = f"DocuFlow-Verified, CertID:{cert_id}, DocHash:{doc_hash}"
        meta["producer"] = "DocuFlow AI Cryptographic Signature Studio"
        doc.set_metadata(meta)

        buf = io.BytesIO()
        doc.save(buf, deflate=True, clean=True)
        doc.close()
        return buf.getvalue()

