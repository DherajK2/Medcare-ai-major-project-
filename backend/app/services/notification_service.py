from app.providers.notifications.base import NotificationProvider, NotificationMessage
from app.utils.logger import get_logger

logger = get_logger(__name__)

class NotificationService:
    def __init__(self, provider: NotificationProvider):
        self.provider = provider

    async def send_alert_notification(self, recipient_email: str, alert_title: str, alert_message: str):
        msg = NotificationMessage(
            subject=f"Health Alert: {alert_title}",
            body=alert_message,
        )
        result = await self.provider.send(recipient_email, msg)
        if not result.success:
            logger.error("Notification delivery failed", error=result.error, recipient=recipient_email)
        return result

    async def send_safety_notification(self, recipient_email: str, patient_name: str, message: str):
        msg = NotificationMessage(
            subject=f"Safety Alert for {patient_name}",
            body=f"A safety concern has been detected.\n\n{message}\n\nPlease check on {patient_name} immediately.",
        )
        result = await self.provider.send(recipient_email, msg)
        return result

    async def notify_patient_family(self, patient_id, alert):
        """Notify all authorized family members about a high-priority alert."""
        # Implementation requires DB access - will be called with family members list
        logger.info(f"Alert notification triggered for patient {patient_id}", severity=alert.severity)
