"""
DocuFlow AI — Social Media Download Model
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, DateTime, Text
from app.database import Base


class DownloadStatus(str, Enum):
    PENDING = "PENDING"
    ANALYZING = "ANALYZING"
    AVAILABLE = "AVAILABLE"
    DOWNLOADING = "DOWNLOADING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    UNAVAILABLE = "UNAVAILABLE"


class SocialMediaDownload(Base):
    __tablename__ = "social_media_downloads"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    platform = Column(String(50), nullable=False, default="instagram")
    source_url = Column(Text, nullable=False)
    media_type = Column(String(50), nullable=False, default="video")
    status = Column(String(50), nullable=False, default=DownloadStatus.PENDING.value)
    file_size = Column(Integer, nullable=True, default=0)
    filename = Column(String(255), nullable=True)
    storage_path = Column(Text, nullable=True)
    title = Column(Text, nullable=True)
    author = Column(String(100), nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    expires_at = Column(DateTime, nullable=True)
