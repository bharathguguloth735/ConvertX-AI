"""
DocuFlow AI — Main FastAPI Application
"""
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import create_tables, seed_initial_data
from app.api.auth import router as auth_router
from app.api.files import router as files_router
from app.api.pdf import router as pdf_router
from app.api.ai import router as ai_router
from app.api.invoice import router as invoice_router
from app.api.admin import router as admin_router
from app.api.jobs import router as jobs_router
from app.api.media import image_router, audio_router, video_router
from app.api.ocr import router as ocr_router
from app.api.social import router as social_router
from app.api.payments import router as payments_router
from app.api.stats import router as stats_router
from app.api.batch import router as batch_router
from app.api.developer import router as developer_router
from app.services.social.social_service import social_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("docuflow")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown logic."""
    logger.info("Starting DocuFlow AI...")
    # Ensure upload directories exist
    os.makedirs(settings.storage_local_path, exist_ok=True)
    os.makedirs(os.path.join(settings.storage_local_path, "outputs"), exist_ok=True)
    os.makedirs(os.path.join(settings.storage_local_path, "social_temp"), exist_ok=True)

    # Clean up expired temporary social files
    try:
        social_service.cleanup_expired_files()
    except Exception as e:
        logger.warning(f"Social temp file cleanup warning: {e}")

    # Create database tables
    await create_tables()
    logger.info("Database tables created/verified.")
    await seed_initial_data()
    logger.info("Initial admin/data check completed.")
    yield
    logger.info("Shutting down DocuFlow AI.")


app = FastAPI(
    title="DocuFlow AI",
    description="All-in-one AI-powered file conversion, editing, compression, and document understanding platform.",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

from app.utils.observability import ObservabilityMiddleware, check_system_readiness, setup_sentry

setup_sentry(app)

# ── Middleware ─────────────────────────────────────────────────────────────────

app.add_middleware(ObservabilityMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length", "X-Process-Time-Ms"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(files_router)
app.include_router(pdf_router)
app.include_router(image_router)
app.include_router(audio_router)
app.include_router(video_router)
app.include_router(ai_router)
app.include_router(invoice_router, prefix="/api/invoice")
app.include_router(invoice_router, prefix="/api/invoices")
app.include_router(admin_router)
app.include_router(jobs_router)
app.include_router(ocr_router)
app.include_router(social_router)
app.include_router(payments_router)
app.include_router(stats_router)
app.include_router(batch_router)
app.include_router(developer_router)

# ── Static File Download Endpoint (Local Storage Fallback) ─────────────────────

@app.get("/api/files/raw/{path:path}")
@app.get("/api/files/static/{path:path}")
async def serve_local_file(path: str, token: str = None):
    """Serve files from local storage with path traversal protection and signed token authorization."""
    from fastapi import HTTPException
    from fastapi.responses import FileResponse
    from pathlib import Path
    from app.services.storage.storage_service import verify_signed_download_token

    clean_path = str(path).lstrip("/\\")
    base_dir = os.path.realpath(settings.storage_local_path)
    full_path = os.path.realpath(os.path.join(base_dir, clean_path))

    # Strict path traversal boundary check
    try:
        if os.path.commonpath([full_path, base_dir]) != base_dir:
            raise HTTPException(403, "Access denied: path traversal detected")
    except ValueError:
        raise HTTPException(403, "Access denied: path traversal detected")

    # Reject hidden or sensitive system files (.env, .git, etc.)
    if any(segment.startswith(".") for segment in Path(clean_path).parts):
        raise HTTPException(403, "Access denied: protected file")

    if not os.path.exists(full_path):
        raise HTTPException(404, "File not found")

    # Public folder check; otherwise require signed token
    is_public = clean_path.startswith("public/") or clean_path.startswith("avatars/")
    if not is_public:
        if not token or not verify_signed_download_token(clean_path, token):
            raise HTTPException(403, "Access denied: valid signed token required")

    safe_name = os.path.basename(path)
    return FileResponse(full_path, filename=safe_name)


# ── Health & Readiness Probes ─────────────────────────────────────────────────

@app.get("/health")
@app.get("/health/live")
async def liveness_check():
    """Liveness probe: verifies the API process is responsive."""
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}


@app.get("/health/ready")
async def readiness_check():
    """Readiness probe: validates database, cache, and disk subsystems."""
    return await check_system_readiness()


@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "redoc": "/redoc",
    }
