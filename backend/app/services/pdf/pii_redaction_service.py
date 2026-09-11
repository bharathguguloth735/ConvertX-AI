"""
DocuFlow AI — Smart PII Masking & AI Document Redaction Service
Uses Regex NER pattern engine and PyMuPDF to locate and permanently burn redactions.
"""
import io
import re
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF


def _luhn_check(card_number_str: str) -> bool:
    """Validate credit card using Luhn algorithm."""
    digits = [int(c) for c in card_number_str if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, d in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = d * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += d
    return checksum % 10 == 0


class PIIRedactionService:
    """Scans documents for sensitive entities and permanently destroys them via PDF redactions."""

    PATTERNS: Dict[str, Tuple[str, str]] = {
        "email": (
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            "Email Address"
        ),
        "phone": (
            r'(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b[6-9]\d{9}\b)',
            "Phone Number"
        ),
        "credit_card": (
            r'\b(?:\d{4}[-\s]?){3}\d{4}\b',
            "Credit Card Number"
        ),
        "ssn": (
            r'\b\d{3}-\d{2}-\d{4}\b',
            "Social Security Number"
        ),
        "aadhaar": (
            r'\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b',
            "Aadhaar Number"
        ),
        "pan": (
            r'\b[A-Z]{5}[0-9]{4}[A-Z]\b',
            "PAN Card ID"
        ),
        "ip_address": (
            r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
            "IP Address"
        ),
    }

    @classmethod
    def scan_pdf_for_pii(cls, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extract sensitive entities from PDF text and locate their exact page bounding boxes.
        Returns list of detected PII items with categories, text, page number, and [x0, y0, x1, y1].
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        detected_items: List[Dict[str, Any]] = []
        seen_keys = set()

        for page_idx, page in enumerate(doc):
            page_text = page.get_text()
            if not page_text:
                continue

            page_num = page_idx + 1

            for pii_type, (regex_pattern, label) in cls.PATTERNS.items():
                for match in re.finditer(regex_pattern, page_text, re.IGNORECASE):
                    matched_str = match.group(0).strip()
                    if not matched_str or len(matched_str) < 4:
                        continue

                    # Extra check for credit card Luhn validity
                    if pii_type == "credit_card" and not _luhn_check(matched_str):
                        continue

                    # Search exact coordinate bounding boxes on this page
                    rects = page.search_for(matched_str)
                    if not rects:
                        # Fallback try parts if split across lines
                        parts = matched_str.split()
                        if parts:
                            rects = page.search_for(parts[0])

                    for r in rects:
                        dedup_key = f"{page_num}:{pii_type}:{round(r.x0, 1)}:{round(r.y0, 1)}"
                        if dedup_key in seen_keys:
                            continue
                        seen_keys.add(dedup_key)

                        detected_items.append({
                            "id": f"pii-{len(detected_items) + 1}",
                            "type": pii_type,
                            "label": label,
                            "text": matched_str,
                            "page": page_num,
                            "bbox": [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)],
                            "selected": True,
                        })

        doc.close()
        return detected_items

    @classmethod
    def apply_redactions(
        cls,
        pdf_bytes: bytes,
        redaction_items: List[Dict[str, Any]],
        strip_metadata: bool = True
    ) -> bytes:
        """
        Burn opaque black rectangles into PDF pages and permanently purge underlying text/vectors.
        Prevents copying or extracting sensitive text.
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        num_pages = len(doc)

        for item in redaction_items:
            page_num = int(item.get("page", 1)) - 1
            if page_num < 0 or page_num >= num_pages:
                continue

            page = doc[page_num]
            bbox = item.get("bbox")
            if not bbox or len(bbox) < 4:
                continue

            rect = fitz.Rect(bbox[0], bbox[1], bbox[2], bbox[3])
            # Add redaction annotation with solid black fill
            page.add_redact_annot(rect, fill=(0, 0, 0), text="")

        # Apply redactions to all pages permanently
        for page in doc:
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)

        if strip_metadata:
            doc.set_metadata({
                "title": "Redacted Document",
                "author": "DocuFlow AI Redaction Engine",
                "producer": "DocuFlow AI",
            })

        buf = io.BytesIO()
        doc.save(buf, deflate=True, clean=True)
        doc.close()
        return buf.getvalue()
