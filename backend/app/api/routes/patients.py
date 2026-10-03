from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_patient_access, get_authorized_patients
from app.repositories.patient_repo import PatientRepository
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, FamilyRelationshipCreate
from app.models.patient import RelationshipRole, FamilyRelationship
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.get("")
@router.get("/")
async def list_patients(current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    from app.models.patient import Patient, FamilyRelationship
    from sqlalchemy import select, delete, or_

    # Fetch patients owned by or shared with current_user
    res = await db.execute(
        select(Patient)
        .outerjoin(FamilyRelationship, FamilyRelationship.patient_id == Patient.id)
        .where(
            or_(
                FamilyRelationship.user_id == current_user.id,
                Patient.created_by == current_user.id
            )
        )
        .distinct()
        .order_by(Patient.created_at.desc())
    )
    patients = list(res.scalars().all())
    return patients

@router.post("")
@router.post("/")
async def create_patient(data: PatientCreate, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    from app.models.patient import Patient
    repo = PatientRepository(Patient, db)
    patient = await repo.create(created_by=current_user.id, **data.model_dump())
    # Auto-add creator as owner
    rel = FamilyRelationship(user_id=current_user.id, patient_id=patient.id, role="owner", authorized_by=current_user.id)
    db.add(rel)
    await db.commit()
    await db.refresh(patient)
    return patient

@router.get("/{patient_id}")
async def get_patient(patient_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    from app.models.patient import Patient
    repo = PatientRepository(Patient, db)
    patient = await repo.get_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}")
async def update_patient(patient_id: UUID, data: PatientUpdate, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, patient_id, db, RelationshipRole.CAREGIVER)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    from app.models.patient import Patient
    repo = PatientRepository(Patient, db)
    return await repo.update(patient_id, **{k: v for k, v in data.model_dump().items() if v is not None})

@router.delete("/{patient_id}")
async def delete_patient(patient_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    from app.models.patient import Patient, FamilyRelationship
    from sqlalchemy import select, delete
    
    p = await db.get(Patient, patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Delete family relationships first
    await db.execute(delete(FamilyRelationship).where(FamilyRelationship.patient_id == patient_id))
    await db.delete(p)
    await db.commit()
    return {"message": "Patient deleted successfully"}
