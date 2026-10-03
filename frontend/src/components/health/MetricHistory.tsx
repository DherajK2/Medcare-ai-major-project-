import { Card } from '../ui/Card';
export function MetricHistory({ data }: { data: any[] }) {
  return (
    <Card className="p-4">
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex justify-between text-xs py-1 border-b">
            <span>{new Date(d.measurement_date).toLocaleDateString()}</span>
            <span className="font-semibold">{d.value} {d.unit}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}