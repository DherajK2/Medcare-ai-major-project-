from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION, "environment": settings.ENVIRONMENT}
