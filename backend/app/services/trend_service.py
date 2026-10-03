import statistics
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum

class TrendDirection(str, Enum):
    INCREASING = "increasing"
    DECREASING = "decreasing"
    STABLE = "stable"
    INSUFFICIENT_DATA = "insufficient_data"

class AnomalyType(str, Enum):
    NONE = "none"
    HIGH = "high"
    LOW = "low"
    SUDDEN_CHANGE = "sudden_change"
    REPEATED_ABNORMAL = "repeated_abnormal"

HEALTH_THRESHOLDS = {
    "blood_pressure_systolic": {"critical_high": 180, "high": 140, "low": 90, "critical_low": 70},
    "blood_pressure_diastolic": {"critical_high": 120, "high": 90, "low": 60, "critical_low": 40},
    "blood_glucose": {"critical_high": 400, "high": 180, "low": 70, "critical_low": 54},
    "hba1c": {"critical_high": 14.0, "high": 8.0, "low": 4.0, "critical_low": None},
    "heart_rate": {"critical_high": 150, "high": 100, "low": 50, "critical_low": 40},
    "temperature": {"critical_high": 40.0, "high": 38.5, "low": 36.0, "critical_low": 35.0},
    "hemoglobin": {"critical_high": None, "high": 20.0, "low": 8.0, "critical_low": 7.0},
    "cholesterol_total": {"critical_high": 300, "high": 240, "low": None, "critical_low": None},
    "oxygen_saturation": {"critical_high": None, "high": None, "low": 90, "critical_low": 85},
}

@dataclass
class TrendResult:
    direction: TrendDirection
    slope: float
    r_squared: float
    latest_value: float
    average_value: float
    min_value: float
    max_value: float
    percent_change_30d: Optional[float]
    data_points: int

@dataclass
class AnomalyResult:
    anomaly_type: AnomalyType
    severity: str
    message: str
    value: float
    threshold_breached: Optional[float]

class TrendService:
    def calculate_trend(self, values: list[float], timestamps: list[datetime]) -> TrendResult:
        n = len(values)
        if n < 2:
            return TrendResult(
                direction=TrendDirection.INSUFFICIENT_DATA,
                slope=0, r_squared=0,
                latest_value=values[-1] if values else 0,
                average_value=values[0] if values else 0,
                min_value=values[0] if values else 0,
                max_value=values[0] if values else 0,
                percent_change_30d=None,
                data_points=n
            )
        t0 = timestamps[0]
        xs = [(t - t0).total_seconds() / 86400 for t in timestamps]
        ys = values
        x_mean = statistics.mean(xs)
        y_mean = statistics.mean(ys)
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
        denominator = sum((x - x_mean) ** 2 for x in xs)
        slope = numerator / denominator if denominator != 0 else 0
        y_pred = [y_mean + slope * (x - x_mean) for x in xs]
        ss_res = sum((y - yp) ** 2 for y, yp in zip(ys, y_pred))
        ss_tot = sum((y - y_mean) ** 2 for y in ys)
        r_sq = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        if abs(slope) < 0.01 * y_mean:
            direction = TrendDirection.STABLE
        elif slope > 0:
            direction = TrendDirection.INCREASING
        else:
            direction = TrendDirection.DECREASING
        cutoff = datetime.utcnow() - timedelta(days=30)
        recent = [(t, v) for t, v in zip(timestamps, values) if t >= cutoff]
        pct_change = None
        if len(recent) >= 2:
            old_val = recent[0][1]
            new_val = recent[-1][1]
            if old_val != 0:
                pct_change = ((new_val - old_val) / abs(old_val)) * 100
        return TrendResult(
            direction=direction,
            slope=slope,
            r_squared=r_sq,
            latest_value=values[-1],
            average_value=statistics.mean(values),
            min_value=min(values),
            max_value=max(values),
            percent_change_30d=pct_change,
            data_points=n
        )

    def detect_anomaly(self, value: float, metric_type: str) -> AnomalyResult:
        thresholds = HEALTH_THRESHOLDS.get(metric_type)
        if not thresholds:
            return AnomalyResult(AnomalyType.NONE, "INFO", "", value, None)
        if thresholds.get("critical_high") and value >= thresholds["critical_high"]:
            return AnomalyResult(AnomalyType.HIGH, "CRITICAL", f"{metric_type} critically high at {value}", value, thresholds["critical_high"])
        if thresholds.get("critical_low") and value <= thresholds["critical_low"]:
            return AnomalyResult(AnomalyType.LOW, "CRITICAL", f"{metric_type} critically low at {value}", value, thresholds["critical_low"])
        if thresholds.get("high") and value >= thresholds["high"]:
            return AnomalyResult(AnomalyType.HIGH, "HIGH", f"{metric_type} high at {value}", value, thresholds["high"])
        if thresholds.get("low") and value <= thresholds["low"]:
            return AnomalyResult(AnomalyType.LOW, "HIGH", f"{metric_type} low at {value}", value, thresholds["low"])
        return AnomalyResult(AnomalyType.NONE, "INFO", "", value, None)

    def detect_sudden_change(self, values: list[float], threshold_pct: float = 25.0) -> Optional[AnomalyResult]:
        if len(values) < 2:
            return None
        prev, current = values[-2], values[-1]
        if prev == 0:
            return None
        change_pct = abs((current - prev) / abs(prev)) * 100
        if change_pct >= 30:
            severity = "CRITICAL" if change_pct >= 50 else "HIGH"
            return AnomalyResult(AnomalyType.SUDDEN_CHANGE, severity, f"Sudden change of {change_pct:.1f}%", current, prev)
        return None

    def detect_repeated_abnormal(self, anomalies: list[AnomalyResult], window: int = 3) -> bool:
        if len(anomalies) < window:
            return False
        return all(a.anomaly_type != AnomalyType.NONE for a in anomalies[-window:])

    def compute_moving_average(self, values: list[float], window: int = 7) -> list[float]:
        result = []
        for i in range(len(values)):
            start = max(0, i - window + 1)
            result.append(statistics.mean(values[start:i+1]))
        return result