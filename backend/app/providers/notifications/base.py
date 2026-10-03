from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

@dataclass
class NotificationMessage:
    subject: str
    body: str
    html_body: Optional[str] = None

@dataclass
class DeliveryResult:
    success: bool
    provider: str
    message_id: Optional[str] = None
    error: Optional[str] = None

class NotificationProvider(ABC):
    @abstractmethod
    async def send(self, recipient: str, message: NotificationMessage) -> DeliveryResult:
        ...
