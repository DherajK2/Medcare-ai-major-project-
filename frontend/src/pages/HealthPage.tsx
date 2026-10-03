import { useState, useEffect } from 'react';
import { usePatients } from '../hooks/usePatients';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { HealthChart } from '../components/health/HealthChart';
import { Activity, Heart, Droplets, Wind, Plus, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

const METRIC_TABS = [
  { id: 'blood_pressure_systolic',  label: 'Blood Pressure', unit: 'mmHg', icon: Activity,  normal: '90–120', refMin: 90,  refMax: 120 },
  { id: 'blood_glucose',            label: 'Blood Glucose',  unit: 'mg/dL', icon: Droplets, normal: '70–140', refMin: 70,  refMax: 140 },
  { id: 'heart_rate',               label: 'Heart Rate',     unit: 'bpm',   icon: Heart,    normal: '60–100', refMin: 60,  refMax: 100 },
  { id: 'oxygen_saturation',        label: 'SpO₂ Oxygen',    unit: '%',     icon: Wind,     normal: '95–100', refMin: 95,  refMax: 100 },
  { id: 'hba1c',                    label: 'HbA1c',          unit: '%',     icon: Activity, normal: '4–5.7',  refMin: 4.0, refMax: 5.7  },
  { id: 'hemoglobin',               label: 'Hemoglobin',     unit: 'g/dL',  icon: Droplets, normal: '12–17',  refMin: 12,  refMax: 17   },
  { id: 'temperature',              label: 'Temperature',    unit: '°C',    icon: Activity, normal: '36–37.5',refMin: 36,  refMax: 37.5 },
];

function getStatus(value: number, refMin: number, refMax: number): 'normal' | 'elevated' | 'abnormal' {
  if (value >= refMin && value <= refMax) return 'normal';
  const lo = refMax - refMin;
  if (value < refMin - lo * 0.2 || value > refMax + lo * 0.2) return 'abnormal';
  return 'elevated';
}

function StatusBadge({ status }: { status: 'normal' | 'elevated' | 'abnormal' }) {
  if (status === 'normal')   return <span className="badge-normal">Normal</span>;
  if (status === 'elevated') return <span className="badge-elevated">Elevated</span>;
  return <span className="badge-abnormal">Abnormal</span>;
}

/* Mini stat card for current reading */
function StatCard({ label, value, unit, trend, refMin, refMax }: {
  label: string; value: number | null; unit: string;
  trend: 'increasing' | 'decreasing' | 'stable'; refMin: number; refMax: number;
}) {
  const status = value !== null ? getStatus(value, refMin, refMax) : 'normal';
  const borderColor = status === 'normal' ? 'border-gray-100' : status === 'elevated' ? 'border-amber-200' : 'border-red-200';

  return (
    <div className={`section-card p-4 border ${borderColor} card-hover`}>
      <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
      {value !== null ? (
        <>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-black text-gray-900">{value % 1 === 0 ? value : value.toFixed(1)}</span>
            <span className="text-sm text-gray-400">{unit}</span>
          </div>
          <div className="flex items-center justify-between">
            <StatusBadge status={status} />
            <div className="flex items-center gap-0.5 text-xs text-gray-400">
              {trend === 'increasing' ? <TrendingUp size={11} className="text-red-400" /> :
               trend === 'decreasing' ? <TrendingDown size={11} className="text-green-400" /> :
               <Minus size={11} />}
              {trend}
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Normal: {refMin}–{refMax} {unit}</p>
        </>
      ) : (
        <p className="text-sm text-gray-300 italic">No data</p>
      )}
    </div>
  );
}

export default function HealthPage() {
  const { currentPatient } = usePatients();
  const [activeTab, setActiveTab]     = useState('blood_pressure_systolic');
  const [records, setRecords]         = useState<any[]>([]);
  const [allRecords, setAllRecords]   = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData]       = useState({ metric_type: 'blood_pressure_systolic', value: '', unit: 'mmHg', notes: '' });

  const fetchRecords = async (tab = activeTab) => {
    if (!currentPatient?.id) return;
    setLoading(true);
    try {
      const [specific, all] = await Promise.all([
        apiClient.get(`/api/health/records/${currentPatient.id}?metric_type=${tab}`),
        apiClient.get(`/api/health/records/${currentPatient.id}`),
      ]);
      setRecords(specific.data || []);
      setAllRecords(all.data || []);
    } catch { setRecords([]); setAllRecords([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRecords(activeTab);
    const tab = METRIC_TABS.find(t => t.id === activeTab);
    setFormData(p => ({ ...p, metric_type: activeTab, unit: tab?.unit || 'mmHg' }));
  }, [currentPatient?.id, activeTab]);

  const handleLogVital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient?.id || !formData.value) return;
    try {
      await apiClient.post('/api/health/records', {
        patient_id: currentPatient.id,
        metric_type: formData.metric_type,
        value: parseFloat(formData.value),
        unit: formData.unit,
        measurement_date: new Date().toISOString(),
        notes: formData.notes,
      });
      setIsModalOpen(false);
      toast.success(`Logged ${formData.value} ${formData.unit}`);
      setFormData(p => ({ ...p, value: '', notes: '' }));
      fetchRecords();
    } catch { toast.error('Failed to log reading'); }
  };

  const currentTab = METRIC_TABS.find(t => t.id === activeTab) || METRIC_TABS[0];

  /* Latest values for all metrics */
  const latestByType: Record<string, number> = {};
  allRecords.forEach(r => {
    if (!latestByType[r.metric_type]) latestByType[r.metric_type] = parseFloat(r.value);
  });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Vitals & Trends</h1>
          <p className="text-sm text-gray-500 mt-0.5">Clinical trend analysis with reference ranges from uploaded reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchRecords()} disabled={loading} className="btn-outline text-xs py-2 px-3">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary text-xs py-2 px-3">
            <Plus size={13} /> Log Reading
          </button>
        </div>
      </div>

      {/* ── All metrics overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {METRIC_TABS.slice(0, 4).map(tab => (
          <StatCard
            key={tab.id}
            label={tab.label}
            value={latestByType[tab.id] ?? null}
            unit={tab.unit}
            trend="stable"
            refMin={tab.refMin}
            refMax={tab.refMax}
          />
        ))}
      </div>

      {/* ── Metric tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {METRIC_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const val = latestByType[tab.id];
          const status = val !== undefined ? getStatus(val, tab.refMin, tab.refMax) : null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : status === 'abnormal'
                    ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                    : status === 'elevated'
                      ? 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {!isActive && status === 'abnormal' && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              {!isActive && status === 'elevated' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>

      {/* ── Chart + reference range ── */}
      <div className="section-card p-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-5">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{currentTab.label} — Trend Over Time</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Normal Range: <span className="font-semibold text-gray-600">{currentTab.normal} {currentTab.unit}</span>
              {records.length > 0 && (
                <span className="ml-3">{records.length} reading{records.length !== 1 ? 's' : ''} recorded</span>
              )}
            </p>
          </div>
          {latestByType[activeTab] !== undefined && (
            <StatusBadge status={getStatus(latestByType[activeTab], currentTab.refMin, currentTab.refMax)} />
          )}
        </div>
        <div className="h-64">
          <HealthChart readings={records} metric={currentTab.label} />
        </div>
      </div>

      {/* ── Readings table ── */}
      <div className="section-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">Historical Readings</h3>
        </div>
        {records.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-400">No readings logged yet for {currentTab.label}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Value</th>
                  <th className="px-5 py-3">Reference Range</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => {
                  const v = parseFloat(r.value);
                  const status = getStatus(v, currentTab.refMin, currentTab.refMax);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {new Date(r.measurement_date).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">
                        {v % 1 === 0 ? v : v.toFixed(1)} {r.unit}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {currentTab.refMin}–{currentTab.refMax} {currentTab.unit}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400 capitalize">
                        {r.extraction_method || 'manual'}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">{r.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Log modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log New Reading">
        <form onSubmit={handleLogVital} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Metric</label>
            <select
              value={formData.metric_type}
              onChange={e => {
                const t = METRIC_TABS.find(t => t.id === e.target.value);
                setFormData(p => ({ ...p, metric_type: e.target.value, unit: t?.unit || '' }));
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {METRIC_TABS.map(t => <option key={t.id} value={t.id}>{t.label} ({t.unit})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Value *</label>
              <Input type="number" step="0.1" required placeholder="e.g. 120"
                value={formData.value} onChange={e => setFormData(p => ({ ...p, value: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Unit</label>
              <Input disabled value={formData.unit} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
            <textarea
              rows={2} placeholder="e.g. After breakfast, resting"
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm">Save Reading</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
