import { apiClient } from './client';
import type { HealthRecord, HealthTrend } from '../types/health';

export const healthApi = {
  getRecords: (patientId: string, metricType?: string) =>
    apiClient.get<HealthRecord[]>(`/api/health/records/${patientId}`, { params: { metric_type: metricType } }).then(r => r.data),
  getTrends: (patientId: string, metricType: string) =>
    apiClient.get<HealthTrend>(`/api/health/trends/${patientId}/${metricType}`).then(r => r.data),
};