import type { MetricType } from '../types/health';

export function getMetricLabel(metric: MetricType): string {
  const labels: Record<MetricType, string> = {
    blood_pressure_systolic: 'BP Systolic',
    blood_pressure_diastolic: 'BP Diastolic',
    blood_glucose: 'Blood Glucose',
    hba1c: 'HbA1c',
    hemoglobin: 'Hemoglobin',
    cholesterol_total: 'Total Cholesterol',
    heart_rate: 'Heart Rate',
    weight: 'Weight',
    temperature: 'Temperature',
    oxygen_saturation: 'SpO2'
  };
  return labels[metric] || metric;
}