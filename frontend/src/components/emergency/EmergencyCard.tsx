import { Card } from '../ui/Card';
import { AlertCircle } from 'lucide-react';
export function EmergencyCard() {
  return (
    <Card className="border-red-200 bg-red-50">
      <div className="flex items-center text-red-700 font-bold mb-2">
        <AlertCircle className="mr-2" /> Emergency Information
      </div>
      <p className="text-red-600 font-semibold text-lg">Call 911 for immediate emergencies.</p>
      <p className="text-sm text-red-500 mt-1">This app cannot call emergency services.</p>
    </Card>
  );
}