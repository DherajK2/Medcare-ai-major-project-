import { useState, useEffect } from 'react';
import { healthApi } from '../api/health';
import type { HealthRecord } from '../types/health';

export function useHealthData(patientId: string | null) {
  const [data, setData] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    healthApi.getRecords(patientId).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [patientId]);

  return { data, loading, error };
}