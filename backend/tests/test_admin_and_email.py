import pytest
from app.config import settings
from app.database import create_tables, seed_initial_data, AsyncSessionLocal
from app.models.core import User, UserRole
from app.security.auth import verify_password
from app.services.email import email_service
from sqlalchemy import select


@pytest.mark.asyncio
async def test_admin_seeding_and_verification():
    """Verify that first admin user is seeded and can verify password."""
    await create_tables()
    await seed_initial_data()

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == settings.first_admin_email.lower())
        )
        admin = result.scalar_one_or_none()
        assert admin is not None
        assert admin.role == UserRole.ADMIN.value
        assert verify_password(settings.first_admin_password, admin.hashed_password) is True


@pytest.mark.asyncio
async def test_email_service_unconfigured():
    """Verify email service returns informative response when unconfigured."""
    status = await email_service.verify_smtp_connection()
    assert isinstance(status, dict)
    assert "configured" in status
