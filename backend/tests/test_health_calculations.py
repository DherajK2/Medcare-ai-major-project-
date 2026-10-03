import pytest
from datetime import datetime, timedelta
from app.services.trend_service import TrendService, TrendDirection, AnomalyType

class TestTrendCalculation:
    def test_increasing_trend(self):
        svc = TrendService()
        base = datetime.utcnow() - timedelta(days=10)
        timestamps = [base + timedelta(days=i) for i in range(10)]
        values = [100.0 + i * 10 for i in range(10)]
        result = svc.calculate_trend(values, timestamps)
        assert result.direction == TrendDirection.INCREASING
        assert result.slope > 0
        assert result.data_points == 10
        assert result.latest_value == 190.0

    def test_decreasing_trend(self):
        svc = TrendService()
        base = datetime.utcnow() - timedelta(days=10)
        timestamps = [base + timedelta(days=i) for i in range(10)]
        values = [200.0 - i * 10 for i in range(10)]
        result = svc.calculate_trend(values, timestamps)
        assert result.direction == TrendDirection.DECREASING
        assert result.slope < 0

    def test_insufficient_data(self):
        svc = TrendService()
        result = svc.calculate_trend([120.0], [datetime.utcnow()])
        assert result.direction == TrendDirection.INSUFFICIENT_DATA

    def test_moving_average(self):
        svc = TrendService()
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        ma = svc.compute_moving_average(values, window=3)
        assert len(ma) == 5
        assert ma[0] == pytest.approx(1.0)
        assert ma[2] == pytest.approx(2.0)

class TestAnomalyDetection:
    def test_critical_high_glucose(self):
        svc = TrendService()
        result = svc.detect_anomaly(450.0, "blood_glucose")
        assert result.anomaly_type == AnomalyType.HIGH
        assert result.severity == "CRITICAL"

    def test_high_blood_pressure(self):
        svc = TrendService()
        result = svc.detect_anomaly(150.0, "blood_pressure_systolic")
        assert result.anomaly_type == AnomalyType.HIGH
        assert result.severity == "HIGH"

    def test_normal_heart_rate(self):
        svc = TrendService()
        result = svc.detect_anomaly(72.0, "heart_rate")
        assert result.anomaly_type == AnomalyType.NONE

    def test_sudden_change_detection(self):
        svc = TrendService()
        values = [120.0, 185.0]  # 54% change - CRITICAL
        result = svc.detect_sudden_change(values)
        assert result is not None
        assert result.severity == "CRITICAL"

    def test_no_sudden_change(self):
        svc = TrendService()
        values = [120.0, 125.0]  # 4% change - normal
        result = svc.detect_sudden_change(values)
        assert result is None
