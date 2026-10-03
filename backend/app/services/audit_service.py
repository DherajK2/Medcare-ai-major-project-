from uuid import UUID
from typing import Optional
from app.repositories.audit_repo import AuditRepository
from app.utils.logger import get_logger

logger = get_logger(__name__)

class AuditService:
    def __init__(self, repo: AuditRepository):
        self.repo = repo

    async def log(
        self,
        action: str,
        user_id: Optional[UUID] = None,
        patient_id: Optional[UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        details: dict = None,
        ip_address: Optional[str] = None,
        success: bool = True,
    ):
        # Never log sensitive medical data in audit trail
        safe_details = {k: v for k, v in (details or {}).items() if k not in {'medical_notes', 'content', 'extracted_text'}}
        await self.repo.create(
            action=action,
            user_id=user_id,
            patient_id=patient_id,
            resource_type=resource_type,
            resource_id=resource_id,
            details=safe_details,
            ip_address=ip_address,
            success=success,
        )
