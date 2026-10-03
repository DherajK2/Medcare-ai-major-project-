from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from uuid import UUID

class BaseResponse(BaseModel):
    model_config = {"from_attributes": True}

class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int

class MessageResponse(BaseModel):
    message: str

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    environment: str
