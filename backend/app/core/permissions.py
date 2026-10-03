from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends, HTTPException
from app.models.patient import FamilyRelationship, RelationshipRole

async def verify_patient_access(
    user_id: UUID,
    patient_id: UUID,
    db: AsyncSession,
    required_role: Optional[RelationshipRole] = None
) -> bool:
    from app.models.patient import Patient
    
    # 1. If user is the creator of the patient, always authorized as OWNER
    p = await db.get(Patient, patient_id)
    if not p:
        return False
    if p.created_by == user_id:
        return True

    # 2. Check FamilyRelationship
    result = await db.execute(
        select(FamilyRelationship).where(
            FamilyRelationship.user_id == user_id,
            FamilyRelationship.patient_id == patient_id
        )
    )
    rel = result.scalars().first()
    if not rel:
        return False

    if required_role:
        role_hierarchy = {
            "owner": 4,
            "doctor": 3,
            "caregiver": 2,
            "viewer": 1,
            RelationshipRole.OWNER: 4,
            RelationshipRole.DOCTOR: 3,
            RelationshipRole.CAREGIVER: 2,
            RelationshipRole.VIEWER: 1,
        }
        rel_role_str = str(rel.role).lower().replace("relationshiprole.", "")
        req_role_str = str(required_role).lower().replace("relationshiprole.", "")
        if role_hierarchy.get(rel_role_str, 0) < role_hierarchy.get(req_role_str, 0):
            return False
    return True

async def get_authorized_patients(user_id: UUID, db: AsyncSession) -> list[UUID]:
    from app.models.patient import Patient
    res1 = await db.execute(
        select(FamilyRelationship.patient_id).where(
            FamilyRelationship.user_id == user_id
        )
    )
    p_ids = [row[0] for row in res1.fetchall()]

    res2 = await db.execute(
        select(Patient.id).where(Patient.created_by == user_id)
    )
    for row in res2.fetchall():
        if row[0] not in p_ids:
            p_ids.append(row[0])
    return p_ids

def require_patient_access(required_role: Optional[RelationshipRole] = None):
    """FastAPI dependency factory for patient authorization."""
    async def dependency(patient_id: UUID, current_user=Depends(lambda: None), db: AsyncSession = Depends(lambda: None)):
        authorized = await verify_patient_access(current_user.id, patient_id, db, required_role)
        if not authorized:
            raise HTTPException(status_code=403, detail="Access to this patient is not authorized")
        return patient_id
    return dependency
