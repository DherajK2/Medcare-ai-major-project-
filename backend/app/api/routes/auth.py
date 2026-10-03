from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_supabase, get_current_active_user
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/login")
async def login(request: LoginRequest, supabase=Depends(get_supabase)):
    try:
        response = supabase.auth.sign_in_with_password({"email": request.email, "password": request.password})
        if not response.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "user_id": response.user.id
        }
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/register")
async def register(request: RegisterRequest, supabase=Depends(get_supabase)):
    try:
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {"data": {"full_name": request.full_name}}
        })
        if not response.user:
            raise HTTPException(status_code=400, detail="Registration failed")
        return {"message": "Registration successful. Please check your email to verify your account.", "user_id": response.user.id}
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=400, detail="Registration failed")

@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_active_user)):
    return current_user
