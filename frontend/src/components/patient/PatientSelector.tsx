import { usePatients } from '../../hooks/usePatients';

export function PatientSelector() {
  const { patients, activePatientId, setActivePatient } = usePatients();
  return (
    <select 
      value={activePatientId || ''} 
      onChange={(e) => setActivePatient(e.target.value)}
      className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-800 text-sm font-medium shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-h-[40px]"
    >
      <option value="">👤 Select Patient...</option>
      {patients.map(p => (
        <option key={p.id} value={p.id}>
          {p.first_name} {p.last_name}
        </option>
      ))}
    </select>
  );
}