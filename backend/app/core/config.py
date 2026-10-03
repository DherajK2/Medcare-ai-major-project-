from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional
import re
from urllib.parse import quote_plus

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=["backend/.env", ".env"], env_file_encoding="utf-8", extra="ignore")
    APP_NAME: str = "Medical AI Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:3000"]
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    SUPABASE_URL: str = "http://localhost"
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_INDEX: str = "medical-ai"
    PINECONE_DIMENSION: int = 768
    EMAIL_PROVIDER: str = "smtp"
    EMAIL_API_KEY: Optional[str] = None
    RESEND_API_KEY: Optional[str] = None
    BREVO_API_KEY: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "noreply@medcare.ai"
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    SMS_PROVIDER: str = "console"
    SMS_API_KEY: Optional[str] = None
    PUSH_PROVIDER: str = "console"
    PUSH_API_KEY: Optional[str] = None
    STORAGE_BUCKET: str = "medical-documents"
    OCR_PROVIDER: str = "vision"
    STT_PROVIDER: str = "sarvam"
    SARVAM_API_KEY: Optional[str] = None
    SARVAM_ORG_ID: Optional[str] = "01a05e64-a78a-74b4-ace2-6a4749e4876b"
    SARVAM_WORKSPACE_ID: Optional[str] = "01a05e64-a79d-78b0-8718-01f0caed2249"
    SARVAM_CONNECTION_ID: Optional[str] = "44dbf942-36-b6a718e2-845a"
    SARVAM_AGENT_PHONE_NUMBER: Optional[str] = "+918071582685"
    SARVAM_APP_ID: Optional[str] = "Emergency-B-7af1e36f-7382"
    SARVAM_EMERGENCY_APP_ID: Optional[str] = "MedCare-Eme-abd37307-3a0f"
    SARVAM_EMERGENCY_APP_VERSION: Optional[int] = 3
    SARVAM_BLOOD_BANK_APP_ID: Optional[str] = "Emergency-B-7af1e36f-7382"
    SARVAM_BLOOD_BANK_APP_VERSION: Optional[int] = 4
    SARVAM_DEFAULT_APP_VERSION: Optional[int] = 3
    SARVAM_DEFAULT_SPEAKER: str = "shubh"
    WHISPER_MODEL: str = "base"
    OPENAI_API_KEY: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_NUMBER: Optional[str] = None
    WHATSAPP_FROM_NUMBER: Optional[str] = None
    SECRET_KEY: str = "medcare-production-secret-key-change-in-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    RATE_LIMIT_AUTH: str = "10/minute"
    RATE_LIMIT_AI: str = "30/minute"
    # --- Push notifications ---
    # Expo: no server key needed — Expo handles APNs/FCM routing automatically
    # FCM direct (optional, for non-Expo apps):
    GROQ_API_KEY: Optional[str] = None
    FCM_PROJECT_ID: Optional[str] = None
    FCM_SERVER_KEY: Optional[str] = None   # OAuth2 bearer or legacy server key
    # Firebase Admin SDK service account JSON path (for firebase-admin, optional)
    FIREBASE_SERVICE_ACCOUNT_PATH: Optional[str] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if not v:
            return v
        url = v.strip()
        # Convert postgresql:// or postgres:// to postgresql+asyncpg://
        if url.startswith("postgres://"):
            url = "postgresql+asyncpg://" + url[len("postgres://"):]
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]
        return url

settings = Settings()