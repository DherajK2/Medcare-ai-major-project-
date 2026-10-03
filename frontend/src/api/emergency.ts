import { apiClient } from './client';
export const emergencyApi = {
  getContacts: (patientId: string) => apiClient.get(`/api/emergency/contacts/${patientId}`).then(r => r.data),
};