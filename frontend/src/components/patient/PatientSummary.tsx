import { Card } from '../ui/Card';
import type { Patient } from '../../types/patient';
export function PatientSummary({ patient }: { patient: Patient }) {
  return (
    <Card>
      <h2 className="text-xl font-bold mb-4">Patient Profile</h2>
      <div className="grid grid-cols-2 gap-4">
        <div><span className="text-gray-500">Name:</span> {patient.first_name} {patient.last_name}</div>
        <div><span className="text-gray-500">Gender:</span> {patient.gender}</div>
        <div><span className="text-gray-500">DOB:</span> {patient.date_of_birth}</div>
        <div><span className="text-gray-500">Blood Type:</span> {patient.blood_type || 'N/A'}</div>
      </div>
    </Card>
  );
}