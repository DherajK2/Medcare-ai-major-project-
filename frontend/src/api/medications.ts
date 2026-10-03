import { apiClient } from './client';
import type { Medication } from '../types/medication';

export interface BatchMedicationPayload {
  patient_id: string;
  medications: Array<{
    name: string;
    generic_name?: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    start_date?: string;
    end_date?: string;
    prescribing_doctor?: string;
    instructions?: string;
    source_document_id?: string;
  }>;
}

export const medicationsApi = {
  getMedications: (patientId: string) => apiClient.get<Medication[]>(`/api/medications/${patientId}`).then(r => r.data),
  addMedication: (data: any) => apiClient.post<Medication>('/api/medications', data).then(r => r.data),
  batchAddMedications: (payload: BatchMedicationPayload) => apiClient.post<{ success: boolean; message: string; count: number; medications: any[] }>('/api/medications/batch', payload).then(r => r.data),
  deleteMedication: (medicationId: string) => apiClient.delete(`/api/medications/${medicationId}`).then(r => r.data),
};