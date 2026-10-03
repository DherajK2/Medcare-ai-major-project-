import { apiClient } from './client';
import type { Alert } from '../types/alert';

export const alertsApi = {
  getAlerts: (patientId: string) => apiClient.get<Alert[]>(`/api/alerts/${patientId}`).then(r => r.data),
  markRead: (alertId: string) => apiClient.put(`/api/alerts/${alertId}/read`).then(r => r.data),
};