"""
DocuFlow AI — Database Configuration
SQLAlchemy async engine + session factory.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event
from app.config import settings


# Engine kwargs
engine_kwargs = {"echo": settings.is_development}
if "sqlite" not in settings.database_url:
    engine_kwargs.update({"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20})

# Async engine
engine = create_async_engine(settings.database_url, **engine_kwargs)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all database tables (used in startup) and ensure schema compatibility."""
    from sqlalchemy import text
    async with engine.begin() as conn:
        if "postgresql" in settings.database_url:
            await conn.execute(
                text("CREATE EXTENSION IF NOT EXISTS vector")
            )
        import app.models  # Ensure all models are registered
        await conn.run_sync(Base.metadata.create_all)

        # Reconcile columns on existing SQLite/Postgres tables
        migrations = [
            "ALTER TABLE jobs ADD COLUMN celery_task_id VARCHAR(255)",
            "ALTER TABLE jobs ADD COLUMN started_at DATETIME",
            "ALTER TABLE jobs ADD COLUMN processing_time_ms INTEGER",
            "ALTER TABLE document_chunks ADD COLUMN embedding_json TEXT",
            "ALTER TABLE ocr_results ADD COLUMN page_count INTEGER DEFAULT 1",
            "ALTER TABLE ocr_results ADD COLUMN page_texts TEXT",
        ]
        for sql in migrations:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass


async def seed_initial_data():
    """Seed initial data like the configured first admin user."""
    import logging
    import uuid
    from sqlalchemy import select
    from app.models.core import User, UserRole, SubscriptionPlan
    from app.security.auth import hash_password

    logger = logging.getLogger("docuflow.init")

    if not settings.first_admin_email or not settings.first_admin_password:
        return

    admin_email = settings.first_admin_email.strip().lower()
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(User).where(User.email == admin_email))
            user = result.scalar_one_or_none()
            if not user:
                username = admin_email.split("@")[0]
                # Avoid collision with username if another user has it
                existing_uname = await session.scalar(select(User.id).where(User.username == username))
                if existing_uname:
                    username = f"admin_{uuid.uuid4().hex[:4]}"

                user = User(
                    id=str(uuid.uuid4()),
                    email=admin_email,
                    username=username,
                    hashed_password=hash_password(settings.first_admin_password),
                    full_name="Admin",
                    role=UserRole.ADMIN.value,
                    plan=SubscriptionPlan.ENTERPRISE.value,
                    is_active=True,
                    is_email_verified=True,
                )
                session.add(user)
                logger.info(f"Created first admin user: {admin_email}")
            else:
                user.role = UserRole.ADMIN.value
                user.plan = SubscriptionPlan.ENTERPRISE.value
                user.hashed_password = hash_password(settings.first_admin_password)
                user.is_active = True
                user.is_email_verified = True
                logger.info(f"Synchronized admin user: {admin_email}")
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.warning(f"Could not seed admin user: {e}")


async def drop_tables():
    """Drop all database tables (used in testing)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

