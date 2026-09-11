"""
DocuFlow AI — Storage Service Abstraction
Supports: LocalStorageService (dev) | S3StorageService (prod)
"""
import os
import uuid
import hmac
import hashlib
import time
import aiofiles
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    boto3 = None
    ClientError = Exception

from app.config import settings


def generate_signed_download_token(file_path: str, expires_in: int = 3600) -> str:
    """Generate a tamper-proof HMAC-SHA256 signature for temporary file access."""
    expiry = int(time.time()) + expires_in
    message = f"{file_path}:{expiry}".encode("utf-8")
    sig = hmac.new(settings.app_secret_key.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return f"{expiry}:{sig}"


def verify_signed_download_token(file_path: str, token: str) -> bool:
    """Verify HMAC token validity and ensure it has not expired."""
    try:
        parts = token.split(":")
        if len(parts) != 2:
            return False
        expiry_str, received_sig = parts
        expiry = int(expiry_str)
        if time.time() > expiry:
            return False
        message = f"{file_path}:{expiry}".encode("utf-8")
        expected_sig = hmac.new(settings.app_secret_key.encode("utf-8"), message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(received_sig, expected_sig)
    except Exception:
        return False


class StorageProvider(ABC):
    """Abstract base class for file storage providers."""

    @abstractmethod
    async def upload(self, file_bytes: bytes, path: str, content_type: str = "application/octet-stream") -> str:
        """Upload file bytes to storage. Returns stored path."""

    @abstractmethod
    def upload_sync(self, file_bytes: bytes, path: str, content_type: str = "application/octet-stream") -> str:
        """Synchronously upload file bytes to storage (for Celery workers)."""

    @abstractmethod
    async def download(self, path: str) -> bytes:
        """Download file bytes from storage."""

    @abstractmethod
    def download_sync(self, path: str) -> bytes:
        """Synchronously download file bytes from storage (for Celery workers)."""

    @abstractmethod
    async def delete(self, path: str) -> bool:
        """Delete a file. Returns True on success."""

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """Check if a file exists."""

    @abstractmethod
    def get_url(self, path: str, filename: Optional[str] = None) -> str:
        """Get a URL/path for accessing the file."""


class LocalStorageService(StorageProvider):
    """Local filesystem storage for development."""

    def __init__(self, base_path: str = "./uploads"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _full_path(self, path: str) -> Path:
        # Prevent path traversal
        raw_str = str(path).replace("\\", "/")
        parts = Path(raw_str).parts
        if Path(raw_str).is_absolute() or raw_str.startswith("/") or ".." in parts:
            raise ValueError("Path traversal detected")
        full = (self.base_path / path).resolve()
        base_resolved = self.base_path.resolve()
        try:
            if os.path.commonpath([str(full), str(base_resolved)]) != str(base_resolved):
                raise ValueError("Path traversal detected")
        except ValueError:
            raise ValueError("Path traversal detected")
        return full

    async def upload(self, file_bytes: bytes, path: str, content_type: str = "application/octet-stream") -> str:
        full = self._full_path(path)
        full.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(full, "wb") as f:
            await f.write(file_bytes)
        return str(path)

    def upload_sync(self, file_bytes: bytes, path: str, content_type: str = "application/octet-stream") -> str:
        full = self._full_path(path)
        full.parent.mkdir(parents=True, exist_ok=True)
        with open(full, "wb") as f:
            f.write(file_bytes)
        return str(path)

    async def download(self, path: str) -> bytes:
        full = self._full_path(path)
        if not full.exists():
            raise FileNotFoundError(f"File not found: {path}")
        async with aiofiles.open(full, "rb") as f:
            return await f.read()

    def download_sync(self, path: str) -> bytes:
        full = self._full_path(path)
        if not full.exists():
            raise FileNotFoundError(f"File not found: {path}")
        with open(full, "rb") as f:
            return f.read()

    async def delete(self, path: str) -> bool:
        try:
            full = self._full_path(path)
            if full.exists():
                full.unlink()
            return True
        except Exception:
            return False

    async def exists(self, path: str) -> bool:
        try:
            return self._full_path(path).exists()
        except Exception:
            return False

    def get_url(self, path: str, filename: Optional[str] = None) -> str:
        from urllib.parse import quote
        token = generate_signed_download_token(path)
        target_name = filename
        if not target_name:
            base_name = Path(path).name
            if "." in base_name:
                target_name = base_name
        if target_name:
            safe_name = quote(target_name, safe='')
            return f"/api/files/download/{path}/{safe_name}?token={token}"
        return f"/api/files/download/{path}?token={token}"


class S3StorageService(StorageProvider):
    """AWS S3 / S3-compatible storage for production."""

    def __init__(self):
        self.client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        self.bucket = settings.aws_s3_bucket

    async def upload(self, file_bytes: bytes, path: str, content_type: str = "application/octet-stream") -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=path,
            Body=file_bytes,
            ContentType=content_type,
        )
        return path

    def upload_sync(self, file_bytes: bytes, path: str, content_type: str = "application/octet-stream") -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=path,
            Body=file_bytes,
            ContentType=content_type,
        )
        return path

    async def download(self, path: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=path)
        return response["Body"].read()

    def download_sync(self, path: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=path)
        return response["Body"].read()

    async def delete(self, path: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=path)
            return True
        except ClientError:
            return False

    async def exists(self, path: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=path)
            return True
        except ClientError:
            return False

    def get_url(self, path: str, filename: Optional[str] = None) -> str:
        if settings.storage_cdn_url:
            return f"{settings.storage_cdn_url}/{path}"
        params = {"Bucket": self.bucket, "Key": path}
        if filename:
            import re
            from urllib.parse import quote
            safe_ascii_name = re.sub(r'[\r\n",;/\\]', '_', filename).encode('ascii', 'ignore').decode('ascii').strip() or "download"
            encoded_name = quote(filename, safe='')
            params["ResponseContentDisposition"] = f'attachment; filename="{safe_ascii_name}"; filename*=UTF-8\'\'{encoded_name}'
        return self.client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=3600,
        )


def get_storage_service() -> StorageProvider:
    """Factory: returns configured storage provider."""
    provider = settings.storage_provider.lower()
    if provider == "s3":
        return S3StorageService()
    return LocalStorageService(settings.storage_local_path)


# Singleton storage instance
storage = get_storage_service()


def generate_storage_path(user_id: str, filename: str, subfolder: str = "uploads") -> str:
    """Generate a unique storage path for a file."""
    ext = Path(filename).suffix.lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return f"{subfolder}/{user_id}/{unique_name}"
