import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Date, Text, Time
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base

class Medication(Base):
    __tablename__ = "medications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    generic_name = Column(String(200))
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(100), nullable=False)
    route = Column(String(50), default="oral")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    prescribing_doctor = Column(String(200))
    source_document_id = Column(UUID(as_uuid=True), ForeignKey("medical_documents.id", ondelete="SET NULL"))
    instructions = Column(Text)
    is_active = Column(Boolean, default=True)
    reminders_enabled = Column(Boolean, default=True)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    patient = relationship("Patient", back_populates="medications")
    schedules = relationship("MedicationSchedule", back_populates="medication", cascade="all, delete-orphan")
    adherence_records = relationship("MedicationAdherence", back_populates="medication")

class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medication_id = Column(UUID(as_uuid=True), ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    scheduled_time = Column(Time, nullable=False)
    days_of_week = Column(JSONB, default=["mon","tue","wed","thu","fri","sat","sun"])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    medication = relationship("Medication", back_populates="schedules")

class MedicationAdherence(Base):
    __tablename__ = "medication_adherence"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medication_id = Column(UUID(as_uuid=True), ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("medication_schedules.id", ondelete="SET NULL"))
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    scheduled_datetime = Column(DateTime, nullable=False)
    taken_at = Column(DateTime)
    status = Column(String(20), default="pending")  # taken, missed, skipped, pending
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    medication = relationship("Medication", back_populates="adherence_records")
