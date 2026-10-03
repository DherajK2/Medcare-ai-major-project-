from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class AlertResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    patient_id: UUID
    alert_type: str
    severity: str
    title: str
    message: str
    metric_type: Optional[str]
    metric_value: Optional[float]
    is_read: bool
    is_dismissed: bool
    created_at: datetime

class AlertUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_dismissed: Optional[bool] = None
