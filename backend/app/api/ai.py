"""
DocuFlow AI — AI Tools API (Summarize, Classify, Translate, Ask Document, RAG)
"""
import io
import json
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, AsyncSessionLocal
from app.models import User, File as FileModel, DocumentChunk, AIRequest, ToolCategory, FileStatus
from app.security.dependencies import get_current_user, get_current_user_or_guest
from app.services.ai.ai_provider import ai_provider, cosine_similarity, compute_dense_embedding
from app.services.pdf.pdf_service import PDFService
from app.services.ocr.ocr_service import OCRService
from app.services.storage.storage_service import storage, generate_storage_path
from app.security.file_validation import sanitize_filename, detect_mime_type

router = APIRouter(prefix="/api/ai", tags=["AI Tools"])



class SummarizeRequest(BaseModel):
    file_id: Optional[str] = None
    text: Optional[str] = None
    style: str = "detailed"  # short | detailed | bullets | key_points


class AskDocumentRequest(BaseModel):
    file_id: Optional[str] = None
    document_id: Optional[str] = None
    question: str


class TranslateRequest(BaseModel):
    text: str
    target_language: str
    source_language: str = "auto"


@router.post("/summarize")
async def summarize(
    data: SummarizeRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Summarize text or a previously uploaded document."""
    text = data.text

    if data.file_id:
        result = await db.execute(
            select(FileModel).where(FileModel.id == data.file_id)
        )
        f = result.scalar_one_or_none()
        if not f:
            raise HTTPException(404, "File not found")
        file_bytes = await storage.download(f.storage_path)

        if "pdf" in (f.mime_type or ""):
            text = PDFService.pdf_to_text(file_bytes)
            if not text.strip():
                ocr_result = OCRService.ocr_pdf(file_bytes)
                text = ocr_result.get("text", "")
        else:
            text = file_bytes.decode("utf-8", errors="replace")

    if not text:
        raise HTTPException(400, "No text or file_id provided")

    text_chunk = text[:12000]
    summary = await ai_provider.summarize(text_chunk, style=data.style)

    # Log AI request
    ai_req = AIRequest(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        file_id=data.file_id,
        request_type="summarize",
        prompt=text_chunk[:2000],
        response=summary,
    )
    db.add(ai_req)
    current_user.ai_requests_used = (current_user.ai_requests_used or 0) + 1
    await db.flush()

    return {"summary": summary, "style": data.style, "ai_request_id": ai_req.id}


@router.post("/summarize/stream")
async def summarize_stream_route(
    data: SummarizeRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """
    Real-time Server-Sent Events (SSE) streaming endpoint for document summarization.
    """
    text = data.text

    if data.file_id:
        result = await db.execute(
            select(FileModel).where(FileModel.id == data.file_id)
        )
        f = result.scalar_one_or_none()
        if not f:
            raise HTTPException(404, "File not found")
        file_bytes = await storage.download(f.storage_path)

        if "pdf" in (f.mime_type or ""):
            text = PDFService.pdf_to_text(file_bytes)
            if not text.strip():
                ocr_result = OCRService.ocr_pdf(file_bytes)
                text = ocr_result.get("text", "")
        else:
            text = file_bytes.decode("utf-8", errors="replace")

    if not text:
        raise HTTPException(400, "No text or file_id provided")

    text_chunk = text[:12000]
    user_id = current_user.id
    target_file_id = data.file_id
    style = data.style

    async def event_generator():
        collected_tokens = []
        try:
            async for token in ai_provider.summarize_stream(text_chunk, style=style):
                collected_tokens.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

            yield f"data: {json.dumps({'done': True, 'style': style})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # Asynchronously log AI request and update usage counter
        try:
            full_response = "".join(collected_tokens)
            async with AsyncSessionLocal() as session:
                ai_req = AIRequest(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    file_id=target_file_id,
                    request_type="summarize_stream",
                    prompt=text_chunk[:2000],
                    response=full_response,
                )
                session.add(ai_req)
                u_res = await session.execute(select(User).where(User.id == user_id))
                u = u_res.scalar_one_or_none()
                if u:
                    u.ai_requests_used = (u.ai_requests_used or 0) + 1
                await session.commit()
        except Exception:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


def _format_document_title_and_bullets(text: str, filename: str, summary: str) -> tuple[str, List[str]]:
    import re
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    title = ""
    if lines:
        first_few = " ".join(lines[:5])
        comp_match = re.search(r'([A-Z][A-Za-z0-9\s.,&-]+?(?:Pvt\.?\s*Ltd\.?|LLC|Inc\.?|Corp\.?|Services|Store|Delivery|Logistics|Technologies))', first_few)
        type_match = re.search(r'(Order\s+Summary\s*(?:&|and)?\s*Receipt|Tax\s+Invoice|Invoice|Receipt|Purchase\s+Order|Summary|Agreement|Bill)', first_few, re.I)
        if comp_match and type_match:
            title = f"{comp_match.group(1).strip()} — {type_match.group(1).strip()}"
        elif comp_match:
            title = f"{comp_match.group(1).strip()} — Document Summary"
        elif type_match:
            title = type_match.group(1).strip()
        elif len(lines[0]) < 60:
            title = lines[0]

    if not title:
        base = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()
        title = f"{base} — Document Summary"

    bullet_points = []
    # 1. Check if summary has bullet points
    for line in summary.split("\n"):
        line = line.strip()
        if line.startswith("•") or line.startswith("-") or line.startswith("*"):
            clean = line.lstrip("•-* ").strip()
            if len(clean) > 8:
                bullet_points.append(clean)
        elif re.match(r'^\d+[\.\)]\s+', line):
            clean = re.sub(r'^\d+[\.\)]\s+', '', line).strip()
            if len(clean) > 8:
                bullet_points.append(clean)

    # 2. If no bullet points found, extract high-yield key factual sentences from text/summary
    if not bullet_points:
        # Check for order details
        order_match = re.search(r'(?:Order ID|Invoice No|Receipt ID)[:\s]*([A-Za-z0-9\-_]+)', text, re.I)
        date_match = re.search(r'(?:Order Date & Time|Date & Time|Date)[:\s]*([0-9A-Za-z\s,:]+?(?:AM|PM|\d{4}))', text, re.I)
        cust_match = re.search(r'(?:Customer Name|Billed To)[:\s]*([A-Za-z\s.]+)', text, re.I)
        total_match = re.search(r'(?:Total|Grand Total)[:\s]*([₹$€£]?\s*[\d,]+\.?\d*)', text, re.I)
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        phone_match = re.search(r'\+?\d[\d\s-]{8,}\d', text)

        if comp_match or order_match:
            lead = f"The document is an order summary and receipt from {comp_match.group(1).strip() if comp_match else 'the issuer'}"
            contacts = []
            if email_match:
                contacts.append(email_match.group(0))
            if phone_match:
                contacts.append(phone_match.group(0).strip())
            if contacts:
                lead += f", including contact details ({', '.join(contacts)})."
            else:
                lead += "."
            bullet_points.append(lead)

        if order_match or date_match:
            ord_str = f"Order ID is {order_match.group(1)}" if order_match else "Document"
            dt_str = f", with the order date and time recorded as {date_match.group(1).strip()}" if date_match else ""
            bullet_points.append(f"{ord_str}{dt_str}.")

        if cust_match or total_match:
            cust_str = f" for customer {cust_match.group(1).strip()}" if cust_match else ""
            tot_str = f"Total amount recorded is {total_match.group(1).strip()}" if total_match else "Order processed"
            bullet_points.append(f"{tot_str}{cust_str}.")

    # Fallback to general sentences if still empty
    if not bullet_points:
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', summary if len(summary) > 60 else text) if len(s.strip()) > 15]
        for s in sentences[:4]:
            bullet_points.append(s)

    if not bullet_points:
        bullet_points = [
            f"The document '{filename}' has been analyzed and indexed.",
            "All content is available for instant interactive document Q&A."
        ]

    return title, bullet_points


def _extract_text_from_bytes(file_bytes: bytes, filename: str, mime_type: str = "") -> str:
    """Extract text from file bytes using PDF text extraction, OCR, or text decoding."""
    text = ""
    safe_name = filename.lower()
    is_pdf = file_bytes.startswith(b"%PDF") or "pdf" in (mime_type or "").lower() or safe_name.endswith(".pdf")
    is_img = "image" in (mime_type or "").lower() or any(safe_name.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"])

    if is_pdf:
        try:
            text = PDFService.pdf_to_text(file_bytes)
        except Exception:
            text = ""
        if not text.strip():
            try:
                ocr_result = OCRService.ocr_pdf(file_bytes)
                text = ocr_result.get("text", "")
            except Exception:
                text = ""

    elif is_img:
        try:
            ocr_result = OCRService.extract_text_from_image(file_bytes)
            text = ocr_result.get("text", "")
        except Exception:
            text = ""

    # Universal fallback: If text is empty or wasn't a binary PDF/image, try UTF-8 decoding
    if not text.strip():
        try:
            decoded = file_bytes.decode("utf-8", errors="ignore")
            printable_ratio = sum(1 for c in decoded if c.isprintable() or c in "\n\r\t") / max(1, len(decoded))
            if printable_ratio > 0.70 and len(decoded.strip()) > 5:
                text = decoded
        except Exception:
            pass

    return text.strip()


@router.post("/summarize-file")
async def summarize_file(
    file: UploadFile = File(...),
    style: str = Form("detailed"),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file (PDF, TXT, image) and generate an AI summary directly."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "File is empty")

    safe_name = sanitize_filename(file.filename or "document.txt")
    detected_mime = detect_mime_type(file_bytes, safe_name)

    # Store file
    path = generate_storage_path(current_user.id, safe_name, "ai_docs")
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
        tool_type="summarize",
        category=ToolCategory.AI,
    )
    db.add(db_file)
    await db.flush()

    # Extract text from file
    text = _extract_text_from_bytes(file_bytes, safe_name, detected_mime)

    if not text.strip():
        text = f"Document: {safe_name} (Uploaded successfully. Contains minimal or non-extractable text)."

    text_chunk = text[:12000]
    summary = await ai_provider.summarize(text_chunk, style=style)

    # Format title and structured bullets
    title, bullets = _format_document_title_and_bullets(text, safe_name, summary)

    # Auto-index chunks for RAG Q&A with dense vector embeddings
    chunks = _chunk_text(text, chunk_size=500, overlap=50)
    for i, (chunk_text, page_num) in enumerate(chunks):
        emb = await ai_provider.embed(chunk_text)
        chunk = DocumentChunk(
            id=str(uuid.uuid4()),
            file_id=db_file.id,
            chunk_index=i,
            content=chunk_text,
            page_number=page_num,
            embedding_json=json.dumps(emb),
        )
        db.add(chunk)

    # Log AI request
    ai_req = AIRequest(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        file_id=db_file.id,
        request_type="summarize",
        prompt=text_chunk[:2000],
        response=summary,
    )
    db.add(ai_req)
    current_user.ai_requests_used = (current_user.ai_requests_used or 0) + 1
    await db.flush()

    return {
        "summary": summary,
        "style": style,
        "file_id": db_file.id,
        "document_id": db_file.id,
        "filename": safe_name,
        "mime_type": detected_mime,
        "download_url": f"/api/files/download/{db_file.id}",
        "document_title": title,
        "bullet_points": bullets,
        "ai_request_id": ai_req.id,
    }


@router.post("/classify")
async def classify_document(
    file_id: str,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Classify a document (Invoice, Resume, Contract, etc.)."""
    result = await db.execute(
        select(FileModel).where(FileModel.id == file_id)
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "File not found")

    file_bytes = await storage.download(f.storage_path)
    if "pdf" in (f.mime_type or ""):
        text = PDFService.pdf_to_text(file_bytes)[:5000]
    else:
        text = file_bytes.decode("utf-8", errors="replace")[:5000]

    classification = await ai_provider.classify(text)
    return classification


@router.post("/translate")
async def translate_text(
    data: TranslateRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Translate text to a target language."""
    translated = await ai_provider.translate(data.text, data.target_language, data.source_language)

    ai_req = AIRequest(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        request_type="translate",
        prompt=data.text[:2000],
        response=translated,
    )
    db.add(ai_req)
    current_user.ai_requests_used = (current_user.ai_requests_used or 0) + 1
    await db.flush()

    return {"translated_text": translated, "target_language": data.target_language}


@router.post("/index-document")
async def index_document_for_rag(
    file: Optional[UploadFile] = File(None),
    file_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """
    Index a document for Ask Your Document (RAG).
    Supports direct multipart file upload or existing file_id.
    """
    target_file_id = file_id
    text = ""

    if file:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(400, "Uploaded file is empty")

        safe_name = sanitize_filename(file.filename or "indexed_doc.pdf")
        detected_mime = detect_mime_type(file_bytes, safe_name)
        path = generate_storage_path(current_user.id, safe_name, "rag_docs")
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
            tool_type="ask_document",
            category=ToolCategory.AI,
        )
        db.add(db_file)
        await db.flush()
        target_file_id = db_file.id

        text = _extract_text_from_bytes(file_bytes, safe_name, detected_mime)

    elif file_id:
        result = await db.execute(
            select(FileModel).where(FileModel.id == file_id)
        )
        f = result.scalar_one_or_none()
        if not f:
            raise HTTPException(404, "File not found")

        # Check if already indexed
        existing = await db.execute(
            select(DocumentChunk).where(DocumentChunk.file_id == file_id).limit(1)
        )
        if existing.scalar_one_or_none():
            return {"document_id": file_id, "file_id": file_id, "message": "Document already indexed"}

        file_bytes = await storage.download(f.storage_path)
        text = _extract_text_from_bytes(file_bytes, f.original_filename or "document", f.mime_type or "")
    else:
        raise HTTPException(400, "Either file or file_id must be provided")

    if not text.strip():
        text = "Empty document content."

    # Chunk text and compute dense vector embeddings
    chunks = _chunk_text(text, chunk_size=500, overlap=50)

    for i, (chunk_text, page_num) in enumerate(chunks):
        emb = await ai_provider.embed(chunk_text)
        chunk = DocumentChunk(
            id=str(uuid.uuid4()),
            file_id=target_file_id,
            chunk_index=i,
            content=chunk_text,
            page_number=page_num,
            embedding_json=json.dumps(emb),
        )
        db.add(chunk)

    await db.flush()
    return {
        "document_id": target_file_id,
        "file_id": target_file_id,
        "message": "Document indexed successfully",
        "chunks_created": len(chunks),
    }


async def retrieve_top_chunks(chunks: List[DocumentChunk], question: str, top_k: int = 6) -> List[DocumentChunk]:
    """
    Hybrid RAG retrieval combining dense vector similarity with lexical BM25/keyword scoring.
    Compatible with SQLite and PostgreSQL.
    """
    if len(chunks) <= top_k:
        return list(chunks)

    import re
    import math

    stop_words = {
        "what", "when", "where", "which", "how", "does", "have", "this", "that", "tell", "show",
        "give", "with", "from", "about", "could", "would", "should", "there", "their", "they"
    }
    q_words = [w for w in re.findall(r'\w{3,}', question.lower()) if w not in stop_words]
    tokens = [w for w in re.findall(r'\w+', question.lower()) if len(w) > 2]
    q_bigrams = [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)]

    # Compute dense query vector
    try:
        q_emb = await ai_provider.embed(question)
    except Exception:
        q_emb = []

    scored_chunks = []
    raw_lexical_scores = []
    vector_scores = []

    for c in chunks:
        c_low = c.content.lower()
        lex_score = 0.0

        # 1. Term frequency scoring with saturation
        for w in q_words:
            cnt = c_low.count(w)
            if cnt > 0:
                lex_score += 1.0 + math.log(cnt)

        # 2. Bigram / phrase matching bonus
        for bg in q_bigrams:
            if bg in c_low:
                lex_score += 3.5

        # 3. Key structured section indicators
        if any(k in c_low for k in ["total", "amount", "invoice", "receipt", "order", "date", "customer", "bill to", "tax"]):
            lex_score += 1.5

        # 4. Proximity / Density boost
        matched_unique_words = sum(1 for w in q_words if w in c_low)
        if len(q_words) > 0 and (matched_unique_words / len(q_words)) >= 0.5:
            lex_score += 2.0 * matched_unique_words

        # Vector cosine similarity
        v_score = 0.0
        if q_emb and c.embedding_json:
            try:
                c_emb = json.loads(c.embedding_json)
                v_score = max(0.0, cosine_similarity(q_emb, c_emb))
            except Exception:
                v_score = 0.0
        elif q_emb:
            try:
                c_emb = compute_dense_embedding(c.content)
                v_score = max(0.0, cosine_similarity(q_emb, c_emb))
            except Exception:
                v_score = 0.0

        raw_lexical_scores.append(lex_score)
        vector_scores.append(v_score)

    max_lex = max(raw_lexical_scores) if raw_lexical_scores else 1.0
    min_lex = min(raw_lexical_scores) if raw_lexical_scores else 0.0
    lex_range = max_lex - min_lex if max_lex > min_lex else 1.0

    for idx, c in enumerate(chunks):
        norm_lex = (raw_lexical_scores[idx] - min_lex) / lex_range if max_lex > min_lex else (1.0 if raw_lexical_scores[idx] > 0 else 0.0)
        norm_vec = vector_scores[idx]

        # Hybrid fusion: 50% dense semantic similarity + 50% lexical precision
        hybrid_score = (0.5 * norm_lex) + (0.5 * norm_vec)
        scored_chunks.append((hybrid_score, c))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top = [c for _, c in scored_chunks[:top_k]]
    return top if top else list(chunks[:top_k])


@router.post("/ask-document")
async def ask_document(
    data: AskDocumentRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Ask a question about an indexed document (Hybrid Dense Vector + Lexical RAG)."""
    target_id = data.document_id or data.file_id
    if not target_id:
        raise HTTPException(400, "document_id or file_id required")

    # Fetch chunks for this document
    chunks_result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.file_id == target_id).order_by(DocumentChunk.chunk_index)
    )
    chunks = chunks_result.scalars().all()

    # If no chunks exist yet, check if file exists and auto-index
    if not chunks:
        file_result = await db.execute(
            select(FileModel).where(FileModel.id == target_id)
        )
        f = file_result.scalar_one_or_none()
        if f:
            file_bytes = await storage.download(f.storage_path)
            text = _extract_text_from_bytes(file_bytes, f.original_filename or "document", f.mime_type or "")

            if not text.strip():
                text = f"Document: {f.original_filename}"
            new_chunks = _chunk_text(text, chunk_size=500, overlap=50)
            for i, (chunk_text, page_num) in enumerate(new_chunks):
                emb = await ai_provider.embed(chunk_text)
                chunk = DocumentChunk(
                    id=str(uuid.uuid4()),
                    file_id=target_id,
                    chunk_index=i,
                    content=chunk_text,
                    page_number=page_num,
                    embedding_json=json.dumps(emb),
                )
                db.add(chunk)
            await db.flush()
            chunks_result = await db.execute(
                select(DocumentChunk).where(DocumentChunk.file_id == target_id).order_by(DocumentChunk.chunk_index)
            )
            chunks = chunks_result.scalars().all()

    if not chunks:
        return {
            "answer": "I could not find information in this document.",
            "sources": [],
            "question": data.question,
        }

    top_chunks = await retrieve_top_chunks(chunks, data.question, top_k=6)
    context_texts = [c.content for c in top_chunks]
    page_refs = sorted(list(set(c.page_number for c in top_chunks if c.page_number)))

    answer = await ai_provider.answer_question(data.question, context_texts)

    # Log request
    ai_req = AIRequest(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        file_id=target_id,
        request_type="ask_document",
        prompt=data.question,
        response=answer,
    )
    db.add(ai_req)
    current_user.ai_requests_used = (current_user.ai_requests_used or 0) + 1
    await db.flush()

    return {
        "answer": answer,
        "sources": [{"page": p} for p in page_refs],
        "question": data.question,
    }


@router.post("/ask-document/stream")
async def ask_document_stream(
    data: AskDocumentRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """
    Real-time Server-Sent Events (SSE) streaming endpoint for Ask Document (Hybrid RAG).
    Streams answer tokens as they are generated.
    """
    target_id = data.document_id or data.file_id
    if not target_id:
        raise HTTPException(400, "document_id or file_id required")

    chunks_result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.file_id == target_id).order_by(DocumentChunk.chunk_index)
    )
    chunks = chunks_result.scalars().all()

    if not chunks:
        file_result = await db.execute(
            select(FileModel).where(FileModel.id == target_id)
        )
        f = file_result.scalar_one_or_none()
        if f:
            file_bytes = await storage.download(f.storage_path)
            text = _extract_text_from_bytes(file_bytes, f.original_filename or "document", f.mime_type or "")
            if not text.strip():
                text = f"Document: {f.original_filename}"
            new_chunks = _chunk_text(text, chunk_size=500, overlap=50)
            for i, (chunk_text, page_num) in enumerate(new_chunks):
                emb = await ai_provider.embed(chunk_text)
                chunk = DocumentChunk(
                    id=str(uuid.uuid4()),
                    file_id=target_id,
                    chunk_index=i,
                    content=chunk_text,
                    page_number=page_num,
                    embedding_json=json.dumps(emb),
                )
                db.add(chunk)
            await db.flush()
            chunks_result = await db.execute(
                select(DocumentChunk).where(DocumentChunk.file_id == target_id).order_by(DocumentChunk.chunk_index)
            )
            chunks = chunks_result.scalars().all()

    if not chunks:
        async def empty_generator():
            yield f"data: {json.dumps({'token': 'I could not find information in this document.'})}\n\n"
            yield f"data: {json.dumps({'done': True, 'sources': [], 'question': data.question})}\n\n"
        return StreamingResponse(empty_generator(), media_type="text/event-stream")

    top_chunks = await retrieve_top_chunks(chunks, data.question, top_k=6)
    context_texts = [c.content for c in top_chunks]
    page_refs = sorted(list(set(c.page_number for c in top_chunks if c.page_number)))
    sources = [{"page": p} for p in page_refs]

    user_id = current_user.id

    async def event_generator():
        collected_tokens = []
        try:
            async for token in ai_provider.answer_question_stream(data.question, context_texts):
                collected_tokens.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

            yield f"data: {json.dumps({'done': True, 'sources': sources, 'question': data.question})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # Log AI request asynchronously after stream finishes
        try:
            full_response = "".join(collected_tokens)
            async with AsyncSessionLocal() as session:
                ai_req = AIRequest(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    file_id=target_id,
                    request_type="ask_document_stream",
                    prompt=data.question,
                    response=full_response,
                )
                session.add(ai_req)
                u_res = await session.execute(select(User).where(User.id == user_id))
                u = u_res.scalar_one_or_none()
                if u:
                    u.ai_requests_used = (u.ai_requests_used or 0) + 1
                await session.commit()
        except Exception:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/extract-invoice")
async def extract_invoice_route(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Route for AI Invoice Extractor."""
    from app.api.invoice import analyze_invoice
    return await analyze_invoice(file=file, current_user=current_user, db=db)


RESUME_SCHEMA = {
    "candidate_name": "Full Name",
    "email": "email address",
    "phone": "phone number",
    "summary": "Professional summary in 2-3 sentences",
    "skills": ["Skill 1", "Skill 2"],
    "experience": [
        {"role": "Title", "company": "Company Name", "duration": "Years or Dates", "highlights": "Key achievements"}
    ],
    "education": [
        {"degree": "Degree", "institution": "University/School", "year": "Graduation Year"}
    ],
    "strengths": ["Key strength 1", "Key strength 2"]
}


@router.post("/analyze-resume")
async def analyze_resume_route(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """Route for AI Resume Analyzer."""
    file_bytes = await file.read()
    filename = (file.filename or "").lower()
    text = ""
    if filename.endswith(".pdf"):
        text = PDFService.pdf_to_text(file_bytes)
    elif filename.endswith(".docx"):
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        text = "\n".join([p.text for p in doc.paragraphs if p.text])
    else:
        text = file_bytes.decode("utf-8", errors="ignore")

    if not text.strip():
        raise HTTPException(400, "Could not extract text from the uploaded file.")

    extracted = await ai_provider.extract(text, "resume", RESUME_SCHEMA)
    return {
        "extracted": extracted,
        "filename": file.filename,
    }


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[tuple]:
    """Split text into overlapping chunks. Returns list of (chunk_text, page_number)."""
    chunks = []
    words = text.split()
    i = 0
    page_num = 1
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunk = " ".join(chunk_words)
        # Try to extract page number from chunk
        if "--- Page" in chunk:
            try:
                page_num = int(chunk.split("--- Page")[1].split("---")[0].strip())
            except Exception:
                pass
        chunks.append((chunk, page_num))
        i += chunk_size - overlap
    return chunks
