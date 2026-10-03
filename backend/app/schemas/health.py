from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from uuid import UUID

class HealthRecordCreate(BaseModel):
    patient_id: UUID
    metric_type: str
    value: float
    unit: str
    measurement_date: datetime
    notes: Optional[str] = None
    source_document_id: Optional[UUID] = None

class HealthRecordResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    patient_id: UUID
    metric_type: str
    value: float
    unit: str
    measurement_date: datetime
    is_abnormal: bool
    notes: Optional[str]
    source_document_id: Optional[UUID]
    created_at: datetime

class TrendResponse(BaseModel):
    metric_type: str
    direction: str
    latest_value: float
    average_value: float
    min_value: float
    max_value: float
    percent_change_30d: Optional[float]
    data_points: int
    slope: float
