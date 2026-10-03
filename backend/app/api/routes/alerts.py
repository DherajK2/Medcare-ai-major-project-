from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID
from typing import Optional
from pydantic import BaseModel
from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_patient_access
from app.models.alert import Alert
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

class AlertCreate(BaseModel):
    patient_id: UUID
    alert_type: str
    severity: str
    title: str
    message: str
    metric_type: Optional[str] = None
    metric_value: Optional[float] = None

@router.get("/{patient_id}")
async def list_alerts(patient_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(Alert)
        .where(Alert.patient_id == patient_id)
        .order_by(desc(Alert.created_at))
    )
    return result.scalars().all()

@router.post("")
@router.post("/")
async def create_alert(data: AlertCreate, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    authorized = await verify_patient_access(current_user.id, data.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    alert = Alert(
        patient_id=data.patient_id,
        alert_type=data.alert_type,
        severity=data.severity,
        title=data.title,
        message=data.message,
        metric_type=data.metric_type,
        metric_value=data.metric_value
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert

@router.patch("/{alert_id}/read")
async def mark_alert_read(alert_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    authorized = await verify_patient_access(current_user.id, alert.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    alert.is_read = True
    await db.commit()
    return alert

@router.patch("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: UUID, current_user=Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    authorized = await verify_patient_access(current_user.id, alert.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    alert.is_dismissed = True
    await db.commit()
    return alert
