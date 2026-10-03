from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_patient_access
from app.models.user import Doctor
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

class DoctorCreate(BaseModel):
    patient_id: UUID
    name: str
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_primary: bool = False

@router.get("/{patient_id}")
async def get_doctors(patient_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(Doctor).where(Doctor.patient_id == patient_id).order_by(Doctor.created_at.desc())
    )
    return list(result.scalars().all())

@router.post("")
@router.post("/")
async def add_doctor(data: DoctorCreate, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, data.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    doc = Doctor(
        patient_id=data.patient_id,
        name=data.name,
        specialty=data.specialty,
        hospital=data.hospital,
        phone=data.phone,
        email=data.email,
        address=data.address,
        notes=data.notes,
        is_primary=data.is_primary,
        added_by=current_user.id
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc

@router.delete("/{doctor_id}")
async def delete_doctor(doctor_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    doc = await db.get(Doctor, doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    authorized = await verify_patient_access(current_user.id, doc.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(doc)
    await db.commit()
    return {"message": "Doctor removed"}
