from .base import NotificationProvider, NotificationMessage, DeliveryResult
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ConsoleNotificationProvider(NotificationProvider):
    """Development stub - logs notifications to console instead of sending them."""
    async def send(self, recipient: str, message: NotificationMessage) -> DeliveryResult:
        logger.info(f"[NOTIFICATION] To: {recipient} | Subject: {message.subject}")
        logger.info(f"[NOTIFICATION BODY] {message.body[:200]}")
        return DeliveryResult(success=True, provider="console", message_id="console-stub")
