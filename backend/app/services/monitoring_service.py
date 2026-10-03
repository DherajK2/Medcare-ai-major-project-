"""
MonitoringService — Continuous patient health risk evaluator.

Every cycle it:
1. Loads all active patients with their latest health_metrics (from the denormalized table).
2. Compares each metric against hard clinical thresholds AND against the patient-specific
   baseline extracted from their uploaded medical reports (stored in extracted_data JSONB).
3. Evaluates dangerous trends (3 consecutive HIGH readings, rapid worsening).
4. Creates Alert rows for HIGH / CRITICAL findings (with 4-hour dedup).
5. Fires push notifications via PushNotificationService.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AsyncSessionLocal
from app.models.health import HealthMetric, HealthRecord
from app.models.patient import Patient, FamilyRelationship
from app.models.alert import Alert
from app.services.trend_service import TrendService, HEALTH_THRESHOLDS
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Clinical risk rules
# ---------------------------------------------------------------------------

# Metric display names for readable alert messages
METRIC_LABELS = {
    "blood_pressure_systolic":  "Blood Pressure (Systolic)",
    "blood_pressure_diastolic": "Blood Pressure (Diastolic)",
    "blood_glucose":            "Blood Glucose",
    "hba1c":                    "HbA1c",
    "hemoglobin":               "Hemoglobin",
    "cholesterol_total":        "Total Cholesterol",
    "heart_rate":               "Heart Rate",
    "temperature":              "Body Temperature",
    "oxygen_saturation":        "Oxygen Saturation (SpO₂)",
    "weight":                   "Body Weight",
}

# Units shown in alert messages
METRIC_UNITS = {
    "blood_pressure_systolic":  "mmHg",
    "blood_pressure_diastolic": "mmHg",
    "blood_glucose":            "mg/dL",
    "hba1c":                    "%",
    "hemoglobin":               "g/dL",
    "cholesterol_total":        "mg/dL",
    "heart_rate":               "bpm",
    "temperature":              "°C",
    "oxygen_saturation":        "%",
    "weight":                   "kg",
}

# How many hours to wait before re-alerting the same patient/metric combination
ALERT_DEDUP_HOURS = 4


@dataclass
class RiskFinding:
    patient_id: UUID
    patient_name: str
    metric_type: str
    current_value: float
    unit: str
    severity: str          # "HIGH" | "CRITICAL"
    title: str
    message: str
    threshold_type: str    # "absolute" | "baseline" | "trend" | "sudden_change"
    threshold_value: Optional[float] = None


class MonitoringService:
    """
    Standalone monitoring engine that can be called from the scheduler
    or triggered on demand after a document upload.
    """

    def __init__(self):
        self.trend_svc = TrendService()

    # ------------------------------------------------------------------
    # Public entry points
    # ------------------------------------------------------------------

    async def run_full_scan(self) -> list[RiskFinding]:
        """Scan ALL active patients and return every risk finding."""
        findings: list[RiskFinding] = []
        async with AsyncSessionLocal() as db:
            patients = await self._get_active_patients(db)
            logger.info(f"[Monitor] Starting full scan — {len(patients)} active patients")
            for patient in patients:
                try:
                    patient_findings = await self._evaluate_patient(patient, db)
                    findings.extend(patient_findings)
                    if patient_findings:
                        await self._persist_alerts(patient_findings, db)
                except Exception as exc:
                    logger.error(f"[Monitor] Error evaluating patient {patient.id}: {exc}")
            logger.info(f"[Monitor] Scan complete — {len(findings)} risk findings")
        return findings

    async def run_patient_scan(self, patient_id: UUID) -> list[RiskFinding]:
        """Scan a single patient (used after document upload or manual trigger)."""
        findings: list[RiskFinding] = []
        async with AsyncSessionLocal() as db:
            patient = await db.get(Patient, patient_id)
            if not patient or not patient.is_active:
                return findings
            try:
                findings = await self._evaluate_patient(patient, db)
                if findings:
                    await self._persist_alerts(findings, db)
            except Exception as exc:
                logger.error(f"[Monitor] Error evaluating patient {patient_id}: {exc}")
        return findings

    # ------------------------------------------------------------------
    # Core evaluation logic
    # ------------------------------------------------------------------

    async def _evaluate_patient(self, patient: Patient, db: AsyncSession) -> list[RiskFinding]:
        findings: list[RiskFinding] = []
        patient_name = f"{patient.first_name} {patient.last_name}"

        # 1. Fetch all latest denormalized metrics
        metrics_res = await db.execute(
            select(HealthMetric).where(HealthMetric.patient_id == patient.id)
        )
        metrics: list[HealthMetric] = list(metrics_res.scalars().all())

        if not metrics:
            logger.debug(f"[Monitor] No metrics for patient {patient.id} — skipping")
            return findings

        # 2. Extract patient-specific baselines from medical reports (if available)
        baselines = await self._extract_patient_baselines(patient.id, db)

        for metric in metrics:
            if metric.latest_value is None:
                continue

            value = float(metric.latest_value)
            metric_type = metric.metric_type
            unit = METRIC_UNITS.get(metric_type, "")
            label = METRIC_LABELS.get(metric_type, metric_type.replace("_", " ").title())

            # --- Rule 1: Absolute clinical thresholds ---
            finding = self._check_absolute_threshold(
                patient_id=patient.id,
                patient_name=patient_name,
                metric_type=metric_type,
                value=value,
                unit=unit,
                label=label,
            )
            if finding:
                findings.append(finding)
                continue  # don't double-alert the same metric

            # --- Rule 2: Patient-specific baseline deviation ---
            if metric_type in baselines:
                finding = self._check_baseline_deviation(
                    patient_id=patient.id,
                    patient_name=patient_name,
                    metric_type=metric_type,
                    value=value,
                    unit=unit,
                    label=label,
                    baseline=baselines[metric_type],
                )
                if finding:
                    findings.append(finding)
                    continue

            # --- Rule 3: Dangerous trend (3 recent readings all abnormal) ---
            trend_finding = await self._check_trend_risk(
                patient_id=patient.id,
                patient_name=patient_name,
                metric_type=metric_type,
                unit=unit,
                label=label,
                db=db,
            )
            if trend_finding:
                findings.append(trend_finding)

        return findings

    # ------------------------------------------------------------------
    # Rule implementations
    # ------------------------------------------------------------------

    def _check_absolute_threshold(
        self,
        patient_id: UUID,
        patient_name: str,
        metric_type: str,
        value: float,
        unit: str,
        label: str,
    ) -> Optional[RiskFinding]:
        thresholds = HEALTH_THRESHOLDS.get(metric_type)
        if not thresholds:
            return None

        # CRITICAL checks first
        if thresholds.get("critical_high") and value >= thresholds["critical_high"]:
            return RiskFinding(
                patient_id=patient_id,
                patient_name=patient_name,
                metric_type=metric_type,
                current_value=value,
                unit=unit,
                severity="CRITICAL",
                title=f"🚨 CRITICAL: {label} Dangerously High",
                message=(
                    f"{patient_name}'s {label} is critically high at {value} {unit} "
                    f"(threshold ≥ {thresholds['critical_high']} {unit}). "
                    "Seek emergency medical attention immediately."
                ),
                threshold_type="absolute",
                threshold_value=thresholds["critical_high"],
            )

        if thresholds.get("critical_low") and value <= thresholds["critical_low"]:
            return RiskFinding(
                patient_id=patient_id,
                patient_name=patient_name,
                metric_type=metric_type,
                current_value=value,
                unit=unit,
                severity="CRITICAL",
                title=f"🚨 CRITICAL: {label} Dangerously Low",
                message=(
                    f"{patient_name}'s {label} is critically low at {value} {unit} "
                    f"(threshold ≤ {thresholds['critical_low']} {unit}). "
                    "Seek emergency medical attention immediately."
                ),
                threshold_type="absolute",
                threshold_value=thresholds["critical_low"],
            )

        # HIGH checks
        if thresholds.get("high") and value >= thresholds["high"]:
            return RiskFinding(
                patient_id=patient_id,
                patient_name=patient_name,
                metric_type=metric_type,
                current_value=value,
                unit=unit,
                severity="HIGH",
                title=f"⚠️ High Alert: {label} Above Normal",
                message=(
                    f"{patient_name}'s {label} reading of {value} {unit} is above the safe range "
                    f"(≥ {thresholds['high']} {unit}). Medical review recommended."
                ),
                threshold_type="absolute",
                threshold_value=thresholds["high"],
            )

        if thresholds.get("low") and value <= thresholds["low"]:
            return RiskFinding(
                patient_id=patient_id,
                patient_name=patient_name,
                metric_type=metric_type,
                current_value=value,
                unit=unit,
                severity="HIGH",
                title=f"⚠️ High Alert: {label} Below Normal",
                message=(
                    f"{patient_name}'s {label} reading of {value} {unit} is below the safe range "
                    f"(≤ {thresholds['low']} {unit}). Medical review recommended."
                ),
                threshold_type="absolute",
                threshold_value=thresholds["low"],
            )

        return None

    def _check_baseline_deviation(
        self,
        patient_id: UUID,
        patient_name: str,
        metric_type: str,
        value: float,
        unit: str,
        label: str,
        baseline: dict,
    ) -> Optional[RiskFinding]:
        """
        Alert if the current value deviates > 30% from the patient's personal baseline
        (extracted from their uploaded medical reports).
        """
        baseline_value = baseline.get("value")
        if not baseline_value or baseline_value == 0:
            return None

        deviation_pct = abs((value - baseline_value) / baseline_value) * 100

        # Use tighter bounds from report reference ranges if available
        ref_min = baseline.get("reference_min")
        ref_max = baseline.get("reference_max")
        if ref_min is not None and value < ref_min:
            severity = "CRITICAL" if deviation_pct > 40 else "HIGH"
            return RiskFinding(
                patient_id=patient_id,
                patient_name=patient_name,
                metric_type=metric_type,
                current_value=value,
                unit=unit,
                severity=severity,
                title=f"{'🚨 CRITICAL' if severity == 'CRITICAL' else '⚠️ HIGH'}: {label} Below Patient's Normal Range",
                message=(
                    f"{patient_name}'s {label} is {value} {unit}, "
                    f"below their personal reference range ({ref_min}–{ref_max} {unit}) "
                    f"from their medical report. Deviation: {deviation_pct:.1f}%."
                ),
                threshold_type="baseline",
                threshold_value=ref_min,
            )

        if ref_max is not None and value > ref_max:
            severity = "CRITICAL" if deviation_pct > 40 else "HIGH"
            return RiskFinding(
                patient_id=patient_id,
                patient_name=patient_name,
                metric_type=metric_type,
                current_value=value,
                unit=unit,
                severity=severity,
                title=f"{'🚨 CRITICAL' if severity == 'CRITICAL' else '⚠️ HIGH'}: {label} Exceeds Patient's Normal Range",
                message=(
                    f"{patient_name}'s {label} is {value} {unit}, "
                    f"above their personal reference range ({ref_min}–{ref_max} {unit}) "
                    f"from their medical report. Deviation: {deviation_pct:.1f}%."
                ),
                threshold_type="baseline",
                threshold_value=ref_max,
            )

        # Fallback: 30% deviation from baseline value even without ref ranges
        if deviation_pct >= 30:
            severity = "CRITICAL" if deviation_pct >= 50 else "HIGH"
            direction = "higher" if value > baseline_value else "lower"
            return RiskFinding(
                patient_id=patient_id,
                patient_name=patient_name,
                metric_type=metric_type,
                current_value=value,
                unit=unit,
                severity=severity,
                title=f"{'🚨 CRITICAL' if severity == 'CRITICAL' else '⚠️ HIGH'}: {label} Significantly Changed",
                message=(
                    f"{patient_name}'s {label} is {deviation_pct:.1f}% {direction} "
                    f"than their baseline of {baseline_value} {unit} from their medical report."
                ),
                threshold_type="baseline",
                threshold_value=baseline_value,
            )

        return None

    async def _check_trend_risk(
        self,
        patient_id: UUID,
        patient_name: str,
        metric_type: str,
        unit: str,
        label: str,
        db: AsyncSession,
    ) -> Optional[RiskFinding]:
        """
        Flag if the last 3 recorded values are ALL abnormal according to clinical thresholds
        (persistent high/low pattern, not a one-off spike).
        """
        cutoff = datetime.utcnow() - timedelta(days=14)
        res = await db.execute(
            select(HealthRecord)
            .where(
                HealthRecord.patient_id == patient_id,
                HealthRecord.metric_type == metric_type,
                HealthRecord.measurement_date >= cutoff,
            )
            .order_by(HealthRecord.measurement_date.desc())
            .limit(5)
        )
        recent_records = list(res.scalars().all())

        if len(recent_records) < 3:
            return None

        # Check if last 3 are all abnormal
        anomalies = [
            self.trend_svc.detect_anomaly(float(r.value), metric_type)
            for r in recent_records[:3]
        ]
        all_abnormal = all(a.severity in ("HIGH", "CRITICAL") for a in anomalies)
        if not all_abnormal:
            return None

        values = [float(r.value) for r in reversed(recent_records[:3])]
        sudden = self.trend_svc.detect_sudden_change(values)
        severity = sudden.severity if sudden else "HIGH"

        return RiskFinding(
            patient_id=patient_id,
            patient_name=patient_name,
            metric_type=metric_type,
            current_value=values[-1],
            unit=unit,
            severity=severity,
            title=f"{'🚨 CRITICAL' if severity == 'CRITICAL' else '⚠️ HIGH'}: Persistent Abnormal {label} Trend",
            message=(
                f"{patient_name}'s {label} has been persistently abnormal across "
                f"the last 3 readings: {', '.join(str(v) for v in values)} {unit}. "
                "Consult a doctor urgently."
            ),
            threshold_type="trend",
        )

    # ------------------------------------------------------------------
    # Baseline extraction from uploaded reports
    # ------------------------------------------------------------------

    async def _extract_patient_baselines(
        self, patient_id: UUID, db: AsyncSession
    ) -> dict[str, dict]:
        """
        Pull reference ranges and baseline values from the extracted_data JSONB of
        the patient's most recent completed medical documents.
        Returns dict keyed by metric_type with {"value", "reference_min", "reference_max"}.
        """
        from app.models.document import MedicalDocument, ProcessingStatus

        res = await db.execute(
            select(MedicalDocument)
            .where(
                MedicalDocument.patient_id == patient_id,
                MedicalDocument.processing_status == "completed",
                MedicalDocument.extracted_data.isnot(None),
            )
            .order_by(MedicalDocument.created_at.desc())
            .limit(5)
        )
        documents = list(res.scalars().all())

        baselines: dict[str, dict] = {}
        metric_map = {
            # Gemini extraction keys → our metric_type keys
            "blood_glucose":            "blood_glucose",
            "glucose":                  "blood_glucose",
            "hba1c":                    "hba1c",
            "hemoglobin":               "hemoglobin",
            "hb":                       "hemoglobin",
            "cholesterol":              "cholesterol_total",
            "total_cholesterol":        "cholesterol_total",
            "systolic":                 "blood_pressure_systolic",
            "bp_systolic":              "blood_pressure_systolic",
            "diastolic":                "blood_pressure_diastolic",
            "bp_diastolic":             "blood_pressure_diastolic",
            "heart_rate":               "heart_rate",
            "pulse":                    "heart_rate",
            "temperature":              "temperature",
            "oxygen_saturation":        "oxygen_saturation",
            "spo2":                     "oxygen_saturation",
            "weight":                   "weight",
        }

        for doc in documents:
            data = doc.extracted_data or {}
            vitals = data.get("vitals", {})
            lab_results = data.get("lab_results", [])

            # Parse vitals dict OR list
            if isinstance(vitals, dict):
                vitals_items = vitals.items()
            elif isinstance(vitals, list):
                # Some docs store vitals as a list of {name, value, unit} dicts
                vitals_items = []
                for v in vitals:
                    if isinstance(v, dict) and "metric_type" in v:
                        vitals_items.append((v["metric_type"], v.get("value")))
                    elif isinstance(v, dict) and "name" in v:
                        vitals_items.append((v["name"], v.get("value")))
            else:
                vitals_items = []

            for key, val in vitals_items:
                normalized_key = key.lower().replace(" ", "_")
                metric_type = metric_map.get(normalized_key)
                if not metric_type or metric_type in baselines:
                    continue
                if isinstance(val, (int, float)):
                    baselines[metric_type] = {"value": float(val)}
                elif isinstance(val, dict):
                    entry: dict = {}
                    if "value" in val:
                        entry["value"] = float(val["value"])
                    if "reference_min" in val:
                        entry["reference_min"] = float(val["reference_min"])
                    if "reference_max" in val:
                        entry["reference_max"] = float(val["reference_max"])
                    if entry:
                        baselines[metric_type] = entry

            # Parse lab_results list
            for lab in lab_results:
                if not isinstance(lab, dict):
                    continue
                name = lab.get("name", "").lower().replace(" ", "_")
                metric_type = metric_map.get(name)
                if not metric_type or metric_type in baselines:
                    continue
                entry = {}
                if "value" in lab:
                    try:
                        entry["value"] = float(str(lab["value"]).split()[0])
                    except (ValueError, TypeError):
                        pass
                if "reference_range" in lab:
                    rng = lab["reference_range"]
                    if isinstance(rng, str) and "–" in rng:
                        parts = rng.split("–")
                        try:
                            entry["reference_min"] = float(parts[0].strip())
                            entry["reference_max"] = float(parts[1].strip().split()[0])
                        except (ValueError, IndexError):
                            pass
                if entry:
                    baselines[metric_type] = entry

        return baselines

    # ------------------------------------------------------------------
    # Persist alerts + fire push notifications
    # ------------------------------------------------------------------

    async def _persist_alerts(self, findings: list[RiskFinding], db: AsyncSession):
        """
        For each finding:
        - Deduplicate against existing HIGH/CRITICAL alerts in last ALERT_DEDUP_HOURS
        - Create Alert rows in database
        - Group newly created alerts by patient and send ONE composite/consolidated notification
          (WhatsApp, SMS, Email, Push) to prevent notification flooding.
        """
        from app.services.push_notification_service import PushNotificationService
        from app.services.alert_messaging_service import alert_messaging_service as msg_svc
        push_svc = PushNotificationService()

        new_alerts: list[Alert] = []
        patient_obj = None

        for finding in findings:
            # Dedup check
            cutoff = datetime.utcnow() - timedelta(hours=ALERT_DEDUP_HOURS)
            existing = await db.execute(
                select(Alert).where(
                    Alert.patient_id == finding.patient_id,
                    Alert.metric_type == finding.metric_type,
                    Alert.severity.in_(["HIGH", "CRITICAL"]),
                    Alert.created_at >= cutoff,
                ).limit(1)
            )
            if existing.scalar_one_or_none():
                logger.debug(
                    f"[Monitor] Skipping duplicate alert for {finding.patient_name} "
                    f"/ {finding.metric_type} within {ALERT_DEDUP_HOURS}h window"
                )
                continue

            if patient_obj is None:
                patient_obj = await db.get(Patient, finding.patient_id)

            # Create alert row
            alert = Alert(
                patient_id=finding.patient_id,
                alert_type="health_threshold",
                severity=finding.severity,
                title=finding.title,
                message=finding.message,
                metric_type=finding.metric_type,
                metric_value=finding.current_value,
            )
            db.add(alert)
            await db.flush()
            new_alerts.append(alert)

            logger.info(
                f"[Monitor] 🔔 {finding.severity} alert created — "
                f"{finding.patient_name} / {finding.metric_type} = {finding.current_value}"
            )

        if not new_alerts:
            return

        # Sort so CRITICAL is prioritized as primary alert
        new_alerts.sort(key=lambda a: 0 if a.severity == "CRITICAL" else 1)
        primary_alert = new_alerts[0]

        # If multiple alerts exist, consolidate messages into the primary alert for dispatch
        if len(new_alerts) > 1 and patient_obj:
            combined_titles = " & ".join([a.title.replace("🚨 CRITICAL: ", "").replace("⚠️ High Alert: ", "").replace("⚠️ HIGH: ", "") for a in new_alerts])
            consolidated_alert = Alert(
                id=primary_alert.id,
                patient_id=primary_alert.patient_id,
                alert_type="health_threshold",
                severity=primary_alert.severity,
                title=f"🚨 Multiple Clinical Alerts: {combined_titles}" if primary_alert.severity == "CRITICAL" else f"⚠️ Multiple Health Alerts: {combined_titles}",
                message="\n".join([f"• {a.title}: {a.message}" for a in new_alerts]),
                metric_type="multiple_vitals",
                metric_value=primary_alert.metric_value,
            )
            dispatch_alert = consolidated_alert
        else:
            dispatch_alert = primary_alert

        # ── 1. Consolidated WhatsApp + SMS + Email to family mobiles ──────
        if patient_obj:
            try:
                msg_results = await msg_svc.send_alert_to_family(
                    alert=dispatch_alert,
                    patient=patient_obj,
                    db=db,
                )
                sent = sum(1 for r in msg_results if r.get("status") == "sent")
                logger.info(
                    f"[Monitor] 📱 Consolidated mobile messages sent: {sent}/{len(msg_results)} "
                    f"for {patient_obj.first_name} ({len(new_alerts)} findings batched)"
                )
            except Exception as exc:
                logger.error(f"[Monitor] AlertMessaging error: {exc}")

        # ── 2. Push notifications to registered app devices ──────────
        fam_res = await db.execute(
            select(FamilyRelationship).where(
                FamilyRelationship.patient_id == primary_alert.patient_id,
                FamilyRelationship.can_receive_alerts == True,
            )
        )
        family_rels = list(fam_res.scalars().all())
        user_ids = [rel.user_id for rel in family_rels]
        await push_svc.send_health_alert(
            user_ids=user_ids,
            alert=dispatch_alert,
            db=db,
        )

        await db.commit()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _get_active_patients(self, db: AsyncSession) -> list[Patient]:
        res = await db.execute(
            select(Patient).where(Patient.is_active == True)
        )
        return list(res.scalars().all())


# Singleton
monitoring_service = MonitoringService()
