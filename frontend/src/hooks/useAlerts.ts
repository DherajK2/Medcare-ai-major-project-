import { useEffect } from 'react';
import { useAlertStore } from '../store/alertStore';

export function useAlerts(patientId: string | null) {
  const { alerts, loading, fetchAlerts } = useAlertStore();

  useEffect(() => {
    if (patientId) {
      fetchAlerts(patientId);
    }
  }, [patientId, fetchAlerts]);

  return { alerts, loading };
}