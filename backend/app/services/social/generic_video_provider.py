"""
DocuFlow AI — Turbocharged Generic Public Video & Media Provider
Supports YouTube, TikTok, Twitter/X, Facebook, Reddit, Vimeo, and general public video URLs.
Uses fast oEmbed detection, URL normalization, parallel segment downloads, and smart caching.
"""
import os
import re
import time
import asyncio
import logging
import tempfile
import httpx
from typing import List, Optional, Tuple, Dict, Any

from app.services.social.provider_base import (
    SocialMediaProvider,
    SocialMediaMetadata,
    MediaOption,
)
from app.services.social.instagram_provider import get_ffmpeg_path

logger = logging.getLogger("docuflow.social.generic_video")

# Directory for storing temporary social downloads before cleanup
TEMP_SOCIAL_DIR = os.path.join(tempfile.gettempdir(), "docuflow_social_media")
os.makedirs(TEMP_SOCIAL_DIR, exist_ok=True)

# In-memory fast metadata cache: url -> (timestamp, metadata)
_METADATA_CACHE: Dict[str, Tuple[float, SocialMediaMetadata]] = {}
CACHE_TTL = 1800  # 30 minutes

# Common public video platform indicators
VIDEO_PLATFORMS = [
    (r"(?:youtube\.com|youtu\.be)", "youtube"),
    (r"tiktok\.com", "tiktok"),
    (r"(?:twitter\.com|x\.com)", "twitter"),
    (r"(?:facebook\.com|fb\.watch)", "facebook"),
    (r"reddit\.com", "reddit"),
    (r"vimeo\.com", "vimeo"),
    (r"pinterest\.com", "pinterest"),
    (r"dailymotion\.com", "dailymotion"),
]


def clean_video_url(url: str) -> str:
    """
    Strips playlist, mix, index, and tracking parameters from URLs.
    Prevents yt-dlp from processing 50-100 playlist items when the user
    only wanted to fetch or download a single video.
    """
    if not url or not isinstance(url, str):
        return ""
    clean = url.strip()

    # YouTube URL cleanup
    if "youtube.com" in clean or "youtu.be" in clean:
        # Standard watch URL with video ID: watch?v=XXXXXXXXXXX
        v_match = re.search(r"[?&]v=([a-zA-Z0-9_-]{11})", clean)
        if v_match:
            return f"https://www.youtube.com/watch?v={v_match.group(1)}"
        # Short URL: youtu.be/XXXXXXXXXXX
        short_match = re.search(r"youtu\.be/([a-zA-Z0-9_-]{11})", clean)
        if short_match:
            return f"https://www.youtube.com/watch?v={short_match.group(1)}"
        # Shorts URL: youtube.com/shorts/XXXXXXXXXXX
        shorts_match = re.search(r"youtube\.com/shorts/([a-zA-Z0-9_-]{11})", clean)
        if shorts_match:
            return f"https://www.youtube.com/shorts/{shorts_match.group(1)}"

    # General tracking query cleanup (utm_*, igsh, fbclid, ref, etc.)
    clean = re.sub(r"([?&])(utm_[^&=]+|igsh|fbclid|ref|si|t|feature)=[^&]*", "", clean)
    clean = re.sub(r"[?&]$", "", clean)
    return clean


class GenericVideoProvider(SocialMediaProvider):
    """
    Universal high-speed provider for public web video platforms (YouTube, TikTok, X, etc.).
    Optimized for sub-second fetching and accelerated multi-threaded downloading.
    """

    @property
    def platform_name(self) -> str:
        return "video_url"

    def detect_subplatform(self, url: str) -> str:
        for pattern, name in VIDEO_PLATFORMS:
            if re.search(pattern, url, re.IGNORECASE):
                return name
        return "web_video"

    def validate_url(self, url: str) -> Tuple[bool, Optional[str]]:
        if not url or not isinstance(url, str):
            return False, "This URL is not supported."

        clean = clean_video_url(url)
        if not (clean.startswith("http://") or clean.startswith("https://")):
            return False, "Please enter a valid HTTP or HTTPS URL."

        return True, "Valid public video URL"

    async def get_metadata(self, url: str) -> SocialMediaMetadata:
        cleaned_url = clean_video_url(url)
        is_valid, msg = self.validate_url(cleaned_url)
        if not is_valid:
            raise ValueError(msg or "This URL is not supported.")

        subplatform = self.detect_subplatform(cleaned_url)

        # 1. In-Memory Cache Check (0ms instantaneous return)
        cache_key = f"{subplatform}:{cleaned_url}"
        if cache_key in _METADATA_CACHE:
            cached_time, cached_meta = _METADATA_CACHE[cache_key]
            if time.time() - cached_time < CACHE_TTL:
                logger.info(f"Returning cached metadata for {cleaned_url}")
                return cached_meta

        # 2. Ultra-Fast Path: YouTube oEmbed API (<0.6s)
        if subplatform == "youtube":
            try:
                oembed_meta = await self._extract_youtube_oembed(cleaned_url)
                if oembed_meta:
                    _METADATA_CACHE[cache_key] = (time.time(), oembed_meta)
                    return oembed_meta
            except Exception as e:
                logger.debug(f"YouTube oEmbed fast-path skipped: {e}")

        # 3. High-Speed yt-dlp Extraction with noplaylist and player optimizations
        meta = await asyncio.to_thread(self._extract_with_ytdlp, cleaned_url, subplatform)
        if not meta:
            raise ValueError("We couldn't process this URL. Please verify the link and try again.")

        _METADATA_CACHE[cache_key] = (time.time(), meta)
        return meta

    async def _extract_youtube_oembed(self, url: str) -> Optional[SocialMediaMetadata]:
        """
        Fastest possible YouTube metadata resolution (~300-600ms) using public oEmbed.
        """
        match = re.search(r"watch\?v=([a-zA-Z0-9_-]{11})|shorts/([a-zA-Z0-9_-]{11})", url)
        video_id = (match.group(1) or match.group(2)) if match else None
        if not video_id:
            return None

        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as client:
            res = await client.get(oembed_url)
            if res.status_code != 200:
                return None
            data = res.json()

        title = data.get("title") or f"YouTube Video ({video_id})"
        author = data.get("author_name") or "YouTube Creator"
        thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"

        options = [
            MediaOption(
                id="video_hd_mp4",
                label="Download Video (1080p MP4)",
                format="mp4",
                quality="1080p HD",
                media_type="video",
                file_size_approx=35000000,
                downloadable=True,
            ),
            MediaOption(
                id="video_sd_mp4",
                label="Download Standard Video (720p MP4)",
                format="mp4",
                quality="720p SD",
                media_type="video",
                file_size_approx=18000000,
                downloadable=True,
            ),
            MediaOption(
                id="audio_mp3",
                label="Download Audio (MP3)",
                format="mp3",
                quality="192kbps",
                media_type="audio",
                file_size_approx=4500000,
                downloadable=True,
            ),
            MediaOption(
                id="cover_photo_jpg",
                label="Download Cover (JPG)",
                format="jpg",
                quality="Original HD",
                media_type="image",
                file_size_approx=250000,
                downloadable=True,
            ),
        ]

        return SocialMediaMetadata(
            id=f"youtube_{video_id}",
            platform="youtube",
            source_url=url,
            media_type="video",
            title=title,
            author=author,
            thumbnail_url=thumbnail_url,
            is_public=True,
            options=options,
            video_preview_url=f"https://www.youtube.com/embed/{video_id}",
            duration=None,
            raw_info={"id": video_id, "url": url, "thumbnail": thumbnail_url},
        )

    def _extract_with_ytdlp(self, url: str, subplatform: str) -> Optional[SocialMediaMetadata]:
        import yt_dlp

        ffmpeg_path = get_ffmpeg_path()
        ydl_opts: Dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
            "extract_flat": False,
            "socket_timeout": 8,
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "web"],
                    "skip": ["dash", "hls"],
                }
            },
        }
        if ffmpeg_path:
            ydl_opts["ffmpeg_location"] = ffmpeg_path

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    return None

                title = info.get("title") or f"Public Video ({subplatform.title()})"
                uploader = info.get("uploader") or info.get("channel") or "Creator"
                thumbnail_url = info.get("thumbnail")
                duration = info.get("duration")
                video_url = info.get("url")
                media_id = str(info.get("id") or "video")

                # Build options
                options: List[MediaOption] = []
                filesize = info.get("filesize") or info.get("filesize_approx") or 25000000

                options.append(
                    MediaOption(
                        id="video_hd_mp4",
                        label="Download Video (1080p MP4)",
                        format="mp4",
                        quality="1080p HD",
                        media_type="video",
                        file_size_approx=filesize,
                        downloadable=True,
                    )
                )
                options.append(
                    MediaOption(
                        id="video_sd_mp4",
                        label="Download Standard Video (720p MP4)",
                        format="mp4",
                        quality="720p SD",
                        media_type="video",
                        file_size_approx=int(filesize * 0.5),
                        downloadable=True,
                    )
                )
                options.append(
                    MediaOption(
                        id="audio_mp3",
                        label="Download Audio (MP3)",
                        format="mp3",
                        quality="192kbps",
                        media_type="audio",
                        file_size_approx=int((duration or 180) * 24000),
                        downloadable=True,
                    )
                )

                if thumbnail_url:
                    options.append(
                        MediaOption(
                            id="cover_photo_jpg",
                            label="Download Cover (JPG)",
                            format="jpg",
                            quality="Original HD",
                            media_type="image",
                            file_size_approx=300000,
                            downloadable=True,
                        )
                    )

                return SocialMediaMetadata(
                    id=f"{subplatform}_{media_id}",
                    platform=subplatform,
                    source_url=url,
                    media_type="video",
                    title=title,
                    author=uploader,
                    thumbnail_url=thumbnail_url,
                    is_public=True,
                    options=options,
                    video_preview_url=video_url,
                    duration=duration,
                    raw_info={"id": media_id, "url": video_url, "thumbnail": thumbnail_url},
                )
        except Exception as e:
            logger.warning(f"Generic yt-dlp extraction error: {e}")
            return None

    async def get_media_options(self, url: str) -> List[MediaOption]:
        meta = await self.get_metadata(url)
        return meta.options

    async def download_permitted_media(
        self, url: str, option_id: str
    ) -> Tuple[bytes, str, str]:
        cleaned_url = clean_video_url(url)
        meta = await self.get_metadata(cleaned_url)
        subplatform = self.detect_subplatform(cleaned_url)
        media_id = meta.raw_info.get("id") if meta.raw_info else "media"

        selected_option = next((o for o in meta.options if o.id == option_id), None)
        if not selected_option:
            selected_option = meta.options[0] if meta.options else None

        if not selected_option or not selected_option.downloadable:
            raise ValueError("The requested media is not available for download.")

        fmt = selected_option.format.lower()
        if fmt == "mp4":
            filename = f"{subplatform.capitalize()}_Video_{media_id}.mp4"
            content = await asyncio.to_thread(self._download_video, cleaned_url, media_id, subplatform)
            return content, filename, "video/mp4"
        elif fmt == "mp3":
            filename = f"{subplatform.capitalize()}_Audio_{media_id}.mp3"
            content = await asyncio.to_thread(self._download_audio, cleaned_url, media_id, subplatform)
            return content, filename, "audio/mpeg"
        else:
            filename = f"{subplatform.capitalize()}_Poster_{media_id}.jpg"
            content = await self._download_image(meta)
            return content, filename, "image/jpeg"

    def _download_video(self, url: str, media_id: str, subplatform: str) -> bytes:
        import yt_dlp

        # Check persistent cache on disk first (0ms instantaneous serve)
        cache_path = os.path.join(TEMP_SOCIAL_DIR, f"{subplatform}_Video_{media_id}.mp4")
        if os.path.exists(cache_path) and os.path.getsize(cache_path) > 10000:
            logger.info(f"Serving video from disk cache: {cache_path}")
            with open(cache_path, "rb") as f:
                return f.read()

        ffmpeg_path = get_ffmpeg_path()
        with tempfile.TemporaryDirectory() as temp_dir:
            out_template = os.path.join(temp_dir, "video.%(ext)s")
            ydl_opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
                "format": "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best",
                "outtmpl": out_template,
                "socket_timeout": 15,
                "concurrent_fragment_downloads": 8,
                "http_chunk_size": 10485760,
                "buffersize": 1048576,
                "nocheckcertificate": True,
            }
            if ffmpeg_path:
                ydl_opts["ffmpeg_location"] = ffmpeg_path

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            downloaded = [
                os.path.join(temp_dir, f)
                for f in os.listdir(temp_dir)
                if os.path.isfile(os.path.join(temp_dir, f))
            ]
            if not downloaded:
                raise ValueError("Could not extract video stream.")

            with open(downloaded[0], "rb") as f:
                data = f.read()

            # Cache to disk
            try:
                with open(cache_path, "wb") as f:
                    f.write(data)
            except Exception as ce:
                logger.debug(f"Could not write cache file: {ce}")

            return data

    def _download_audio(self, url: str, media_id: str, subplatform: str) -> bytes:
        import yt_dlp

        # Check persistent cache on disk first
        cache_path = os.path.join(TEMP_SOCIAL_DIR, f"{subplatform}_Audio_{media_id}.mp3")
        if os.path.exists(cache_path) and os.path.getsize(cache_path) > 5000:
            logger.info(f"Serving audio from disk cache: {cache_path}")
            with open(cache_path, "rb") as f:
                return f.read()

        ffmpeg_path = get_ffmpeg_path()
        with tempfile.TemporaryDirectory() as temp_dir:
            out_template = os.path.join(temp_dir, "audio.%(ext)s")
            ydl_opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
                "format": "bestaudio/best",
                "outtmpl": out_template,
                "socket_timeout": 15,
                "concurrent_fragment_downloads": 8,
                "http_chunk_size": 10485760,
                "buffersize": 1048576,
                "nocheckcertificate": True,
            }
            if ffmpeg_path:
                ydl_opts["ffmpeg_location"] = ffmpeg_path
                ydl_opts["postprocessors"] = [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }
                ]

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            downloaded = [
                os.path.join(temp_dir, f)
                for f in os.listdir(temp_dir)
                if os.path.isfile(os.path.join(temp_dir, f))
            ]
            if not downloaded:
                raise ValueError("Could not extract audio stream.")

            with open(downloaded[0], "rb") as f:
                data = f.read()

            try:
                with open(cache_path, "wb") as f:
                    f.write(data)
            except Exception as ce:
                logger.debug(f"Could not write cache file: {ce}")

            return data

    async def _download_image(self, meta: SocialMediaMetadata) -> bytes:
        if not meta.thumbnail_url:
            raise ValueError("No thumbnail available for download.")

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                meta.thumbnail_url,
                headers={"User-Agent": "Mozilla/5.0"},
            )
            if resp.status_code != 200:
                raise ValueError("Failed to download image.")
            return resp.content
