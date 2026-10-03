from .base import NotificationProvider, NotificationMessage, DeliveryResult
from app.utils.logger import get_logger

logger = get_logger(__name__)

class SMSNotificationProvider(NotificationProvider):
    """SMS provider - stub for Twilio integration."""
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def send(self, recipient: str, message: NotificationMessage) -> DeliveryResult:
        # TODO: Integrate with Twilio
        logger.info(f"[SMS] Would send to {recipient}: {message.body[:100]}")
        return DeliveryResult(success=True, provider="sms", message_id="sms-stub")
