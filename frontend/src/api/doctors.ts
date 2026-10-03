import { apiClient } from './client';
export const doctorsApi = {
  getDoctors: () => apiClient.get('/api/doctors').then(r => r.data),
};