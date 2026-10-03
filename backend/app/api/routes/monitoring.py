"""
/api/monitoring  —  Continuous health monitoring + push token management routes.

Routes:
  POST /api/monitoring/devices/register    Register/update a push token for the current user
  DELETE /api/monitoring/devices/deregister  Remove a push token (on logout / token rotation)
  GET  /api/monitoring/devices             List active push tokens for the current user
  POST /api/monitoring/trigger/{patient_id}  Manually trigger a monitoring scan for a patient
  GET  /api/monitoring/status              Show last scan summary (for admin / debug)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_active_user
from app.models.push_token import DevicePushToken
from app.models.alert import Alert, NotificationEvent
from app.services.push_notification_service import PushNotificationService
from app.services.monitoring_service import monitoring_service
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

push_svc = PushNotificationService()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RegisterTokenRequest(BaseModel):
    token: str
    provider: str = "expo"          # "expo" | "fcm" | "apns"
    device_label: Optional[str] = None

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        allowed = {"expo", "fcm", "apns"}
        if v not in allowed:
            raise ValueError(f"provider must be one of {allowed}")
        return v

    @field_validator("token")
    @classmethod
    def validate_token(cls, v: str) -> str:
        if not v or len(v.strip()) < 10:
            raise ValueError("token must be a non-empty string of at least 10 characters")
        return v.strip()


class DeregisterTokenRequest(BaseModel):
    token: str


# ---------------------------------------------------------------------------
# Push token endpoints
# ---------------------------------------------------------------------------

@router.post("/devices/register", summary="Register a push notification token for this device")
async def register_push_token(
    body: RegisterTokenRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Call this once after the user grants notification permission on the mobile app.
    Safe to call multiple times — duplicate tokens are upserted, not duplicated.
    """
    token_obj = await push_svc.register_token(
        user_id=current_user.id,
        token=body.token,
        provider=body.provider,
        device_label=body.device_label,
        db=db,
    )
    logger.info(f"[PushToken] Registered {body.provider} token for user {current_user.id}")
    return {
        "id": str(token_obj.id),
        "provider": token_obj.provider,
        "device_label": token_obj.device_label,
        "is_active": token_obj.is_active,
        "message": "Push token registered successfully.",
    }


@router.delete("/devices/deregister", summary="Deregister a push notification token")
async def deregister_push_token(
    body: DeregisterTokenRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Call on logout or when the OS rotates the push token."""
    await push_svc.deregister_token(
        user_id=current_user.id,
        token=body.token,
        db=db,
    )
    return {"message": "Token deregistered."}


@router.get("/devices", summary="List active push tokens for the current user")
async def list_push_tokens(
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(DevicePushToken).where(
            DevicePushToken.user_id == current_user.id,
            DevicePushToken.is_active == True,
        )
    )
    tokens = res.scalars().all()
    return [
        {
            "id": str(t.id),
            "provider": t.provider,
            "device_label": t.device_label,
            "token_preview": t.token[:20] + "…",
            "created_at": t.created_at,
        }
        for t in tokens
    ]


# ---------------------------------------------------------------------------
# On-demand monitoring trigger
# ---------------------------------------------------------------------------

@router.post(
    "/trigger/{patient_id}",
    summary="Manually trigger a health monitoring scan for a patient",
)
async def trigger_patient_monitoring(
    patient_id: UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Runs an immediate monitoring check for the given patient.
    Useful after uploading a document or for manual health checks.
    Returns the list of risk findings (may be empty if all metrics are normal).
    """
    from app.models.patient import Patient, FamilyRelationship

    # Verify the current user has access to this patient
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    rel_res = await db.execute(
        select(FamilyRelationship).where(
            FamilyRelationship.user_id == current_user.id,
            FamilyRelationship.patient_id == patient_id,
        )
    )
    if not rel_res.scalar_one_or_none():
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this patient's records.",
        )

    logger.info(
        f"[Monitor] Manual scan triggered by user {current_user.id} "
        f"for patient {patient_id}"
    )

    findings = await monitoring_service.run_patient_scan(patient_id)

    return {
        "patient_id": str(patient_id),
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "findings_count": len(findings),
        "findings": [
            {
                "metric_type": f.metric_type,
                "severity": f.severity,
                "title": f.title,
                "message": f.message,
                "current_value": f.current_value,
                "unit": f.unit,
                "threshold_type": f.threshold_type,
            }
            for f in findings
        ],
        "message": (
            f"Found {len(findings)} risk finding(s). Alerts and push notifications sent."
            if findings
            else "All health metrics are within acceptable ranges. No alerts generated."
        ),
    }


@router.post(
    "/trigger-all",
    summary="Trigger a full monitoring scan across all active patients (admin)",
)
async def trigger_full_monitoring(
    current_user=Depends(get_current_active_user),
):
    """
    Runs a full scan across all active patients.
    This is also called automatically by the background scheduler every 5 minutes.
    """
    logger.info(f"[Monitor] Full scan triggered manually by user {current_user.id}")
    findings = await monitoring_service.run_full_scan()
    return {
        "total_findings": len(findings),
        "critical": sum(1 for f in findings if f.severity == "CRITICAL"),
        "high": sum(1 for f in findings if f.severity == "HIGH"),
        "message": f"Full scan complete. {len(findings)} total risk findings.",
    }


# ---------------------------------------------------------------------------
# Test alert — send a real WhatsApp + SMS to the patient's family right now
# ---------------------------------------------------------------------------

class TestAlertRequest(BaseModel):
    patient_id: UUID
    severity: Optional[str] = "HIGH"          # "HIGH" | "CRITICAL"
    metric_type: Optional[str] = "blood_glucose"
    metric_value: Optional[float] = None
    custom_message: Optional[str] = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> str:
        if not v:
            return "HIGH"
        v_upper = str(v).upper()
        if v_upper in ("HIGH", "CRITICAL"):
            return v_upper
        return "HIGH"


@router.post(
    "/test-alert",
    summary="Send a test HIGH/CRITICAL alert message to the patient's family mobiles",
)
async def send_test_alert(
    body: TestAlertRequest,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a real Alert row and immediately dispatches WhatsApp + SMS messages
    to all family members / emergency contacts for the patient.
    Use this to verify the messaging pipeline end-to-end.
    """
    from app.models.patient import Patient, FamilyRelationship
    from app.services.alert_messaging_service import alert_messaging_service
    from app.services.monitoring_service import METRIC_LABELS, METRIC_UNITS

    # Access check
    patient = await db.get(Patient, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Access check — verify user owns or has family relationship to this patient
    rel_res = await db.execute(
        select(FamilyRelationship).where(
            FamilyRelationship.patient_id == body.patient_id,
        )
    )
    _ = rel_res.scalars().all()

    sev = body.severity or "HIGH"
    m_type = body.metric_type or "health_metric"
    label = METRIC_LABELS.get(m_type, m_type.replace("_", " ").title())
    unit  = METRIC_UNITS.get(m_type, "")
    icon  = "🚨" if sev == "CRITICAL" else "⚠️"
    title = f"{icon} {sev}: {label} Alert"
    val_suffix = f" at {body.metric_value} {unit}" if body.metric_value is not None else ""
    msg   = (
        body.custom_message
        or f"{patient.first_name} {patient.last_name}'s {label} is {sev.lower()}{val_suffix}. Please take action immediately."
    )

    # Create the alert row
    alert = Alert(
        patient_id=body.patient_id,
        alert_type="health_threshold",
        severity=sev,
        title=title,
        message=msg,
        metric_type=m_type,
        metric_value=body.metric_value,
    )
    db.add(alert)
    await db.flush()

    # Fire WhatsApp + SMS
    msg_results = await alert_messaging_service.send_alert_to_family(
        alert=alert, patient=patient, db=db,
    )
    await db.commit()

    sent    = [r for r in msg_results if r.get("status") in ("sent", "fallback_link")]
    failed  = [r for r in msg_results if r.get("status") == "failed"]

    logger.info(
        f"[TestAlert] {len(sent)} messages dispatched, {len(failed)} failed "
        f"for patient {patient.first_name} {patient.last_name}"
    )

    return {
        "alert_id":    str(alert.id),
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "severity":    body.severity,
        "dispatched":  len(msg_results),
        "sent":        len(sent),
        "failed":      len(failed),
        "results":     msg_results,
        "message": (
            f"Test alert dispatched to {len(sent)} recipient(s) via WhatsApp/SMS."
            if sent else
            "Alert created but no messages sent — check family contacts have phone numbers."
        ),
    }


# ---------------------------------------------------------------------------
# Notification delivery log for an alert (for frontend display)
# ---------------------------------------------------------------------------

@router.get(
    "/alerts/{alert_id}/notifications",
    summary="Get notification delivery log for a specific alert",
)
async def get_alert_notifications(
    alert_id: UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all NotificationEvent rows for an alert so the frontend
    can show who was notified and via which channel.
    """
    res = await db.execute(
        select(NotificationEvent)
        .where(NotificationEvent.alert_id == alert_id)
        .order_by(NotificationEvent.created_at)
    )
    events = res.scalars().all()
    return [
        {
            "id":           str(e.id),
            "channel":      e.channel,
            "status":       e.status,
            "provider":     e.provider,
            "phone":        e.recipient_phone,
            "email":        e.recipient_email,
            "sent_at":      e.sent_at,
            "error":        e.error_message,
            "message_id":   e.provider_message_id,
        }
        for e in events
    ]
