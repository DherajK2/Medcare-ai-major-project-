from sqlalchemy import select
from uuid import UUID
from typing import Optional
from app.repositories.base import BaseRepository
from app.models.patient import Patient, FamilyRelationship

class PatientRepository(BaseRepository[Patient]):
    async def get_by_user(self, user_id: UUID) -> list[Patient]:
        result = await self.session.execute(
            select(Patient)
            .join(FamilyRelationship, FamilyRelationship.patient_id == Patient.id)
            .where(FamilyRelationship.user_id == user_id)
            .where(Patient.is_active == True)
        )
        return list(result.scalars().all())

    async def get_family_relationships(self, patient_id: UUID) -> list[FamilyRelationship]:
        result = await self.session.execute(
            select(FamilyRelationship).where(FamilyRelationship.patient_id == patient_id)
        )
        return list(result.scalars().all())

    async def add_family_member(self, **kwargs) -> FamilyRelationship:
        rel = FamilyRelationship(**kwargs)
        self.session.add(rel)
        await self.session.commit()
        await self.session.refresh(rel)
        return rel
