from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID, uuid4
from app.core.dependencies import get_db, get_current_active_user
from app.schemas.conversation import ChatRequest, ChatResponse
from app.services.conversation_service import ConversationService
from app.services.gemini_service import GeminiService
from app.services.rag_service import RAGService
from app.services.safety_service import SafetyService
from app.services.alert_service import AlertService
from app.services.map_service import MapService
from app.providers.embeddings.gemini_provider import GeminiEmbeddingProvider
from app.providers.maps.osm_provider import OpenStreetMapProvider
from app.core.config import settings
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("", response_model=ChatResponse)
@router.post("/", response_model=ChatResponse)
@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    gemini = GeminiService()
    embedder = GeminiEmbeddingProvider(settings.GEMINI_API_KEY)
    rag = RAGService(embedder, gemini)
    safety_svc = SafetyService()
    map_svc = MapService(OpenStreetMapProvider())
    from app.repositories.alert_repo import AlertRepository
    from app.models.alert import Alert
    alert_repo = AlertRepository(Alert, db)
    alert_svc = AlertService(alert_repo)
    conv_svc = ConversationService(gemini, rag, safety_svc, alert_svc, map_svc)
    
    target_patient_id = request.patient_id
    if target_patient_id:
        from app.core.permissions import verify_patient_access
        authorized = await verify_patient_access(current_user.id, target_patient_id, db)
        if not authorized:
            target_patient_id = None

    if not target_patient_id:
        from app.models.patient import Patient, FamilyRelationship
        from sqlalchemy import select, or_
        res = await db.execute(
            select(Patient)
            .outerjoin(FamilyRelationship, FamilyRelationship.patient_id == Patient.id)
            .where(
                or_(
                    Patient.created_by == current_user.id,
                    FamilyRelationship.user_id == current_user.id
                )
            )
            .order_by(Patient.updated_at.desc())
            .limit(1)
        )
        p = res.scalar_one_or_none()
        if p:
            target_patient_id = p.id

    result = await conv_svc.process_message(
        message=request.message,
        user_id=current_user.id,
        patient_id=target_patient_id,
        db=db,
        conversation_history=request.conversation_history,
    )
    return ChatResponse(
        answer=result["answer"],
        sources=result.get("sources", []),
        intent=result.get("intent", "general_chat"),
        conversation_id=request.conversation_id or uuid4(),
        is_safety_response=result.get("is_safety_response", False),
        safety_severity=result.get("safety_severity"),
        should_suggest_911=result.get("should_suggest_911", False),
        should_notify_family=result.get("should_notify_family", False),
        target_phone=result.get("target_phone"),
    )
