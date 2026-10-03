import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Enum, Text, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
import enum
from .base import Base


class RelationshipRole(str, enum.Enum):
    OWNER = "owner"
    CAREGIVER = "caregiver"
    VIEWER = "viewer"
    DOCTOR = "doctor"


class Patient(Base):
    __tablename__ = "patients"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date)
    gender = Column(String(20))
    blood_type = Column(String(10))
    phone = Column(String(30))
    address = Column(Text)
    medical_notes = Column(Text)
    allergies = Column(JSONB, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    family_relationships = relationship("FamilyRelationship", back_populates="patient", cascade="all, delete-orphan")
    health_records = relationship("HealthRecord", back_populates="patient", cascade="all, delete-orphan")
    health_metrics = relationship("HealthMetric", back_populates="patient", cascade="all, delete-orphan")
    medical_documents = relationship("MedicalDocument", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")
    safety_events = relationship("SafetyEvent", back_populates="patient", cascade="all, delete-orphan")
    emergency_contacts = relationship("EmergencyContact", back_populates="patient", cascade="all, delete-orphan")
    doctors = relationship("Doctor", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")


class FamilyRelationship(Base):
    __tablename__ = "family_relationships"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    relationship_label = Column(String(50))
    role = Column(PG_ENUM('owner', 'caregiver', 'viewer', 'doctor', name='relationship_role', create_type=False, values_callable=lambda obj: [e.value if hasattr(e, 'value') else str(e) for e in obj]), nullable=False, default='viewer')
    can_view_records = Column(Boolean, default=True)
    can_manage_medications = Column(Boolean, default=False)
    can_receive_alerts = Column(Boolean, default=True)
    is_emergency_contact = Column(Boolean, default=False)
    authorized_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="family_relationships")
