from typing import AsyncGenerator, Optional
import uuid
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from supabase import create_client, Client
from app.core.config import settings
from app.core.security import verify_token
from app.models.user import User

logger = logging.getLogger(__name__)

# Database
# Database — pool_recycle prevents Supabase's idle connection drops (10 min timeout)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_recycle=240,         # recycle connections every 4 min (before Supabase 5 min idle kill)
    pool_size=5,
    max_overflow=10,
)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    try:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
    except (ConnectionRefusedError, OSError) as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Database connection refused. Please set your Supabase DATABASE_URL in `backend/.env` "
                "(e.g. DATABASE_URL=postgresql+asyncpg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres)"
            )
        )

# Supabase
def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

import uuid

# Auth
security = HTTPBearer(auto_error=False)

DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    from app.models.user import User
    from sqlalchemy import select

    token = credentials.credentials if credentials else None
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = None
    email = None

    # 1. Check Firebase Authentication token
    from app.core.security import verify_firebase_token, uid_to_pg_uuid
    fb_payload = verify_firebase_token(token)
    if fb_payload:
        user_id = fb_payload.get("user_id") or fb_payload.get("sub") or fb_payload.get("uid")
        email = fb_payload.get("email")
    else:
        # 2. Check custom JWT
        payload = verify_token(token)
        if payload:
            user_id = payload.get("sub")
            email = payload.get("email")
        else:
            # 3. Check Supabase JWT fallback
            try:
                supabase = get_supabase()
                user_response = supabase.auth.get_user(token)
                if user_response and user_response.user:
                    user_id = user_response.user.id
                    email = user_response.user.email
            except Exception as e:
                logger.debug(f"Supabase token validation error: {e}")

    if user_id:
        try:
            uid = uid_to_pg_uuid(str(user_id))
            # 1. Query strictly by UUID primary key
            result = await db.execute(select(User).where(User.id == uid))
            user = result.scalar_one_or_none()
            if user:
                if email and user.email != email:
                    user.email = email
                    await db.commit()
                return user

            # 2. If user not found by UUID, check if a row with this email exists (e.g. pre-created)
            if email:
                email_result = await db.execute(select(User).where(User.email == email))
                existing_email_user = email_result.scalar_one_or_none()
                if existing_email_user:
                    return existing_email_user

            # 3. Create a new isolated user in PostgreSQL
            new_user = User(
                id=uid,
                email=email or f"user_{uid}@example.com"
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            logger.info(f"Created new isolated user in PostgreSQL: {new_user.id} ({new_user.email})")
            return new_user
        except Exception as e:
            logger.error(f"Error resolving user: {e}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication session",
        headers={"WWW-Authenticate": "Bearer"}
    )

async def get_current_active_user(current_user=Depends(get_current_user)):
    return current_user
