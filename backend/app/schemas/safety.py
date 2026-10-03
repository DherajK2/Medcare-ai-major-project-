from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class SafetyAssessmentRequest(BaseModel):
    message: str
    patient_id: Optional[UUID] = None

class SafetyAssessmentResponse(BaseModel):
    severity: str
    requires_immediate_action: bool
    should_notify_family: bool
    should_suggest_911: bool
    calm_response: str
    is_safety_message: bool

class SafetyEventResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    patient_id: UUID
    severity: str
    description: Optional[str]
    family_notified: bool
    emergency_services_suggested: bool
    resolved: bool
    created_at: datetime
