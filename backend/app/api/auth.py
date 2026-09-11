"""
DocuFlow AI — Authentication API Router
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.models import User, Session, UserRole, SubscriptionPlan
from app.security.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.security.dependencies import get_current_user
from app.schemas.auth import (
    RegisterRequest, LoginResponse, UserResponse,
    RefreshRequest, TokenResponse
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username uniqueness
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        id=str(uuid.uuid4()),
        email=data.email.lower(),
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.USER,
        plan=SubscriptionPlan.FREE,
    )
    db.add(user)
    await db.flush()
    return UserResponse.model_validate(user)


@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Login with email/username and password."""
    # Support login with email or username
    result = await db.execute(
        select(User).where(
            (User.email == form_data.username.lower()) |
            (User.username == form_data.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    # Store session
    session = Session(
        id=str(uuid.uuid4()),
        user_id=user.id,
        refresh_token=refresh_token,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
        expires_at=datetime.now(timezone.utc).replace(
            tzinfo=None
        ).replace(microsecond=0),
    )
    db.add(session)

    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(
        select(Session).where(Session.refresh_token == data.refresh_token)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Session not found or expired")

    access_token = create_access_token({"sub": user_id})
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Logout and invalidate the user's sessions."""
    # Delete all sessions for user (simple approach)
    sessions = await db.execute(select(Session).where(Session.user_id == current_user.id))
    for session in sessions.scalars().all():
        await db.delete(session)
    await db.flush()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)
