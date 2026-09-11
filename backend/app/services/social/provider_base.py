"""
DocuFlow AI — Social Media Provider Interface
Abstract base class defining contract for platform providers.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Tuple


@dataclass
class MediaOption:
    id: str
    label: str
    format: str
    quality: str
    media_type: str  # "image" | "video" | "audio"
    download_url: Optional[str] = None
    file_size_approx: Optional[int] = None
    downloadable: bool = True


@dataclass
class SocialMediaMetadata:
    id: str
    platform: str
    source_url: str
    media_type: str
    title: Optional[str] = None
    author: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_public: bool = True
    is_private: bool = False
    options: List[MediaOption] = field(default_factory=list)
    raw_info: Optional[dict] = None
    video_preview_url: Optional[str] = None
    duration: Optional[int] = None


class SocialMediaProvider(ABC):
    """
    Abstract Base Class for Social Media Providers.
    Allows additional platforms to be plugged in cleanly.
    """

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Returns provider platform name (e.g., 'instagram')."""
        pass

    @abstractmethod
    def validate_url(self, url: str) -> Tuple[bool, Optional[str]]:
        """
        Validate if the URL is supported by this provider and syntactically valid.
        Returns (is_valid, error_or_info_message).
        """
        pass

    @abstractmethod
    async def get_metadata(self, url: str) -> SocialMediaMetadata:
        """
        Fetch public metadata, thumbnail, and accessibility for the provided URL.
        Must check permission & safety rules.
        """
        pass

    @abstractmethod
    async def get_media_options(self, url: str) -> List[MediaOption]:
        """
        Return available media resolution/format options for permitted download.
        """
        pass

    @abstractmethod
    async def download_permitted_media(
        self, url: str, option_id: str
    ) -> Tuple[bytes, str, str]:
        """
        Download user-selected option of permitted public media.
        Returns tuple of (content_bytes, filename, mime_type).
        """
        pass
