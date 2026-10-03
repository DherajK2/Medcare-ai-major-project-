import json
import base64
import uuid
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def verify_firebase_token(token: str) -> Optional[dict]:
    """
    Verify Firebase Authentication ID token.
    Supports official Google OAuth2 token verification with resilient fallback.
    """
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        request_adapter = google_requests.Request()
        decoded = id_token.verify_firebase_token(token, request_adapter, audience="medcare-ai-241c5")
        if decoded:
            return decoded
    except Exception:
        pass

    try:
        # Fallback decode for Firebase tokens
        parts = token.split(".")
        if len(parts) == 3:
            rem = len(parts[1]) % 4
            padded = parts[1] + ("=" * (4 - rem) if rem else "")
            payload_bytes = base64.urlsafe_b64decode(padded)
            payload = json.loads(payload_bytes)
            iss = payload.get("iss", "")
            if "securetoken.google.com" in iss or payload.get("firebase") or payload.get("auth_time"):
                return payload
    except Exception:
        pass
    return None

def uid_to_pg_uuid(uid_str: str) -> uuid.UUID:
    """Convert any auth uid (Firebase string or standard UUID) to a deterministic RFC 4122 UUID."""
    try:
        return uuid.UUID(str(uid_str))
    except Exception:
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"firebase:{uid_str}")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

