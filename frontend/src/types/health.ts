export type MetricType = 'blood_pressure_systolic' | 'blood_pressure_diastolic' | 'blood_glucose' | 'hba1c' | 'hemoglobin' | 'cholesterol_total' | 'heart_rate' | 'weight' | 'temperature' | 'oxygen_saturation'
export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'insufficient_data'
export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface HealthRecord {
  id: string
  patient_id: string
  metric_type: MetricType
  value: number
  unit: string
  measurement_date: string
  source_document_id?: string
  notes?: string
}

export interface HealthTrend {
  metric_type: MetricType
  direction: TrendDirection
  latest_value: number
  average_value: number
  percent_change_30d?: number
  data_points: number
}