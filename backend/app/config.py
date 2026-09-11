"""
DocuFlow AI — Application Configuration
Centralized settings management using Pydantic Settings.
"""
from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_env: str = "development"
    app_secret_key: str = "dev-secret-key-change-in-prod"
    app_name: str = "DocuFlow AI"
    app_version: str = "1.0.0"
    frontend_url: str = "http://localhost:5175"

    # Database
    database_url: str = "sqlite+aiosqlite:///./docuflow.db"
    sync_database_url: str = "sqlite:///./docuflow.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # JWT
    jwt_secret: str = "jwt-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30

    # Storage
    storage_provider: str = "local"
    storage_local_path: str = "./uploads"
    storage_bucket: str = "docuflow-files"
    storage_cdn_url: str = ""

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"
    aws_s3_bucket: str = ""

    # AI Provider
    ai_provider: str = "mock"
    ai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"
    ai_base_url: str = ""

    # OCR
    ocr_provider: str = "tesseract"
    tesseract_cmd: str = "/usr/bin/tesseract"

    # Speech-to-Text
    stt_provider: str = "whisper"
    whisper_model: str = "base"

    # File Size Limits (bytes)
    max_pdf_size: int = 52428800       # 50 MB
    max_image_size: int = 20971520     # 20 MB
    max_audio_size: int = 104857600    # 100 MB
    max_video_size: int = 524288000    # 500 MB
    max_doc_size: int = 20971520       # 20 MB

    # CORS
    cors_origins: str = "http://localhost:5175,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "noreply@docuflowai.com"

    # Admin
    first_admin_email: str = "admin@docuflowai.com"
    first_admin_password: str = "Admin@123456"

    # Rate Limiting
    rate_limit_per_minute: int = 60

    # Observability & APM
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1
    sentry_profiles_sample_rate: float = 0.1
    enable_metrics: bool = True

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
