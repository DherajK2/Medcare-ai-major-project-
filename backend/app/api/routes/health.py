from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_patient_access
from app.repositories.health_repo import HealthRepository
from app.repositories.alert_repo import AlertRepository
from app.services.health_service import HealthService
from app.services.trend_service import TrendService
from app.services.alert_service import AlertService
from app.schemas.health import HealthRecordCreate
from app.models.health import HealthRecord

router = APIRouter()

@router.post("/records")
async def add_health_record(data: HealthRecordCreate, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, data.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    health_repo = HealthRepository(HealthRecord, db)
    alert_repo = AlertRepository(None, db)
    from app.models.alert import Alert
    alert_repo.model = Alert
    alert_svc = AlertService(alert_repo)
    trend_svc = TrendService()
    health_svc = HealthService(health_repo, trend_svc, alert_svc)
    return await health_svc.add_health_record(
        patient_id=data.patient_id,
        metric_type=data.metric_type,
        value=data.value,
        unit=data.unit,
        measurement_date=data.measurement_date,
        notes=data.notes,
        source_document_id=data.source_document_id,
        recorded_by=current_user.id,
    )

@router.get("/records/{patient_id}")
async def get_health_records(patient_id: UUID, metric_type: str = None, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    health_repo = HealthRepository(HealthRecord, db)
    if metric_type:
        return await health_repo.get_by_patient_and_metric(patient_id, metric_type)
    return await health_repo.get_all_by_patient(patient_id)

@router.get("/trends/{patient_id}/{metric_type}")
async def get_health_trends(patient_id: UUID, metric_type: str, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    health_repo = HealthRepository(HealthRecord, db)
    alert_repo = AlertRepository(None, db)
    from app.models.alert import Alert
    alert_repo.model = Alert
    alert_svc = AlertService(alert_repo)
    trend_svc = TrendService()
    health_svc = HealthService(health_repo, trend_svc, alert_svc)
    return await health_svc.get_trends(patient_id, metric_type)
