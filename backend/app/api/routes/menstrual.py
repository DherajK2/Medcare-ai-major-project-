from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID, uuid4
from datetime import date, datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_patient_access
from app.models.menstrual import MenstrualCycleLog
from app.models.patient import Patient
from app.services.menstrual_ml_service import MenstrualMLService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# --- Schemas ---

class MenstrualLogCreate(BaseModel):
    patient_id: UUID
    start_date: date
    end_date: Optional[date] = None
    cycle_length_days: int = Field(default=28, ge=18, le=60)
    period_duration_days: int = Field(default=5, ge=1, le=15)
    flow_intensity: str = Field(default="medium")  # light, medium, heavy, spotting
    pain_level: int = Field(default=1, ge=1, le=10)
    symptoms: List[str] = Field(default_factory=list)
    mood: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

class MenstrualLogUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    cycle_length_days: Optional[int] = Field(default=None, ge=18, le=60)
    period_duration_days: Optional[int] = Field(default=None, ge=1, le=15)
    flow_intensity: Optional[str] = None
    pain_level: Optional[int] = Field(default=None, ge=1, le=10)
    symptoms: Optional[List[str]] = None
    mood: Optional[List[str]] = None
    notes: Optional[str] = None

def calculate_cycle_insights(latest_log: Optional[MenstrualCycleLog], logs_count: int) -> dict:
    today = date.today()
    if not latest_log:
        return {
            "has_data": False,
            "current_cycle_day": 1,
            "cycle_length_days": 28,
            "period_duration_days": 5,
            "current_phase": "Unknown",
            "phase_description": "Log your period start date to calculate your cycle phase and predictions.",
            "next_period_date": None,
            "days_until_next_period": None,
            "ovulation_date": None,
            "fertile_window_start": None,
            "fertile_window_end": None,
            "pregnancy_chance": "Unknown",
            "phase_tips": [
                "Track your symptoms and mood daily for personalized health forecasts.",
                "Drink 2-3 liters of water daily to support hormonal balance.",
                "Incorporate iron-rich leafy greens, seeds, and fruits."
            ]
        }

    cycle_length = latest_log.cycle_length_days or 28
    period_duration = latest_log.period_duration_days or 5
    start_d = latest_log.start_date

    # Calculate days passed since last period start
    days_passed = (today - start_d).days
    
    # If cycle passed multiple loops, calculate within active cycle modulo
    if days_passed < 0:
        current_cycle_day = 1
    else:
        current_cycle_day = (days_passed % cycle_length) + 1

    # Key dates
    cycle_index = max(0, days_passed // cycle_length)
    current_cycle_start = start_d + timedelta(days=cycle_index * cycle_length)
    next_period_date = current_cycle_start + timedelta(days=cycle_length)
    days_until_next_period = max(0, (next_period_date - today).days)
    
    ovulation_day = max(10, cycle_length - 14)
    ovulation_date = current_cycle_start + timedelta(days=ovulation_day - 1)
    fertile_start = ovulation_date - timedelta(days=5)
    fertile_end = ovulation_date + timedelta(days=1)

    # Determine Phase
    if current_cycle_day <= period_duration:
        phase = "Menstrual Phase"
        phase_key = "menstrual"
        description = f"Day {current_cycle_day} of bleeding. Uterine lining is shedding as estrogen and progesterone dip."
        pregnancy_chance = "Low"
        tips = [
            "Prioritize warm, iron-rich meals (spinach, lentils, dark chocolate, beetroot).",
            "Gentle stretching, yoga, and warm water compress can soothe menstrual cramps.",
            "Stay well hydrated and ensure 7-8 hours of restful sleep."
        ]
    elif current_cycle_day < (ovulation_day - 5):
        phase = "Follicular Phase"
        phase_key = "follicular"
        description = f"Day {current_cycle_day}. Estrogen is steadily rising, boosting your vitality, focus, and mood."
        pregnancy_chance = "Low to Medium"
        tips = [
            "Great time for high-energy workouts and challenging physical activities.",
            "Incorporate probiotic foods (yogurt, kimchi) and fermented foods to assist estrogen metabolism.",
            "Your brain is primed for problem solving and creativity."
        ]
    elif (ovulation_day - 5) <= current_cycle_day <= (ovulation_day + 1):
        phase = "Ovulation Phase"
        phase_key = "ovulation"
        description = f"Day {current_cycle_day}. Peak estrogen and luteinizing hormone trigger egg release. Maximum fertility."
        pregnancy_chance = "High (Peak Fertility)"
        tips = [
            "Peak energy and social vitality. Hydrate well and eat antioxidant-rich berries.",
            "High fertility window — vital for family planning or contraception awareness.",
            "Mild pelvic twinges (mittelschmerz) are normal during this 48-hour window."
        ]
    else:
        phase = "Luteal Phase"
        phase_key = "luteal"
        description = f"Day {current_cycle_day}. Progesterone dominates to support the uterine lining. Pre-menstrual phase."
        pregnancy_chance = "Low"
        tips = [
            "Magnesium-rich foods (pumpkin seeds, almonds, bananas) reduce PMS mood shifts and bloating.",
            "Opt for grounding, moderate exercise like brisk walking or pilates.",
            "Reduce excess caffeine and refined sugar to minimize cramp severity."
        ]

    return {
        "has_data": True,
        "current_cycle_day": current_cycle_day,
        "cycle_length_days": cycle_length,
        "period_duration_days": period_duration,
        "current_phase": phase,
        "phase_key": phase_key,
        "phase_description": description,
        "next_period_date": next_period_date.isoformat(),
        "days_until_next_period": days_until_next_period,
        "ovulation_date": ovulation_date.isoformat(),
        "fertile_window_start": fertile_start.isoformat(),
        "fertile_window_end": fertile_end.isoformat(),
        "pregnancy_chance": pregnancy_chance,
        "phase_tips": tips,
        "total_logged_cycles": logs_count
    }

# --- Routes ---

@router.get("/{patient_id}")
async def get_menstrual_data(
    patient_id: UUID,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied for this patient")

    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    result = await db.execute(
        select(MenstrualCycleLog)
        .where(MenstrualCycleLog.patient_id == patient_id)
        .order_by(desc(MenstrualCycleLog.start_date))
    )
    logs = result.scalars().all()

    latest_log = logs[0] if logs else None
    analytics = calculate_cycle_insights(latest_log, len(logs))
    
    # Train Bayesian-EWMA Statistical Machine Learning Model on cycle log sequence
    ml_forecast = MenstrualMLService.train_and_forecast(
        logs=list(logs),
        patient_name=f"{patient.first_name} {patient.last_name}",
        gender=patient.gender
    )

    return {
        "patient_id": patient_id,
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "gender": patient.gender,
        "analytics": analytics,
        "ml_forecast": ml_forecast,
        "history": [
            {
                "id": str(log.id),
                "start_date": log.start_date.isoformat(),
                "end_date": log.end_date.isoformat() if log.end_date else None,
                "cycle_length_days": log.cycle_length_days,
                "period_duration_days": log.period_duration_days,
                "flow_intensity": log.flow_intensity,
                "pain_level": log.pain_level,
                "symptoms": log.symptoms or [],
                "mood": log.mood or [],
                "notes": log.notes,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }

@router.get("/{patient_id}/ml-forecast")
async def get_ml_forecast(
    patient_id: UUID,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Explicitly trigger Machine Learning Model training & inference on patient's cycle logs.
    """
    authorized = await verify_patient_access(current_user.id, patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied for this patient")

    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    result = await db.execute(
        select(MenstrualCycleLog)
        .where(MenstrualCycleLog.patient_id == patient_id)
        .order_by(desc(MenstrualCycleLog.start_date))
    )
    logs = result.scalars().all()

    ml_forecast = MenstrualMLService.train_and_forecast(
        logs=list(logs),
        patient_name=f"{patient.first_name} {patient.last_name}",
        gender=patient.gender
    )

    return {
        "patient_id": patient_id,
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "ml_forecast": ml_forecast
    }

@router.post("")
async def create_menstrual_log(
    data: MenstrualLogCreate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    authorized = await verify_patient_access(current_user.id, data.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied for this patient")

    log = MenstrualCycleLog(
        patient_id=data.patient_id,
        start_date=data.start_date,
        end_date=data.end_date,
        cycle_length_days=data.cycle_length_days,
        period_duration_days=data.period_duration_days,
        flow_intensity=data.flow_intensity,
        pain_level=data.pain_level,
        symptoms=data.symptoms,
        mood=data.mood,
        notes=data.notes,
        created_by=current_user.id
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    logger.info(f"Logged menstrual cycle entry for patient {data.patient_id} on {data.start_date}")
    return {
        "id": str(log.id),
        "message": "Menstrual cycle record saved successfully",
        "start_date": log.start_date.isoformat()
    }

@router.put("/{log_id}")
async def update_menstrual_log(
    log_id: UUID,
    data: MenstrualLogUpdate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    log = await db.get(MenstrualCycleLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    authorized = await verify_patient_access(current_user.id, log.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")

    if data.start_date is not None:
        log.start_date = data.start_date
    if data.end_date is not None:
        log.end_date = data.end_date
    if data.cycle_length_days is not None:
        log.cycle_length_days = data.cycle_length_days
    if data.period_duration_days is not None:
        log.period_duration_days = data.period_duration_days
    if data.flow_intensity is not None:
        log.flow_intensity = data.flow_intensity
    if data.pain_level is not None:
        log.pain_level = data.pain_level
    if data.symptoms is not None:
        log.symptoms = data.symptoms
    if data.mood is not None:
        log.mood = data.mood
    if data.notes is not None:
        log.notes = data.notes

    await db.commit()
    await db.refresh(log)
    return {"message": "Menstrual cycle updated", "id": str(log.id)}

@router.delete("/{log_id}")
async def delete_menstrual_log(
    log_id: UUID,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    log = await db.get(MenstrualCycleLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    authorized = await verify_patient_access(current_user.id, log.patient_id, db)
    if not authorized:
        raise HTTPException(status_code=403, detail="Access denied")

    await db.delete(log)
    await db.commit()
    return {"message": "Menstrual log deleted"}
