from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_active_user
from app.services.whatsapp_service import WhatsAppService
from app.models.patient import Patient
from app.models.medication import Medication

router = APIRouter()

class WhatsAppReminderRequest(BaseModel):
    patient_id: UUID
    medication_id: Optional[UUID] = None
    phone_number: Optional[str] = None
    custom_message: Optional[str] = None

@router.post("/whatsapp-medication-reminder")
async def send_whatsapp_medication_reminder(
    request: WhatsAppReminderRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    wa = WhatsAppService()
    patient = await db.get(Patient, request.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    p_name = f"{patient.first_name} {patient.last_name}"
    phone = request.phone_number or patient.phone

    med_name = "Prescribed Medication"
    dosage = "Standard Dosage"
    instructions = "Take as directed by doctor"

    if request.medication_id:
        med = await db.get(Medication, request.medication_id)
        if med:
            med_name = med.name
            dosage = med.dosage or "Standard Dosage"
            instructions = med.instructions or "Follow physician guidance"

    res = await wa.send_medication_reminder(
        patient_name=p_name,
        phone=phone,
        medication_name=med_name,
        dosage=dosage,
        instructions=instructions
    )
    return res

@router.post("/trigger-now/{patient_id}")
async def trigger_immediate_medication_reminder(
    patient_id: UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Instantly test triggering an automated WhatsApp medication reminder for active patient."""
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    from app.models.medication import Medication
    from sqlalchemy import select
    res_m = await db.execute(select(Medication).where(Medication.patient_id == patient_id, Medication.is_active == True))
    meds = list(res_m.scalars().all())
    med = meds[0] if meds else None

    wa = WhatsAppService()
    p_name = f"{patient.first_name} {patient.last_name}"
    res = await wa.send_medication_reminder(
        patient_name=p_name,
        phone=patient.phone,
        medication_name=med.name if med else "Prescribed Dosage",
        dosage=med.dosage if med else "Standard",
        instructions=med.instructions if med else "Take on time",
        scheduled_time="Immediate Test Alert"
    )
    return res
