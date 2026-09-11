"""
DocuFlow AI — Core Database Models
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from app.database import Base


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class SubscriptionPlan(str, Enum):
    FREE = "free"
    STUDENT = "student"
    PRO = "pro"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class FileStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DELETED = "deleted"


class ToolCategory(str, Enum):
    PDF = "pdf"
    DOCUMENT = "document"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    AI = "ai"
    OCR = "ocr"
    SOCIAL = "social"


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    role = Column(String(50), default=UserRole.USER.value, nullable=False)
    plan = Column(String(50), default=SubscriptionPlan.FREE.value, nullable=False)
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    storage_used_bytes = Column(Integer, default=0)
    ai_requests_used = Column(Integer, default=0)
    conversions_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    last_login_at = Column(DateTime, nullable=True)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(Text, nullable=False, index=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    expires_at = Column(DateTime, nullable=False)


class File(Base):
    __tablename__ = "files"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    storage_path = Column(Text, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_extension = Column(String(20), nullable=False)
    status = Column(String(50), default=FileStatus.COMPLETED.value, nullable=False)
    tool_type = Column(String(50), nullable=True)
    category = Column(String(50), nullable=True)
    is_output = Column(Boolean, default=False)
    parent_file_id = Column(String(36), ForeignKey("files.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_type = Column(String(50), nullable=False)
    category = Column(String(50), nullable=True)
    status = Column(String(50), default=JobStatus.PENDING.value, nullable=False)
    progress = Column(Integer, default=0)
    input_file_id = Column(String(36), nullable=True)
    output_file_id = Column(String(36), nullable=True)
    options = Column(Text, nullable=True)
    result = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    completed_at = Column(DateTime, nullable=True)


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, index=True)
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class AIRequest(Base):
    __tablename__ = "ai_requests"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    request_type = Column(String(50), nullable=False)
    prompt = Column(Text, nullable=True)
    response = Column(Text, nullable=True)
    file_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class InvoiceResult(Base):
    __tablename__ = "invoice_results"

    id = Column(String(36), primary_key=True, index=True)
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_name = Column(String(255), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    total_amount = Column(Text, nullable=True)
    invoice_date = Column(String(50), nullable=True)
    raw_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class ToolUsage(Base):
    __tablename__ = "tool_usages"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_type = Column(String(50), nullable=False)
    category = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(String(36), primary_key=True, index=True)
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    extracted_text = Column(Text, nullable=True)
    language = Column(String(20), default="en")
    confidence = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


ProcessingJob = Job


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(String(100), unique=True, nullable=False, index=True)
    transaction_id = Column(String(100), unique=True, nullable=False, index=True)
    plan = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    payment_method = Column(String(50), nullable=False)  # upi, card, netbanking, wallet
    payment_status = Column(String(50), default="success", nullable=False)
    billing_name = Column(String(255), nullable=True)
    billing_email = Column(String(255), nullable=True)
    tax_amount = Column(Float, default=0.0)
    bank_ref = Column(String(100), nullable=True)
    receipt_url = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
