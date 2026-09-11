"""
DocuFlow AI — FastAPI Dependencies for Authentication
"""
from typing import Optional
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, UserRole, SubscriptionPlan
from app.security.auth import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency: returns the current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if not user_id or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


async def get_optional_user(
    token: Optional[str] = Depends(optional_oauth2),
    token_query: Optional[str] = Query(None, alias="token"),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Dependency: returns current user if authenticated, else None."""
    effective_token = token or token_query
    if not effective_token:
        return None
    try:
        return await get_current_user(token=effective_token, db=db)
    except HTTPException:
        return None


async def get_current_user_or_guest(
    token: Optional[str] = Depends(optional_oauth2),
    token_query: Optional[str] = Query(None, alias="token"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency: returns current authenticated user, or a persistent guest user if unauthenticated."""
    effective_token = token or token_query
    if effective_token:
        try:
            return await get_current_user(token=effective_token, db=db)
        except HTTPException:
            pass

    result = await db.execute(select(User).where(User.id == "guest_user_id"))
    guest = result.scalar_one_or_none()
    if not guest:
        guest = User(
            id="guest_user_id",
            email="guest@docuflow.ai",
            username="guest",
            hashed_password="guest_password_hash",
            full_name="Guest User",
            role=UserRole.USER,
            plan=SubscriptionPlan.FREE,
            is_active=True,
            is_email_verified=True,
        )
        db.add(guest)
        await db.flush()
    return guest


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: ensures the current user is an admin."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

