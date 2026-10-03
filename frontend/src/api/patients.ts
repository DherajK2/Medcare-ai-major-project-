import { apiClient } from './client';
import type { Patient } from '../types/patient';

export const patientsApi = {
  getPatients: () => apiClient.get<Patient[]>('/api/patients').then(r => r.data),
  getPatient: (id: string) => apiClient.get<Patient>(`/api/patients/${id}`).then(r => r.data),
  createPatient: (data: Partial<Patient>) => apiClient.post<Patient>('/api/patients', data).then(r => r.data),
  updatePatient: (id: string, data: Partial<Patient>) => apiClient.put<Patient>(`/api/patients/${id}`, data).then(r => r.data),
  deletePatient: (id: string) => apiClient.delete(`/api/patients/${id}`).then(r => r.data),
};