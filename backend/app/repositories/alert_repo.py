from sqlalchemy import select, desc, and_
from uuid import UUID
from datetime import datetime, timedelta
from typing import Optional
from app.repositories.base import BaseRepository
from app.models.alert import Alert

class AlertRepository(BaseRepository[Alert]):
    async def get_by_patient(self, patient_id: UUID, limit: int = 50) -> list[Alert]:
        result = await self.session.execute(
            select(Alert)
            .where(Alert.patient_id == patient_id)
            .where(Alert.is_dismissed == False)
            .order_by(desc(Alert.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def find_recent(self, patient_id: UUID, alert_type: str, metric_type: Optional[str], hours: int = 1) -> Optional[Alert]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        conditions = [
            Alert.patient_id == patient_id,
            Alert.alert_type == alert_type,
            Alert.created_at >= cutoff
        ]
        if metric_type:
            conditions.append(Alert.metric_type == metric_type)
        result = await self.session.execute(select(Alert).where(and_(*conditions)).limit(1))
        return result.scalar_one_or_none()
