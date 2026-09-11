"""
DocuFlow AI — Authentication Flow Unit & Integration Tests
Tests password hashing, JWT token lifecycle, and user model operations.
"""
import pytest
from datetime import datetime, timezone
import uuid
from app.security.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.database import create_tables, AsyncSessionLocal
from app.models.core import User, UserRole, SubscriptionPlan
from sqlalchemy import select


def test_password_hashing():
    """Verify bcrypt password hashing and verification."""
    raw_pass = "SuperSecurePassword123!"
    hashed = hash_password(raw_pass)

    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_access_token_lifecycle():
    """Verify JWT access token generation and payload decoding."""
    user_id = str(uuid.uuid4())
    token = create_access_token({"sub": user_id, "role": "admin"})

    payload = decode_token(token)
    assert payload is not None
    assert payload.get("sub") == user_id
    assert payload.get("role") == "admin"
    assert payload.get("type") == "access"


def test_jwt_refresh_token_lifecycle():
    """Verify JWT refresh token generation."""
    user_id = str(uuid.uuid4())
    token = create_refresh_token({"sub": user_id})

    payload = decode_token(token)
    assert payload is not None
    assert payload.get("sub") == user_id
    assert payload.get("type") == "refresh"


@pytest.mark.asyncio
async def test_user_creation_and_query():
    """Verify user persistence and password verification in DB."""
    await create_tables()

    test_email = f"test_{uuid.uuid4().hex[:8]}@docuflow.ai"
    test_username = f"user_{uuid.uuid4().hex[:8]}"
    raw_password = "TestPassword456!"

    async with AsyncSessionLocal() as session:
        user = User(
            id=str(uuid.uuid4()),
            email=test_email,
            username=test_username,
            hashed_password=hash_password(raw_password),
            role=UserRole.USER.value,
            plan=SubscriptionPlan.FREE.value,
            is_active=True,
        )
        session.add(user)
        await session.commit()

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == test_email))
        fetched = result.scalar_one_or_none()
        assert fetched is not None
        assert fetched.username == test_username
        assert verify_password(raw_password, fetched.hashed_password) is True
        assert fetched.role == UserRole.USER.value
