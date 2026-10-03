import { create } from 'zustand';
import { patientsApi } from '../api/patients';
import type { Patient } from '../types/patient';

interface PatientState {
  patients: Patient[];
  activePatientId: string | null;
  loading: boolean;
  error: string | null;
  fetchPatients: () => Promise<void>;
  setActivePatient: (id: string | null) => void;
  reset: () => void;
}

const STORAGE_KEY = 'medcare_active_patient_id';

export const usePatientStore = create<PatientState>((set) => ({
  patients: [],
  activePatientId: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,
  loading: false,
  error: null,
  reset: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({
      patients: [],
      activePatientId: null,
      loading: false,
      error: null,
    });
  },
  fetchPatients: async () => {
    set({ loading: true, error: null });
    try {
      const data = await patientsApi.getPatients();
      const safeData = Array.isArray(data) ? data : [];
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      
      let resolvedId: string | null = null;
      if (savedId && safeData.some((p) => p.id === savedId)) {
        resolvedId = savedId;
      } else if (safeData.length > 0) {
        resolvedId = safeData[0].id;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, resolvedId);
        }
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      set({
        patients: safeData,
        loading: false,
        activePatientId: resolvedId,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load patients', loading: false, patients: [], activePatientId: null });
    }
  },
  setActivePatient: (id) => {
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    set({ activePatientId: id || null });
  },
}));