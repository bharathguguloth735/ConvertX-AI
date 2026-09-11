"""
DocuFlow AI — Observability, APM & Telemetry
Provides structured latency metrics, Sentry integration, and readiness probes.
"""
import time
import shutil
import logging
from typing import Dict, Any
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings

logger = logging.getLogger("docuflow.telemetry")


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Middleware measuring request duration, attaching X-Process-Time-Ms header,
    and recording structured telemetry.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")

        try:
            response: Response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            response.headers["X-Process-Time-Ms"] = str(duration_ms)

            # Structured access logging for non-health endpoints
            if not request.url.path.startswith("/health"):
                logger.info(
                    f"HTTP {request.method} {request.url.path} | "
                    f"status={response.status_code} | "
                    f"duration={duration_ms}ms | ip={client_ip}"
                )
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"HTTP {request.method} {request.url.path} FAILED | "
                f"duration={duration_ms}ms | ip={client_ip} | error={exc}",
                exc_info=True
            )
            raise exc


async def check_system_readiness() -> Dict[str, Any]:
    """
    Comprehensive health and readiness diagnostic probe.
    Inspects Database connection, Redis latency, and disk storage headroom.
    """
    from app.database import AsyncSessionLocal
    from sqlalchemy import text
    import os

    status = {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "services": {},
    }

    # 1. Database Check
    db_ok = False
    db_latency_ms = None
    try:
        t0 = time.perf_counter()
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        db_ok = True
    except Exception as e:
        status["status"] = "degraded"
        status["services"]["database"] = {"status": "down", "error": str(e)}

    if db_ok:
        status["services"]["database"] = {"status": "ok", "latency_ms": db_latency_ms}

    # 2. Redis Check
    try:
        import redis.asyncio as aioredis
        t0 = time.perf_counter()
        r = aioredis.from_url(settings.redis_url, socket_timeout=1.0)
        await r.ping()
        await r.aclose()
        redis_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        status["services"]["redis"] = {"status": "ok", "latency_ms": redis_latency_ms}
    except Exception as e:
        # In development without Redis running, report as fallback
        status["services"]["redis"] = {"status": "degraded_fallback", "message": "In-memory rate limiting active"}

    # 3. Storage Disk Check
    try:
        storage_path = settings.storage_local_path
        if os.path.exists(storage_path):
            total, used, free = shutil.disk_usage(storage_path)
            free_gb = round(free / (1024**3), 2)
            total_gb = round(total / (1024**3), 2)
            status["services"]["storage"] = {
                "status": "ok" if free_gb > 1.0 else "warning_low_disk",
                "free_gb": free_gb,
                "total_gb": total_gb,
                "provider": settings.storage_provider,
            }
    except Exception as e:
        status["services"]["storage"] = {"status": "unknown", "error": str(e)}

    return status


def setup_sentry(app):
    """Initialize Sentry APM error and performance telemetry if DSN is configured."""
    if not settings.sentry_dsn:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.app_env,
            release=f"docuflow-ai@{settings.app_version}",
            traces_sample_rate=settings.sentry_traces_sample_rate,
            profiles_sample_rate=settings.sentry_profiles_sample_rate,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
        )
        logger.info("Sentry APM & Error Monitoring initialized.")
    except ImportError:
        logger.warning("sentry-sdk not installed; skipping Sentry telemetry initialization.")
