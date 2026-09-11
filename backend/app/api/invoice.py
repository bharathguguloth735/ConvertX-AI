"""
DocuFlow AI — Invoice AI API
Extracts structured invoice data using OCR + AI.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import io

from app.database import get_db
from app.models import User, File as FileModel, InvoiceResult, FileStatus, ToolCategory
from app.security.dependencies import get_current_user, get_current_user_or_guest
from app.services.ocr.ocr_service import OCRService
from app.services.pdf.pdf_service import PDFService
from app.services.ai.ai_provider import ai_provider
from app.services.storage.storage_service import storage, generate_storage_path
from app.security.file_validation import sanitize_filename, detect_mime_type

router = APIRouter(tags=["Invoice AI"])

INVOICE_SCHEMA = {
    "invoice_number": "string",
    "vendor_name": "string",
    "vendor_address": "string",
    "vendor_gstin": "string or null",
    "customer_name": "string",
    "customer_address": "string",
    "customer_gstin": "string or null",
    "invoice_date": "string (YYYY-MM-DD or as written)",
    "due_date": "string or null",
    "currency": "string (INR, USD, etc.)",
    "subtotal": "number",
    "tax_amount": "number",
    "discount_amount": "number",
    "total_amount": "number",
    "payment_terms": "string or null",
    "line_items": [
        {
            "description": "string",
            "quantity": "number",
            "unit_price": "number",
            "discount": "number",
            "tax": "number",
            "amount": "number"
        }
    ]
}


@router.post("/analyze")
async def analyze_invoice(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Upload an invoice image/PDF and extract structured data using AI."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Empty file")

    safe_name = sanitize_filename(file.filename or "invoice.pdf")
    detected_mime = detect_mime_type(file_bytes, safe_name)

    # Upload file
    path = generate_storage_path(current_user.id, safe_name, "invoices")
    await storage.upload(file_bytes, path, detected_mime)

    db_file = FileModel(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        original_filename=safe_name,
        stored_filename=safe_name,
        storage_path=path,
        mime_type=detected_mime,
        file_size=len(file_bytes),
        file_extension=safe_name.rsplit(".", 1)[-1] if "." in safe_name else "",
        status=FileStatus.COMPLETED,
        tool_type="invoice_ai",
        category=ToolCategory.AI,
    )
    db.add(db_file)
    await db.flush()

    # Extract text
    if "pdf" in detected_mime:
        ocr_result = OCRService.ocr_pdf(file_bytes)
        text = ocr_result["text"]
    elif "image" in detected_mime:
        ocr_result = OCRService.extract_text_from_image(file_bytes)
        text = ocr_result["text"]
    else:
        text = file_bytes.decode("utf-8", errors="replace")

    import json
    # AI extraction
    extracted = await ai_provider.extract(text, "invoice", INVOICE_SCHEMA)

    # Validation flags
    validation_flags = _validate_invoice(extracted)

    invoice = InvoiceResult(
        id=str(uuid.uuid4()),
        file_id=db_file.id,
        user_id=current_user.id,
        invoice_number=extracted.get("invoice_number"),
        vendor_name=extracted.get("vendor_name"),
        invoice_date=str(extracted.get("invoice_date", "")),
        total_amount=str(extracted.get("total_amount", "")),
        raw_json=json.dumps({
            "extracted": extracted,
            "validation": validation_flags,
            "currency": extracted.get("currency", "INR"),
            "subtotal": _safe_float(extracted.get("subtotal")),
            "tax_amount": _safe_float(extracted.get("tax_amount")),
            "discount_amount": _safe_float(extracted.get("discount_amount")),
            "customer_name": extracted.get("customer_name"),
            "customer_address": extracted.get("customer_address"),
            "vendor_address": extracted.get("vendor_address"),
            "due_date": str(extracted.get("due_date", "")),
            "line_items": extracted.get("line_items", []),
        }),
    )
    db.add(invoice)
    current_user.ai_requests_used = (current_user.ai_requests_used or 0) + 1
    await db.flush()

    return {
        "invoice_id": invoice.id,
        "file_id": db_file.id,
        "extracted": extracted,
        "validation": validation_flags,
    }


@router.post("/extract-invoice")
async def extract_invoice_alias(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Alias for /analyze to support frontend uploadWithProgress('/ai/extract-invoice')."""
    return await analyze_invoice(file=file, current_user=current_user, db=db)


@router.post("/save")
async def save_invoice(
    data: dict,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Save an invoice extraction to user dashboard."""
    import json
    invoice_id = data.get("invoice_id")
    if invoice_id:
        result = await db.execute(
            select(InvoiceResult).where(
                InvoiceResult.id == invoice_id,
                InvoiceResult.user_id == current_user.id,
            )
        )
        inv = result.scalar_one_or_none()
        if inv:
            return {"message": "Invoice already saved", "invoice_id": invoice_id}

    extracted = data.get("extracted", data)
    inv = InvoiceResult(
        id=str(uuid.uuid4()),
        file_id=data.get("file_id") or str(uuid.uuid4()),
        user_id=current_user.id,
        invoice_number=extracted.get("invoice_number"),
        vendor_name=extracted.get("vendor_name"),
        invoice_date=str(extracted.get("invoice_date", "")),
        total_amount=str(extracted.get("total_amount", "")),
        raw_json=json.dumps(data),
    )
    db.add(inv)
    await db.flush()
    return {"message": "Invoice saved successfully", "invoice_id": inv.id}


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Get invoice extraction result by ID."""
    result = await db.execute(
        select(InvoiceResult).where(
            InvoiceResult.id == invoice_id,
            InvoiceResult.user_id == current_user.id,
        )
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return inv


@router.get("/{invoice_id}/export")
async def export_invoice(
    invoice_id: str,
    format: str = "csv",
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Export invoice data as CSV, Excel, or JSON."""
    import json
    result = await db.execute(
        select(InvoiceResult).where(
            InvoiceResult.id == invoice_id,
            InvoiceResult.user_id == current_user.id,
        )
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Invoice not found")

    extra = {}
    if inv.raw_json:
        try:
            parsed = json.loads(inv.raw_json)
            extra = parsed.get("extracted", parsed)
        except Exception:
            extra = {}

    if format == "json":
        data = json.dumps({
            "invoice_number": inv.invoice_number or extra.get("invoice_number"),
            "vendor_name": inv.vendor_name or extra.get("vendor_name"),
            "total_amount": inv.total_amount or extra.get("total_amount"),
            "currency": extra.get("currency", "INR"),
            "invoice_date": inv.invoice_date or extra.get("invoice_date"),
            "details": extra,
        }, indent=2).encode()
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=invoice_{invoice_id}.json"},
        )
    elif format in ("csv", "excel"):
        import pandas as pd
        df_data = {
            "Invoice Number": [inv.invoice_number or extra.get("invoice_number")],
            "Vendor": [inv.vendor_name or extra.get("vendor_name")],
            "Customer": [extra.get("customer_name", "")],
            "Date": [inv.invoice_date or extra.get("invoice_date")],
            "Due Date": [extra.get("due_date", "")],
            "Subtotal": [extra.get("subtotal", "")],
            "Tax": [extra.get("tax_amount", "")],
            "Total": [inv.total_amount or extra.get("total_amount")],
            "Currency": [extra.get("currency", "INR")],
        }
        df = pd.DataFrame(df_data)
        buf = io.BytesIO()
        if format == "excel":
            df.to_excel(buf, index=False)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ext = "xlsx"
        else:
            df.to_csv(buf, index=False)
            media_type = "text/csv"
            ext = "csv"
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename=invoice_{invoice_id}.{ext}"},
        )
    raise HTTPException(400, "Format must be json, csv, or excel")


def _validate_invoice(data: dict) -> dict:
    """Perform basic invoice validation and return flags."""
    flags = []
    if not data.get("invoice_number"):
        flags.append({"type": "missing_field", "field": "invoice_number", "message": "Invoice number not found"})
    if not data.get("vendor_name"):
        flags.append({"type": "missing_field", "field": "vendor_name", "message": "Vendor name not found"})
    if not data.get("invoice_date"):
        flags.append({"type": "missing_field", "field": "invoice_date", "message": "Invoice date not found"})

    total = _safe_float(data.get("total_amount"))
    subtotal = _safe_float(data.get("subtotal"))
    tax = _safe_float(data.get("tax_amount", 0))
    if subtotal and total and abs((subtotal + tax) - total) > 0.01:
        flags.append({
            "type": "calculation_mismatch",
            "message": "Potential issue detected: Subtotal + Tax does not equal Total",
        })

    return {"flags": flags, "flag_count": len(flags)}


def _safe_float(val) -> Optional[float]:
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None
