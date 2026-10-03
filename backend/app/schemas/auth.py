from pydantic import BaseModel
try:
    import email_validator
    from pydantic import EmailStr
except ImportError:
    EmailStr = str
from typing import Optional
from uuid import UUID

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID

class UserResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    email: str
