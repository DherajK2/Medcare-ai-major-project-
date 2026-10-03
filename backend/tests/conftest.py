import pytest
import asyncio
from app.services.trend_service import TrendService
from app.services.safety_service import SafetyService
from datetime import datetime, timedelta

@pytest.fixture
def trend_service():
    return TrendService()

@pytest.fixture
def safety_service():
    return SafetyService()

@pytest.fixture
def sample_readings_increasing():
    base = datetime.utcnow() - timedelta(days=30)
    timestamps = [base + timedelta(days=i) for i in range(10)]
    values = [100.0 + i * 5 for i in range(10)]  # Clearly increasing
    return values, timestamps

@pytest.fixture
def sample_readings_stable():
    base = datetime.utcnow() - timedelta(days=10)
    timestamps = [base + timedelta(days=i) for i in range(10)]
    values = [120.0 + (i % 3) for i in range(10)]  # Roughly stable
    return values, timestamps
