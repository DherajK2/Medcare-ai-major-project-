from .base import NotificationProvider, NotificationMessage, DeliveryResult
from app.utils.logger import get_logger

logger = get_logger(__name__)

class EmailNotificationProvider(NotificationProvider):
    """Email provider - stub for SendGrid/SES integration."""
    def __init__(self, api_key: str, from_email: str):
        self.api_key = api_key
        self.from_email = from_email

    async def send(self, recipient: str, message: NotificationMessage) -> DeliveryResult:
        # TODO: Integrate with SendGrid or SES
        logger.info(f"[EMAIL] Would send to {recipient}: {message.subject}")
        return DeliveryResult(success=True, provider="email", message_id="email-stub")
