from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_patient_access
from app.models.user import EmergencyContact
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

class EmergencyContactCreate(BaseModel):
    patient_id: UUID
    name: str
    relationship_label: str
    phone: str
    email: Optional[str] = None
    priority: int = 1

@router.get("/{patient_id}")
async def get_emergency_contacts(patient_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(EmergencyContact)
        .where(EmergencyContact.patient_id == patient_id)
        .order_by(EmergencyContact.priority)
    )
    return list(result.scalars().all())

@router.post("")
@router.post("/")
async def add_emergency_contact(data: EmergencyContactCreate, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, data.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    contact = EmergencyContact(
        patient_id=data.patient_id,
        name=data.name,
        relationship_label=data.relationship_label,
        phone=data.phone,
        email=data.email,
        priority=data.priority,
        added_by=current_user.id
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact

@router.delete("/{contact_id}")
async def delete_emergency_contact(contact_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    contact = await db.get(EmergencyContact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    authorized = await verify_patient_access(current_user.id, contact.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(contact)
    await db.commit()
    return {"message": "Emergency contact deleted"}
