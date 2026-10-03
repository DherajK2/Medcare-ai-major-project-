from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ChatRequest(BaseModel):
    message: str
    patient_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None
    conversation_history: Optional[list[dict]] = None

class ChatResponse(BaseModel):
    answer: str
    sources: list[dict] = []
    intent: str = "general_chat"
    conversation_id: UUID
    is_safety_response: bool = False
    safety_severity: Optional[str] = None
    should_suggest_911: bool = False
    should_notify_family: bool = False
    target_phone: Optional[str] = None

class ConversationResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    user_id: UUID
    patient_id: Optional[UUID]
    title: Optional[str]
    created_at: datetime

class MessageResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    role: str
    content: str
    sources: list
    is_safety_response: bool
    created_at: datetime
