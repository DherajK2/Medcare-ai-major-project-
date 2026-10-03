import { Card } from '../ui/Card';
import type { Medication } from '../../types/medication';
export function MedicationCard({ medication }: { medication: Medication }) {
  return (
    <Card>
      <h3 className="font-semibold text-lg text-gray-900">{medication.name}</h3>
      <p className="text-gray-600 mt-1">{medication.dosage} - {medication.frequency}</p>
      {medication.notes && <p className="text-sm text-gray-500 mt-2">{medication.notes}</p>}
    </Card>
  );
}