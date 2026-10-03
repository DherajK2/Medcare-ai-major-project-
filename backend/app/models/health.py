import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Numeric, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from .base import Base

METRIC_TYPE_ENUM = PG_ENUM(
    'blood_pressure_systolic', 'blood_pressure_diastolic', 'blood_glucose',
    'hba1c', 'hemoglobin', 'cholesterol_total', 'heart_rate',
    'weight', 'temperature', 'oxygen_saturation', 'other',
    name='metric_type', create_type=False
)

class HealthRecord(Base):
    __tablename__ = "health_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    metric_type = Column(METRIC_TYPE_ENUM, nullable=False)
    value = Column(Numeric(10, 4), nullable=False)
    unit = Column(String(50), nullable=False)
    measurement_date = Column(DateTime, nullable=False)
    source_document_id = Column(UUID(as_uuid=True), ForeignKey("medical_documents.id", ondelete="SET NULL"))
    source_page = Column(Integer)
    extraction_method = Column(String(50))  # manual, pdf_extraction, ocr, gemini_extraction
    confidence = Column(Numeric(3, 2))  # 0.00 to 1.00
    reference_range_min = Column(Numeric(10, 4))
    reference_range_max = Column(Numeric(10, 4))
    is_abnormal = Column(Boolean, default=False)
    notes = Column(Text)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="health_records")


class HealthMetric(Base):
    """Denormalized latest metrics per patient per type for fast dashboard queries."""
    __tablename__ = "health_metrics"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    metric_type = Column(METRIC_TYPE_ENUM, nullable=False)
    latest_value = Column(Numeric(10, 4))
    latest_unit = Column(String(50))
    latest_date = Column(DateTime)
    average_30d = Column(Numeric(10, 4))
    trend_direction = Column(String(30))  # increasing, decreasing, stable, insufficient_data
    last_alert_severity = Column(PG_ENUM('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='alert_severity', create_type=False))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="health_metrics")
