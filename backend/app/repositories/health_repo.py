from sqlalchemy import select, desc
from uuid import UUID
from datetime import datetime, timedelta
from app.repositories.base import BaseRepository
from app.models.health import HealthRecord, HealthMetric

class HealthRepository(BaseRepository[HealthRecord]):
    async def get_by_patient_and_metric(self, patient_id: UUID, metric_type: str, limit: int = 90) -> list[HealthRecord]:
        result = await self.session.execute(
            select(HealthRecord)
            .where(HealthRecord.patient_id == patient_id)
            .where(HealthRecord.metric_type == metric_type)
            .order_by(desc(HealthRecord.measurement_date))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_all_by_patient(self, patient_id: UUID, days: int = 90) -> list[HealthRecord]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await self.session.execute(
            select(HealthRecord)
            .where(HealthRecord.patient_id == patient_id)
            .where(HealthRecord.measurement_date >= cutoff)
            .order_by(desc(HealthRecord.measurement_date))
        )
        return list(result.scalars().all())

    async def upsert_metric(self, patient_id: UUID, metric_type: str, **kwargs):
        from sqlalchemy.dialects.postgresql import insert
        # Update health_metrics denormalized table
        existing = await self.session.execute(
            select(HealthMetric).where(
                HealthMetric.patient_id == patient_id,
                HealthMetric.metric_type == metric_type
            )
        )
        metric = existing.scalar_one_or_none()
        if metric:
            for k, v in kwargs.items():
                setattr(metric, k, v)
        else:
            metric = HealthMetric(patient_id=patient_id, metric_type=metric_type, **kwargs)
            self.session.add(metric)
        await self.session.commit()
        return metric
