from app.repositories.base import BaseRepository
from app.models.audit import AuditLog

class AuditRepository(BaseRepository[AuditLog]):
    pass  # Inherits all CRUD from base; audit logs are append-only
