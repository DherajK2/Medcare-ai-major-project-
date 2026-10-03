from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_active_user
from app.services.safety_service import SafetyService
from app.services.emergency_calling_service import EmergencyCallingService
from app.schemas.safety import SafetyAssessmentRequest, SafetyAssessmentResponse

router = APIRouter()

@router.post("/assess", response_model=SafetyAssessmentResponse)
async def assess_safety(request: SafetyAssessmentRequest, current_user=Depends(get_current_active_user)):
    safety_svc = SafetyService()
    assessment = safety_svc.assess_safety(request.message)
    return SafetyAssessmentResponse(
        severity=assessment.severity.value,
        requires_immediate_action=assessment.requires_immediate_action,
        should_notify_family=assessment.should_notify_family,
        should_suggest_911=assessment.should_suggest_911,
        calm_response=assessment.calm_response,
        is_safety_message=assessment.severity.value != "none",
    )

class EmergencyDispatchDossierRequest(BaseModel):
    patient_id: UUID
    presenting_symptom: Optional[str] = "Severe Chest Pain / Cardiac Emergency"
    caller_notes: Optional[str] = ""

@router.post("/emergency-dossier")
async def get_emergency_dossier(
    request: EmergencyDispatchDossierRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    dispatch_svc = EmergencyCallingService(db)
    dossier = await dispatch_svc.build_emergency_case_dossier(
        patient_id=request.patient_id,
        presenting_symptom=request.presenting_symptom or "Severe Chest Pain / Cardiac Emergency",
        caller_notes=request.caller_notes or ""
    )
    return dossier

class EmergencyCallRequest(BaseModel):
    phone_number: Optional[str] = "all"
    speech_script: Optional[str] = None
    patient_id: Optional[UUID] = None
    dossier_data: Optional[Dict[str, Any]] = None
    language: Optional[str] = "en"
    broadcast: Optional[bool] = False
    phone_numbers: Optional[list[str]] = None

@router.post("/dispatch-call")
async def dispatch_emergency_voice_call(
    request: EmergencyCallRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    dispatch_svc = EmergencyCallingService(db)
    
    # Broadcast to ALL related family members, emergency contacts & doctor
    if (request.broadcast or (request.phone_number and request.phone_number.lower() in ["all", "broadcast", "family"])) and request.patient_id:
        symptom_str = "Acute Medical Emergency"
        if request.dossier_data and isinstance(request.dossier_data, dict):
            symptom_str = request.dossier_data.get("presenting_symptom") or symptom_str
        res = await dispatch_svc.initiate_family_broadcast_calls(
            patient_id=request.patient_id,
            symptoms=symptom_str,
            location=request.dossier_data.get("location") if (request.dossier_data and isinstance(request.dossier_data, dict)) else None,
            phone_numbers=request.phone_numbers,
            include_doctor=True
        )
        return res

    res = await dispatch_svc.initiate_voice_call(
        phone_number=request.phone_number or "+918310341645",
        speech_script=request.speech_script or "Urgent Medical Alert",
        patient_id=request.patient_id,
        dossier_data=request.dossier_data,
        language=request.language
    )
    return res

class EmergencyWhatsAppRequest(BaseModel):
    phone_number: str
    message: str

@router.post("/dispatch-whatsapp")
async def dispatch_emergency_whatsapp(
    request: EmergencyWhatsAppRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    dispatch_svc = EmergencyCallingService(db)
    res = await dispatch_svc.send_whatsapp_message(
        phone_number=request.phone_number,
        message=request.message
    )
    return res

class EmergencyEmailRequest(BaseModel):
    patient_id: UUID
    presenting_symptom: Optional[str] = "Severe Chest Pain / Cardiac Emergency"
    recipient_email: Optional[str] = None
    custom_message: Optional[str] = None

@router.post("/dispatch-email")
async def dispatch_emergency_email(
    request: EmergencyEmailRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    dispatch_svc = EmergencyCallingService(db)
    res = await dispatch_svc.dispatch_emergency_email(
        patient_id=request.patient_id,
        presenting_symptom=request.presenting_symptom or "Severe Chest Pain / Cardiac Emergency",
        recipient_email=request.recipient_email,
        custom_message=request.custom_message,
        user_email=current_user.email if current_user else None
    )
    return res
