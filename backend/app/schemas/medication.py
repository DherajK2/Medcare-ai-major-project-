from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime
from uuid import UUID

class MedicationCreate(BaseModel):
    patient_id: UUID
    name: str
    generic_name: Optional[str] = None
    dosage: str
    frequency: str
    route: str = "oral"
    start_date: date
    end_date: Optional[date] = None
    prescribing_doctor: Optional[str] = None
    instructions: Optional[str] = None
    reminders_enabled: bool = True

class MedicationResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    patient_id: UUID
    name: str
    dosage: str
    frequency: str
    route: str
    start_date: date
    end_date: Optional[date]
    prescribing_doctor: Optional[str]
    is_active: bool
    reminders_enabled: bool
    created_at: datetime

class ScheduleCreate(BaseModel):
    medication_id: UUID
    scheduled_time: time
    days_of_week: list[str] = ["mon","tue","wed","thu","fri","sat","sun"]

class BatchMedicationItem(BaseModel):
    name: str
    generic_name: Optional[str] = None
    dosage: Optional[str] = "Standard"
    frequency: Optional[str] = "Once daily"
    route: Optional[str] = "oral"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    prescribing_doctor: Optional[str] = None
    instructions: Optional[str] = None
    source_document_id: Optional[UUID] = None

class BatchMedicationsRequest(BaseModel):
    patient_id: UUID
    medications: list[BatchMedicationItem]

