from uuid import UUID
from datetime import datetime
from app.repositories.health_repo import HealthRepository
from app.services.trend_service import TrendService
from app.services.alert_service import AlertService
from app.utils.logger import get_logger

logger = get_logger(__name__)

class HealthService:
    def __init__(self, health_repo: HealthRepository, trend_service: TrendService, alert_service: AlertService):
        self.repo = health_repo
        self.trend_svc = trend_service
        self.alert_svc = alert_service

    async def add_health_record(self, patient_id: UUID, metric_type: str, value: float, unit: str, measurement_date: datetime, **kwargs):
        record = await self.repo.create(
            patient_id=patient_id,
            metric_type=metric_type,
            value=value,
            unit=unit,
            measurement_date=measurement_date,
            **kwargs
        )
        # Check for anomaly (deterministic)
        anomaly = self.trend_svc.detect_anomaly(value, metric_type)
        if anomaly.severity in ["HIGH", "CRITICAL"]:
            await self.alert_svc.create_health_alert(
                patient_id=patient_id,
                severity=anomaly.severity,
                title=f"Abnormal {metric_type} reading",
                message=anomaly.message,
                metric_type=metric_type,
                metric_value=value,
                source_id=record.id
            )
        # Update denormalized metric
        await self.repo.upsert_metric(patient_id, metric_type,
            latest_value=value, latest_unit=unit, latest_date=measurement_date)
        return record

    async def get_trends(self, patient_id: UUID, metric_type: str) -> dict:
        records = await self.repo.get_by_patient_and_metric(patient_id, metric_type, limit=90)
        if not records:
            return {"metric_type": metric_type, "data_points": 0, "direction": "insufficient_data"}
        values = [float(r.value) for r in reversed(records)]
        timestamps = [r.measurement_date for r in reversed(records)]
        trend = self.trend_svc.calculate_trend(values, timestamps)
        return {
            "metric_type": metric_type,
            "direction": trend.direction.value,
            "latest_value": trend.latest_value,
            "average_value": trend.average_value,
            "min_value": trend.min_value,
            "max_value": trend.max_value,
            "percent_change_30d": trend.percent_change_30d,
            "data_points": trend.data_points,
            "slope": trend.slope,
        }
