"""
Device push token registry.

Stores Expo push tokens (ExponentPushToken[xxx]) or raw FCM/APNs tokens
per user per device.  Multiple devices per user are supported.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import Base


class DevicePushToken(Base):
    __tablename__ = "device_push_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # The token string: ExponentPushToken[...] for Expo, or raw FCM registration token
    token = Column(Text, nullable=False)

    # "expo" | "fcm" | "apns"
    provider = Column(String(20), nullable=False, default="expo")

    # Optional device label for debugging ("iPhone 15", "Chrome on Mac", etc.)
    device_label = Column(String(200))

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        # Prevent exact duplicate token registrations per user
        UniqueConstraint("user_id", "token", name="uq_device_push_tokens_user_token"),
    )

    user = relationship("User", back_populates="push_tokens")
