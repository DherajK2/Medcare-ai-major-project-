from uuid import UUID
from app.repositories.alert_repo import AlertRepository
from app.utils.logger import get_logger

logger = get_logger(__name__)

class AlertService:
    def __init__(self, alert_repo: AlertRepository, notification_service=None):
        self.repo = alert_repo
        self.notifier = notification_service

    async def create_health_alert(self, patient_id: UUID, severity: str, title: str, message: str,
                                   metric_type: str = None, metric_value: float = None, source_id: UUID = None):
        # Deduplicate: don't create same alert type within 1 hour
        existing = await self.repo.find_recent(patient_id, "health_threshold", metric_type, hours=1)
        if existing:
            return existing
        alert = await self.repo.create(
            patient_id=patient_id,
            alert_type="health_threshold",
            severity=severity,
            title=title,
            message=message,
            metric_type=metric_type,
            metric_value=metric_value,
            source_id=source_id,
        )
        if severity in ["HIGH", "CRITICAL"] and self.notifier:
            await self.notifier.notify_patient_family(patient_id, alert)
        return alert

    async def create_safety_alert(self, patient_id: UUID, message: str):
        return await self.repo.create(
            patient_id=patient_id,
            alert_type="safety_event",
            severity="HIGH",
            title="Safety Concern Detected",
            message=message,
        )

    async def get_patient_alerts(self, patient_id: UUID, limit: int = 50):
        return await self.repo.get_by_patient(patient_id, limit)
