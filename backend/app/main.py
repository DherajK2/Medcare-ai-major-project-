from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.workers.scheduler import scheduler
from app.utils.logger import get_logger

logger = get_logger(__name__)

from app.services.scheduler_service import medication_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    try:
        scheduler.start()
    except Exception as e:
        logger.error(f"Scheduler start failed: {e}")
    try:
        await medication_scheduler.start()
    except Exception as e:
        logger.error(f"Medication scheduler start failed: {e}")
    yield
    try:
        await medication_scheduler.stop()
        scheduler.shutdown(wait=False)
    except Exception:
        pass
    logger.info("Server shutdown complete")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url="/api/openapi.json" if settings.DEBUG else None,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {type(exc).__name__}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Health check and root route (no auth required)
@app.get("/")
async def root():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION, "environment": settings.ENVIRONMENT}

# Import and register all routes
from app.api.routes import (
    auth, patients, health, documents, medications, alerts,
    family, doctors, emergency_contacts, conversations, safety, maps, voice, notifications,
    monitoring, menstrual, telephony
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(medications.router, prefix="/api/medications", tags=["Medications"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(family.router, prefix="/api/family", tags=["Family"])
app.include_router(doctors.router, prefix="/api/doctors", tags=["Doctors"])
app.include_router(emergency_contacts.router, prefix="/api/emergency-contacts", tags=["Emergency Contacts"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["Conversations"])
app.include_router(safety.router, prefix="/api/safety", tags=["Safety"])
app.include_router(maps.router, prefix="/api/maps", tags=["Maps"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Monitoring"])
app.include_router(menstrual.router, prefix="/api/menstrual", tags=["Menstrual Tracker"])
app.include_router(telephony.router, prefix="/api/telephony", tags=["Telephony"])
