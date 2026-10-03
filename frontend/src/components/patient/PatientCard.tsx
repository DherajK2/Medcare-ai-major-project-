import { Card } from '../ui/Card';
import type { Patient } from '../../types/patient';
export function PatientCard({ patient }: { patient: Patient }) {
  return (
    <Card className="hover:border-blue-500 cursor-pointer transition-colors">
      <h3 className="font-semibold text-lg">{patient.first_name} {patient.last_name}</h3>
      <p className="text-gray-500 text-sm">DOB: {patient.date_of_birth}</p>
    </Card>
  );
}