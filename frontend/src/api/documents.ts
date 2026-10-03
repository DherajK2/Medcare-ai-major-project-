import { apiClient } from './client';

export interface MedicationExtracted {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration?: string;
  instructions: string;
}

export interface VitalExtracted {
  metric_type: string;
  value: number;
  unit: string;
}

export interface LabResult {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  status?: 'normal' | 'high' | 'low' | 'critical';
}

export interface DocumentAnalysisResult {
  id: string;
  patient_id: string;
  patient_name: string;
  file_name: string;
  document_type: string;
  processing_status: string;
  created_at: string;
  message: string;
  extracted_text?: string;
  file_url?: string;
  extracted_data: {
    patient_name?: string;
    age?: number;
    gender?: string;
    address?: string;
    doctor_name?: string;
    doctor_specialty?: string;
    hospital_name?: string;
    hospital_address?: string;
    diagnosis: string;
    summary: string;
    medications: MedicationExtracted[];
    vitals: VitalExtracted[];
    lab_results: LabResult[];
  };
}

export const documentsApi = {
  uploadDocument: (data: FormData) => 
    apiClient.post<DocumentAnalysisResult>('/api/documents/upload', data, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    }).then(r => r.data),
  
  getDocuments: (patientId: string) => 
    apiClient.get(`/api/documents/${patientId}`).then(r => r.data),

  getDocumentDetail: (docId: string) =>
    apiClient.get<DocumentAnalysisResult>(`/api/documents/detail/${docId}`).then(r => r.data),

  deleteDocument: (docId: string) =>
    apiClient.delete(`/api/documents/${docId}`).then(r => r.data),

  reassignDocument: (docId: string, payload: { target_patient_id?: string; create_new_patient_name?: string }) =>
    apiClient.post(`/api/documents/${docId}/reassign`, payload).then(r => r.data),
};