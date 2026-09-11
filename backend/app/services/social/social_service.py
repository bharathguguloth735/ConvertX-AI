"""
DocuFlow AI — Social Media Service Registry & Storage Manager
Central service to manage providers, temporary media caching, and cleanup.
"""
import os
import glob
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple
from app.config import settings
from app.services.social.provider_base import SocialMediaProvider, SocialMediaMetadata, MediaOption
from app.services.social.instagram_provider import InstagramProvider
from app.services.social.generic_video_provider import GenericVideoProvider

logger = logging.getLogger("docuflow.social.service")

# Directory for storing temporary social downloads before cleanup
TEMP_SOCIAL_DIR = os.path.join(settings.storage_local_path, "social_temp")


class SocialMediaService:
    """
    Registry and manager for social media providers.
    Supports easy registration of new platform providers.
    """

    def __init__(self):
        self._providers: Dict[str, SocialMediaProvider] = {}
        # Register default providers
        self.register_provider(InstagramProvider())
        self.register_provider(GenericVideoProvider())

    def register_provider(self, provider: SocialMediaProvider):
        """Register a new platform provider."""
        self._providers[provider.platform_name.lower()] = provider
        logger.info(f"Registered SocialMediaProvider: {provider.platform_name}")

    def get_provider_for_url(self, url: str, platform_hint: Optional[str] = None) -> Optional[SocialMediaProvider]:
        """Find matching provider for URL with optional platform hint."""
        if not url:
            return None
        clean_url = url.strip().lower()
        if "instagram.com" in clean_url or "instagr.am" in clean_url:
            return self._providers.get("instagram")
        
        # If user explicitly selected instagram tab
        if platform_hint == "instagram":
            return self._providers.get("instagram")

        # Fallback to generic video provider for any web URL
        if clean_url.startswith("http://") or clean_url.startswith("https://"):
            return self._providers.get("video_url")

        return None

    def validate_url(self, url: str, platform_hint: Optional[str] = None) -> Tuple[bool, str, str]:
        """
        Validate URL syntax & provider support.
        Returns (is_valid, platform, message).
        """
        provider = self.get_provider_for_url(url, platform_hint)
        if not provider:
            return False, "unknown", "This URL is not supported."

        is_valid, msg = provider.validate_url(url)
        return is_valid, provider.platform_name, msg or ("Valid URL" if is_valid else "This URL is not supported.")

    async def analyze_url(self, url: str, platform_hint: Optional[str] = None) -> SocialMediaMetadata:
        """
        Analyze public URL and retrieve metadata & media options.
        """
        provider = self.get_provider_for_url(url, platform_hint)
        if not provider:
            raise ValueError("This URL is not supported.")

        return await provider.get_metadata(url)

    async def download_media(self, url: str, option_id: str, platform_hint: Optional[str] = None) -> Tuple[bytes, str, str]:
        """
        Download user-selected option of permitted public media.
        Returns (content_bytes, filename, mime_type).
        """
        provider = self.get_provider_for_url(url, platform_hint)
        if not provider:
            raise ValueError("This URL is not supported.")

        return await provider.download_permitted_media(url, option_id)

    @staticmethod
    def save_temp_file(content: bytes, filename: str) -> str:
        """
        Save temporary media file to local disk for download serving.
        """
        os.makedirs(TEMP_SOCIAL_DIR, exist_ok=True)
        file_path = os.path.join(TEMP_SOCIAL_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        return file_path

    @staticmethod
    def cleanup_expired_files(max_age_hours: int = 1):
        """
        Automatically clean up temporary social media files older than max_age_hours.
        """
        if not os.path.exists(TEMP_SOCIAL_DIR):
            return

        now = datetime.now(timezone.utc).timestamp()
        cutoff = now - (max_age_hours * 3600)
        removed_count = 0

        for filepath in glob.glob(os.path.join(TEMP_SOCIAL_DIR, "*")):
            try:
                if os.path.isfile(filepath):
                    mtime = os.path.getmtime(filepath)
                    if mtime < cutoff:
                        os.remove(filepath)
                        removed_count += 1
            except Exception as e:
                logger.warning(f"Error cleaning up temporary file {filepath}: {e}")

        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} expired temporary social media files.")


# Global singleton instance
social_service = SocialMediaService()
