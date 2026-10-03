import asyncio
import datetime
from sqlalchemy import select
from app.core.dependencies import AsyncSessionLocal
from app.models.medication import MedicationSchedule, Medication
from app.models.patient import Patient
from app.services.whatsapp_service import WhatsAppService
from app.utils.logger import get_logger

logger = get_logger(__name__)

# How often (in seconds) to run the health-monitoring scan
MONITORING_INTERVAL_SECONDS = 300  # 5 minutes


class MedicationScheduler:
    def __init__(self):
        self.is_running = False
        self._task = None
        self._monitoring_task = None
        # Track cycle count so we don't run monitoring on every medication tick
        self._cycle = 0

    async def start(self):
        """Start the background reminder loop and the health monitoring loop."""
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._loop())
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("MedicationScheduler + HealthMonitor background services started.")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
        if self._monitoring_task:
            self._monitoring_task.cancel()

    async def _loop(self):
        while self.is_running:
            try:
                await self.check_and_dispatch_reminders()
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")
            await asyncio.sleep(60)

    async def _monitoring_loop(self):
        """Runs health monitoring every MONITORING_INTERVAL_SECONDS (default 5 min)."""
        # Small initial delay so the app fully starts before first scan
        await asyncio.sleep(30)
        while self.is_running:
            try:
                logger.info("[Monitor] Scheduled health monitoring scan starting…")
                from app.services.monitoring_service import monitoring_service
                findings = await monitoring_service.run_full_scan()
                critical = sum(1 for f in findings if f.severity == "CRITICAL")
                high = sum(1 for f in findings if f.severity == "HIGH")
                if findings:
                    logger.info(
                        f"[Monitor] Scan complete — {len(findings)} findings "
                        f"({critical} CRITICAL, {high} HIGH)"
                    )
                else:
                    logger.info("[Monitor] Scan complete — all patients within normal ranges")
            except Exception as exc:
                logger.error(f"[Monitor] Monitoring loop error: {exc}")
            await asyncio.sleep(MONITORING_INTERVAL_SECONDS)

    async def check_and_dispatch_reminders(self):
        """Check all active schedules matching current minute and dispatch WhatsApp reminders."""
        try:
            # Calculate IST (+05:30)
            ist_offset = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
            now_ist = datetime.datetime.now(ist_offset)
        except Exception:
            now_ist = datetime.datetime.now()

        current_time = now_ist.time()
        curr_hour = current_time.hour
        curr_minute = current_time.minute

        logger.info(f"Checking medication schedules for time {curr_hour:02d}:{curr_minute:02d} IST...")

        async with AsyncSessionLocal() as db:
            query = (
                select(MedicationSchedule, Medication, Patient)
                .join(Medication, MedicationSchedule.medication_id == Medication.id)
                .join(Patient, MedicationSchedule.patient_id == Patient.id)
                .where(MedicationSchedule.is_active == True, Medication.is_active == True)
            )
            res = await db.execute(query)
            rows = res.all()

            wa_svc = WhatsAppService()
            for sched, med, patient in rows:
                if sched.scheduled_time.hour == curr_hour and sched.scheduled_time.minute == curr_minute:
                    p_name = f"{patient.first_name} {patient.last_name}"
                    if patient.phone:
                        logger.info(f"Triggering automated timed WhatsApp reminder for {p_name} ({med.name}) to {patient.phone}")
                        await wa_svc.send_medication_reminder(
                            patient_name=p_name,
                            phone=patient.phone,
                            medication_name=med.name,
                            dosage=med.dosage or "Standard Dose",
                            instructions=med.instructions or "Take as prescribed",
                            scheduled_time=f"{curr_hour:02d}:{curr_minute:02d} IST"
                        )

medication_scheduler = MedicationScheduler()
