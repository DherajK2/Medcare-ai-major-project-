import { apiClient } from './client';
export const appointmentsApi = {
  getAppointments: (patientId: string) => apiClient.get(`/api/appointments/${patientId}`).then(r => r.data),
};