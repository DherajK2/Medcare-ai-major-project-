from app.schemas.common import BaseResponse, PaginatedResponse, MessageResponse, HealthCheckResponse
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, FamilyRelationshipCreate, FamilyRelationshipResponse
from app.schemas.health import HealthRecordCreate, HealthRecordResponse, TrendResponse
from app.schemas.medication import MedicationCreate, MedicationResponse, ScheduleCreate
from app.schemas.alert import AlertResponse, AlertUpdate
from app.schemas.conversation import ChatRequest, ChatResponse, ConversationResponse
from app.schemas.safety import SafetyAssessmentRequest, SafetyAssessmentResponse, SafetyEventResponse
