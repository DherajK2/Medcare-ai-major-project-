import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { format } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface HealthReading {
  value: number
  measurement_date: string
}



export function HealthChart({ readings = [], metric = 'Blood Pressure (Systolic)', color = '#2563eb' }: {
  readings?: HealthReading[]
  metric?: string
  color?: string
}) {
  if (!readings || readings.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200 text-center p-4">
        <p className="text-xs font-semibold text-gray-600">No recorded readings for this patient</p>
        <p className="text-[11px] text-gray-400 mt-1">Upload a medical document or log a reading in the Health Data tab to track clinical trends.</p>
      </div>
    );
  }

  const sorted = [...readings].sort((a, b) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime());
  
  const data = {
    labels: sorted.map(r => format(new Date(r.measurement_date), 'MMM d, p')),
    datasets: [{
      label: metric,
      data: sorted.map(r => r.value),
      borderColor: color,
      backgroundColor: color + '20',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: color,
      pointRadius: 5,
    }]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.raw}` } }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f3f4f6' } }
    }
  }

  return <Line data={data} options={options} />
}