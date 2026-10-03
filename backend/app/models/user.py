import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Date, Integer
from sqlalchemy.dialects.postgresql import UUID, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from .base import Base


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False)
    push_tokens = relationship("DevicePushToken", back_populates="user", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"
    id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name = Column(String(200), nullable=False)
    phone = Column(String(30))
    avatar_url = Column(Text)
    timezone = Column(String(50), default="UTC")
    notification_email = Column(Boolean, default=True)
    notification_sms = Column(Boolean, default=False)
    notification_push = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    specialty = Column(String(100))
    hospital = Column(String(200))
    phone = Column(String(30))
    email = Column(String(255))
    address = Column(Text)
    notes = Column(Text)
    is_primary = Column(Boolean, default=False)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="doctors")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    relationship_label = Column("relationship", String(100), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(255))
    notification_preference = Column(PG_ENUM('email', 'sms', 'push', 'in_app', name='notification_channel', create_type=False), default="email")
    priority = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="emergency_contacts")


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="SET NULL"))
    title = Column(String(300), nullable=False)
    appointment_datetime = Column(DateTime, nullable=False)
    location = Column(String(300))
    notes = Column(Text)
    reminder_sent = Column(Boolean, default=False)
    status = Column(String(20), default="scheduled")  # scheduled, completed, cancelled, missed
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="appointments")
