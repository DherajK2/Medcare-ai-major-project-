import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from app.models.base import Base

class SafetyEvent(Base):
    __tablename__ = "safety_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    triggered_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    severity = Column(PG_ENUM('none', 'concern', 'moderate', 'high', 'immediate', name='safety_severity', create_type=False), nullable=False)
    description = Column(Text)
    location = Column(String(500))
    trigger_message = Column(Text)
    family_notified = Column(Boolean, default=False)
    emergency_services_suggested = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    patient = relationship("Patient", back_populates="safety_events")
