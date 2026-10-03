from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import EmergencyContact
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ContactService:
    def __init__(self, db: AsyncSession, notification_service=None):
        self.db = db
        self.notifier = notification_service

    async def get_emergency_contacts(self, patient_id: UUID) -> list[EmergencyContact]:
        result = await self.db.execute(
            select(EmergencyContact)
            .where(EmergencyContact.patient_id == patient_id)
            .where(EmergencyContact.is_active == True)
            .order_by(EmergencyContact.priority)
        )
        return list(result.scalars().all())

    async def notify_emergency_contacts(self, patient_id: UUID, message: str, patient_name: str = "the patient"):
        contacts = await self.get_emergency_contacts(patient_id)
        results = []
        for contact in contacts:
            if contact.email and self.notifier:
                result = await self.notifier.send_safety_notification(contact.email, patient_name, message)
                results.append({"contact": contact.name, "success": result.success})
                logger.info(f"Emergency notification sent to {contact.name}: {result.success}")
        return results
