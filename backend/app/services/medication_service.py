from uuid import UUID
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.medication import Medication, MedicationSchedule
from app.utils.logger import get_logger

logger = get_logger(__name__)

class MedicationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_patient_medications(self, patient_id: UUID, active_only: bool = True) -> list[Medication]:
        query = select(Medication).where(Medication.patient_id == patient_id)
        if active_only:
            query = query.where(Medication.is_active == True)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_medication(self, patient_id: UUID, added_by: UUID, **kwargs) -> Medication:
        med = Medication(patient_id=patient_id, added_by=added_by, **kwargs)
        self.db.add(med)
        await self.db.commit()
        await self.db.refresh(med)
        return med

    async def create_schedule(self, medication_id: UUID, patient_id: UUID, scheduled_time, days_of_week: list) -> MedicationSchedule:
        schedule = MedicationSchedule(
            medication_id=medication_id,
            patient_id=patient_id,
            scheduled_time=scheduled_time,
            days_of_week=days_of_week
        )
        self.db.add(schedule)
        await self.db.commit()
        await self.db.refresh(schedule)
        return schedule
