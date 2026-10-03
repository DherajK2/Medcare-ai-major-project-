import { Card } from '../ui/Card';
import { TrendIndicator } from './TrendIndicator';
export function HealthMetricCard({ title, value, unit, trend }: { title: string, value: number | string, unit: string, trend: 'increasing' | 'decreasing' | 'stable' }) {
  return (
    <Card>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
      <div className="mt-2"><TrendIndicator direction={trend} /></div>
    </Card>
  );
}