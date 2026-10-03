import { useAlerts } from '../../hooks/useAlerts';
import { AlertCard } from './AlertCard';
export function AlertPanel({ patientId }: { patientId: string | null }) {
  const { alerts, loading } = useAlerts(patientId);
  if (loading) return <div>Loading alerts...</div>;
  if (!alerts.length) return <div className="text-gray-500 p-4">No active alerts</div>;
  return <div className="space-y-3">{alerts.map(a => <AlertCard key={a.id} alert={a} />)}</div>;
}