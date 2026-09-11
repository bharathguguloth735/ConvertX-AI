"""
DocuFlow AI — Social Media Pydantic Schemas
"""
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl


class ValidateURLRequest(BaseModel):
    url: str = Field(..., description="Public social media content URL")


class ValidateURLResponse(BaseModel):
    valid: bool
    platform: str
    message: str


class AnalyzeURLRequest(BaseModel):
    url: str = Field(..., description="Public social media URL to analyze")
    platform: Optional[str] = Field(None, description="Optional platform hint")


class MediaOptionSchema(BaseModel):
    id: str
    label: str
    format: str
    quality: str
    media_type: str  # 'image' | 'video' | 'audio'
    file_size_approx: Optional[int] = None
    downloadable: bool = True


class AnalyzeURLResponse(BaseModel):
    id: str
    platform: str
    source_url: str
    media_type: str
    status: str
    title: Optional[str] = None
    author: Optional[str] = None
    thumbnail_url: Optional[str] = None
    video_preview_url: Optional[str] = None
    duration: Optional[int] = None
    is_public: bool = True
    options: List[MediaOptionSchema] = []
    message: Optional[str] = None


class DownloadMediaRequest(BaseModel):
    media_id: str = Field(..., description="ID returned by analyze step")
    option_id: str = Field(..., description="ID of chosen media option")


class DownloadMediaResponse(BaseModel):
    download_id: str
    download_url: str
    filename: str
    file_size: int
    expires_at: Optional[str] = None
    status: str
    message: Optional[str] = None


class SocialMediaHistoryItem(BaseModel):
    id: str
    platform: str
    source_url: str
    media_type: str
    status: str
    title: Optional[str] = None
    author: Optional[str] = None
    filename: Optional[str] = None
    file_size: Optional[int] = 0
    download_url: Optional[str] = None
    created_at: str
    expires_at: Optional[str] = None


class SocialMediaHistoryResponse(BaseModel):
    items: List[SocialMediaHistoryItem]
