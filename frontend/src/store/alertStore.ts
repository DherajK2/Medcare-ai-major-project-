import { create } from 'zustand';
import { alertsApi } from '../api/alerts';
import type { Alert } from '../types/alert';

interface AlertState {
  alerts: Alert[];
  loading: boolean;
  fetchAlerts: (patientId: string) => Promise<void>;
  addAlert: (alert: Alert) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  loading: false,
  fetchAlerts: async (patientId) => {
    set({ loading: true });
    try {
      const data = await alertsApi.getAlerts(patientId);
      set({ alerts: data, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
}));