from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    medical_notes: Optional[str] = None
    allergies: Optional[list[str]] = []

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    medical_notes: Optional[str] = None
    allergies: Optional[list[str]] = None

class PatientResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime

class FamilyRelationshipCreate(BaseModel):
    user_id: UUID
    relationship_label: Optional[str] = None
    role: str = "viewer"
    can_view_records: bool = True
    can_manage_medications: bool = False
    can_receive_alerts: bool = True
    is_emergency_contact: bool = False

class FamilyRelationshipResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    user_id: UUID
    patient_id: UUID
    relationship_label: Optional[str]
    role: str
    can_view_records: bool
    can_receive_alerts: bool
    created_at: datetime
