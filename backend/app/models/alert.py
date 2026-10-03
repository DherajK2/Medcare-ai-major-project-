import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from app.models.base import Base

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(PG_ENUM('health_threshold', 'health_trend', 'health_anomaly', 'medication_reminder', 'medication_missed', 'appointment_reminder', 'safety_event', 'missing_measurement', 'system', name='alert_type', create_type=False), nullable=False)
    severity = Column(PG_ENUM('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='alert_severity', create_type=False), nullable=False)
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    metric_type = Column(String(100))
    metric_value = Column(Numeric(10, 4))
    source_id = Column(UUID(as_uuid=True))
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    patient = relationship("Patient", back_populates="alerts")
    notification_events = relationship("NotificationEvent", back_populates="alert")

class NotificationEvent(Base):
    __tablename__ = "notification_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("alerts.id", ondelete="CASCADE"))
    recipient_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    recipient_email = Column(String(255))
    recipient_phone = Column(String(30))
    channel = Column(PG_ENUM('email', 'sms', 'push', 'in_app', name='notification_channel', create_type=False), nullable=False)
    status = Column(PG_ENUM('pending', 'sent', 'delivered', 'failed', name='notification_status', create_type=False), default="pending")
    provider = Column(String(50))
    provider_message_id = Column(String(200))
    error_message = Column(Text)
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    alert = relationship("Alert", back_populates="notification_events")
