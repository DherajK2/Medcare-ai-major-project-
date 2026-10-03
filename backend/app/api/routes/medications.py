from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID
from datetime import date, time
from typing import Optional, List
from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_patient_access
from app.models.medication import Medication, MedicationSchedule, MedicationAdherence
from app.schemas.medication import MedicationCreate, BatchMedicationsRequest
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.get("/{patient_id}")
async def get_medications(patient_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(Medication)
        .where(Medication.patient_id == patient_id)
        .order_by(desc(Medication.created_at))
    )
    return result.scalars().all()

@router.post("/batch")
async def batch_add_medications(data: BatchMedicationsRequest, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, data.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    
    saved_medications = []
    for item in data.medications:
        if not item.name or not item.name.strip():
            continue
            
        clean_name = item.name.strip()
        med_res = await db.execute(
            select(Medication).where(
                Medication.patient_id == data.patient_id,
                Medication.name.ilike(clean_name)
            )
        )
        existing_med = med_res.scalar_one_or_none()
        
        if existing_med:
            existing_med.dosage = item.dosage or existing_med.dosage
            existing_med.frequency = item.frequency or existing_med.frequency
            existing_med.instructions = item.instructions or existing_med.instructions
            if item.prescribing_doctor:
                existing_med.prescribing_doctor = item.prescribing_doctor
            if item.source_document_id:
                existing_med.source_document_id = item.source_document_id
            existing_med.is_active = True
            existing_med.reminders_enabled = True
            saved_medications.append(existing_med)
        else:
            new_med = Medication(
                patient_id=data.patient_id,
                name=clean_name,
                generic_name=item.generic_name,
                dosage=item.dosage or "Standard",
                frequency=item.frequency or "Once daily",
                route=item.route or "oral",
                start_date=item.start_date or date.today(),
                end_date=item.end_date,
                prescribing_doctor=item.prescribing_doctor or "Prescribing Physician",
                instructions=item.instructions or "Take as prescribed",
                source_document_id=item.source_document_id,
                is_active=True,
                reminders_enabled=True,
                added_by=current_user.id
            )
            db.add(new_med)
            await db.flush()
            
            sched1 = MedicationSchedule(
                medication_id=new_med.id,
                patient_id=data.patient_id,
                scheduled_time=time(9, 0),
                is_active=True
            )
            sched2 = MedicationSchedule(
                medication_id=new_med.id,
                patient_id=data.patient_id,
                scheduled_time=time(20, 0),
                is_active=True
            )
            db.add_all([sched1, sched2])
            saved_medications.append(new_med)

    await db.commit()
    return {
        "success": True,
        "message": f"Successfully added/updated {len(saved_medications)} medications for patient",
        "count": len(saved_medications),
        "medications": saved_medications
    }

@router.post("")
@router.post("/")
async def add_medication(data: MedicationCreate, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, data.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    med = Medication(
        patient_id=data.patient_id,
        name=data.name,
        generic_name=data.generic_name,
        dosage=data.dosage,
        frequency=data.frequency,
        route=data.route,
        start_date=data.start_date,
        end_date=data.end_date,
        prescribing_doctor=data.prescribing_doctor,
        instructions=data.instructions,
        is_active=True,
        added_by=current_user.id
    )
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return med

@router.delete("/{medication_id}")
async def delete_medication(medication_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    med = await db.get(Medication, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    authorized = await verify_patient_access(current_user.id, med.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(med)
    await db.commit()
    return {"message": "Medication deleted"}
