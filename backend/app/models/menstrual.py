import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Date, Integer, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base

class MenstrualCycleLog(Base):
    __tablename__ = "menstrual_cycle_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(Date, nullable=False, default=date.today)
    end_date = Column(Date, nullable=True)
    cycle_length_days = Column(Integer, default=28, nullable=False)
    period_duration_days = Column(Integer, default=5, nullable=False)
    flow_intensity = Column(String(50), default="medium")  # light, medium, heavy, spotting
    pain_level = Column(Integer, default=1)  # 1-10
    symptoms = Column(JSON, default=list)  # ["cramps", "headache", "bloating", ...]
    mood = Column(JSON, default=list)      # ["calm", "happy", "sensitive", ...]
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", backref="menstrual_logs")
