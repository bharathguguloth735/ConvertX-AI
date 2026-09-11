"""
DocuFlow AI — Automated Storage Cleanup Tasks
Purges completed/deleted files older than RETENTION_HOURS and cleans orphan temp files.
"""
import os
import time
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from celery import shared_task
from app.workers.celery_app import celery_app
from app.config import settings

logger = logging.getLogger("docuflow.cleanup")


def _get_sync_db():
    """Get a synchronous SQLAlchemy session for Celery workers."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(settings.sync_database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


@celery_app.task(name="app.workers.cleanup_tasks.purge_expired_files_task")
def purge_expired_files_task(retention_hours: int = 24):
    """
    Periodic task to clean up old converted files and expired user uploads.
    """
    logger.info(f"Running automated storage cleanup (retention: {retention_hours}h)...")
    db = _get_sync_db()
    purged_count = 0
    reclaimed_bytes = 0

    try:
        from app.models.core import File, FileStatus
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=retention_hours)

        # Target completed output files or soft-deleted files past retention threshold
        expired_files = db.query(File).filter(
            (File.status == FileStatus.DELETED.value) |
            ((File.is_output == True) & (File.status == FileStatus.COMPLETED.value)),
            File.created_at < cutoff
        ).limit(500).all()

        for f in expired_files:
            try:
                # Remove file from local filesystem if using local storage
                if settings.storage_provider == "local":
                    local_path = os.path.join(settings.storage_local_path, f.storage_path.lstrip("/\\"))
                    if os.path.exists(local_path):
                        reclaimed_bytes += os.path.getsize(local_path)
                        os.remove(local_path)

                f.status = FileStatus.DELETED.value
                purged_count += 1
            except Exception as e:
                logger.warning(f"Error purging file {f.id}: {e}")

        db.commit()
    except Exception as e:
        logger.error(f"Failed to query/purge expired files from DB: {e}")
        db.rollback()
    finally:
        db.close()

    # Also clean orphan temporary files in social_temp and outputs
    orphan_purged = clean_orphan_temp_files(max_age_hours=retention_hours)

    logger.info(
        f"Storage cleanup complete: {purged_count} database files purged, "
        f"{orphan_purged} orphan temp files cleaned, {reclaimed_bytes / (1024*1024):.2f} MB reclaimed."
    )
    return {
        "purged_count": purged_count,
        "orphan_purged": orphan_purged,
        "reclaimed_bytes": reclaimed_bytes,
    }


def clean_orphan_temp_files(max_age_hours: int = 12) -> int:
    """Removes orphan temporary files older than max_age_hours from storage directories."""
    cleaned = 0
    now = time.time()
    max_age_seconds = max_age_hours * 3600

    target_dirs = [
        os.path.join(settings.storage_local_path, "social_temp"),
        os.path.join(settings.storage_local_path, "outputs"),
    ]

    for d in target_dirs:
        if not os.path.exists(d):
            continue
        try:
            for entry in os.scandir(d):
                if entry.is_file():
                    try:
                        mtime = entry.stat().st_mtime
                        if (now - mtime) > max_age_seconds:
                            os.remove(entry.path)
                            cleaned += 1
                    except Exception as e:
                        logger.debug(f"Could not remove temp file {entry.path}: {e}")
        except Exception as e:
            logger.warning(f"Failed scanning directory {d}: {e}")

    return cleaned
