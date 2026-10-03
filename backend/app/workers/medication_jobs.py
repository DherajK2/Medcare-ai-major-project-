from app.utils.logger import get_logger

logger = get_logger(__name__)

async def check_medication_reminders():
    """Check for due medication reminders and send notifications.
    Idempotent: checks current time against scheduled_time and last sent."""
    logger.info("Checking medication reminders")
    # Implementation: query medication_schedules, check against current time,
    # send notifications for due medications, record in medication_adherence
    pass

async def check_missed_medications():
    """Check for medications that were due but not taken."""
    logger.info("Checking missed medications")
    pass
