import { useEffect } from 'react';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';

export function usePatients() {
  const { user } = useAuthStore();
  const { patients, activePatientId, loading, error, fetchPatients, setActivePatient } = usePatientStore();
  
  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user?.id]);

  const active = activePatientId ? (patients.find(p => p.id === activePatientId) || null) : (patients.length > 0 ? patients[0] : null);
  
  return { 
    patients, 
    activePatientId: active?.id || null, 
    loading, 
    error, 
    setActivePatient, 
    activePatient: active,
    currentPatient: active,
    refetch: fetchPatients
  };
}