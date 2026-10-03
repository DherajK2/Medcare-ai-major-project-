import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import { AlertPanel } from '../components/alerts/AlertPanel';
import { HealthChart } from '../components/health/HealthChart';
import { apiClient } from '../api/client';
import {
  Activity, Pill, FileText, MessageSquare, Phone, ArrowUpRight,
  Plus, TrendingUp, TrendingDown, Minus, Heart, Droplets,
  Thermometer, Wind, AlertTriangle, CircleCheck, TriangleAlert,
  ChevronRight, Upload, Clock
} from 'lucide-react';

/* ── Helpers ── */
function getMetricStatus(type: string, value: number): 'normal' | 'elevated' | 'abnormal' {
  const thresholds: Record<string, { high: number; low: number; critHigh?: number; critLow?: number }> = {
    blood_pressure_systolic:  { critHigh: 180, high: 140, low: 90,  critLow: 70  },
    blood_pressure_diastolic: { critHigh: 120, high: 90,  low: 60,  critLow: 40  },
    blood_glucose:            { critHigh: 400, high: 200, low: 70,  critLow: 54  },
    hba1c:                    { high: 7.5, low: 4.0 },
    heart_rate:               { critHigh: 150, high: 100, low: 55,  critLow: 40  },
    oxygen_saturation:        { high: 100, low: 92, critLow: 88 },
    hemoglobin:               { high: 18,  low: 9.0, critLow: 7.5 },
    temperature:              { critHigh: 40, high: 38.5, low: 36.0 },
  };
  const t = thresholds[type];
  if (!t) return 'normal';
  if ((t.critHigh && value >= t.critHigh) || (t.critLow && value <= t.critLow)) return 'abnormal';
  if ((t.high && value >= t.high) || (t.low && value <= t.low)) return 'elevated';
  return 'normal';
}

const BODY_SYSTEMS = [
  { name: 'Cardiovascular',   metrics: ['blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate'], icon: '❤️' },
  { name: 'Metabolic',        metrics: ['blood_glucose', 'hba1c', 'cholesterol_total'], icon: '🔬' },
  { name: 'Blood',            metrics: ['hemoglobin'], icon: '💉' },
  { name: 'Respiratory',      metrics: ['oxygen_saturation'], icon: '🫁' },
  { name: 'Temperature',      metrics: ['temperature'], icon: '🌡️' },
];

const METRIC_LABEL: Record<string, string> = {
  blood_pressure_systolic:  'Systolic BP',
  blood_pressure_diastolic: 'Diastolic BP',
  heart_rate:               'Heart Rate',
  blood_glucose:            'Blood Glucose',
  hba1c:                    'HbA1c',
  cholesterol_total:        'Cholesterol',
  hemoglobin:               'Hemoglobin',
  oxygen_saturation:        'SpO₂',
  temperature:              'Temperature',
};

const METRIC_UNIT: Record<string, string> = {
  blood_pressure_systolic:  'mmHg',
  blood_pressure_diastolic: 'mmHg',
  heart_rate:               'bpm',
  blood_glucose:            'mg/dL',
  hba1c:                    '%',
  cholesterol_total:        'mg/dL',
  hemoglobin:               'g/dL',
  oxygen_saturation:        '%',
  temperature:              '°C',
};

/* ── Status badge ── */
function StatusBadge({ status }: { status: 'normal' | 'elevated' | 'abnormal' }) {
  if (status === 'normal')   return <span className="badge-normal"><CircleCheck size={11} />Normal</span>;
  if (status === 'elevated') return <span className="badge-elevated"><TriangleAlert size={11} />Elevated</span>;
  return <span className="badge-abnormal"><AlertTriangle size={11} />Abnormal</span>;
}

/* ── Metric card ── */
function VitalCard({
  title, value, unit, icon: Icon, iconColor, status, trend
}: {
  title: string; value: string; unit: string; icon: React.ElementType;
  iconColor: string; status: 'normal' | 'elevated' | 'abnormal'; trend: string;
}) {
  const borderColor = status === 'normal' ? 'border-gray-100' : status === 'elevated' ? 'border-amber-200' : 'border-red-200';
  return (
    <div className={`metric-card card-hover border ${borderColor} animate-fade-in`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${iconColor}`}>
          <Icon size={18} />
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-400 font-medium">{unit}</span>}
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
        {trend === 'increasing' ? <TrendingUp size={12} className="text-red-400" /> :
         trend === 'decreasing' ? <TrendingDown size={12} className="text-green-400" /> :
         <Minus size={12} className="text-gray-400" />}
        <span>{trend === 'stable' ? 'Stable' : trend === 'increasing' ? 'Rising' : 'Falling'}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { activePatient, patients, loading } = usePatients();
  const [records, setRecords]       = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [recentDocs, setRecentDocs]   = useState<any[]>([]);

  useEffect(() => {
    if (!activePatient?.id) {
      setRecords([]);
      setMedications([]);
      setRecentDocs([]);
      return;
    }
    apiClient.get(`/api/health/records/${activePatient.id}`).then(r => setRecords(r.data || [])).catch(() => setRecords([]));
    apiClient.get(`/api/medications/${activePatient.id}`).then(r => setMedications(r.data || [])).catch(() => setMedications([]));
    apiClient.get(`/api/documents/${activePatient.id}`).then(r => setRecentDocs((r.data || []).slice(0, 3))).catch(() => setRecentDocs([]));
  }, [activePatient?.id]);

  /* Build metric map */
  const metricMap: Record<string, { value: number; unit: string }> = {};
  records.forEach(r => {
    if (!metricMap[r.metric_type]) {
      metricMap[r.metric_type] = { value: parseFloat(r.value), unit: r.unit };
    }
  });

  const get = (type: string) => metricMap[type];
  const bp = get('blood_pressure_systolic') && get('blood_pressure_diastolic')
    ? `${Math.round(get('blood_pressure_systolic')!.value)}/${Math.round(get('blood_pressure_diastolic')!.value)}`
    : get('blood_pressure_systolic') ? `${Math.round(get('blood_pressure_systolic')!.value)}/—` : '—';

  const bpStatus = get('blood_pressure_systolic')
    ? getMetricStatus('blood_pressure_systolic', get('blood_pressure_systolic')!.value)
    : 'normal';

  /* Health summary index */
  const allMetricValues = Object.entries(metricMap);
  const abnormalCount = allMetricValues.filter(([t, v]) => getMetricStatus(t, v.value) === 'abnormal').length;
  const elevatedCount = allMetricValues.filter(([t, v]) => getMetricStatus(t, v.value) === 'elevated').length;
  const normalCount   = allMetricValues.filter(([t, v]) => getMetricStatus(t, v.value) === 'normal').length;

  /* Body system table */
  const systemRows = BODY_SYSTEMS.map(sys => {
    const available = sys.metrics.filter(m => metricMap[m]);
    const abnormal  = available.filter(m => getMetricStatus(m, metricMap[m].value) === 'abnormal');
    const elevated  = available.filter(m => getMetricStatus(m, metricMap[m].value) === 'elevated');
    const sysStatus: 'normal' | 'elevated' | 'abnormal' =
      abnormal.length > 0 ? 'abnormal' : elevated.length > 0 ? 'elevated' : 'normal';
    const keyResults = [...abnormal, ...elevated].slice(0, 2)
      .map(m => `${METRIC_LABEL[m]} (${metricMap[m] ? Math.round(metricMap[m].value) : '?'} ${METRIC_UNIT[m] || ''})`);
    return { ...sys, total: available.length, outOfRange: abnormal.length + elevated.length, status: sysStatus, keyResults };
  }).filter(s => s.total > 0);

  const bpReadings = records.filter(r => r.metric_type === 'blood_pressure_systolic');

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Empty State for New Users with 0 Patients ── */}
      {patients.length === 0 && !loading && (
        <div className="bg-white border border-blue-100 rounded-2xl p-8 text-center shadow-sm space-y-4 my-2">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Heart size={32} />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900">Welcome to MedCare AI</h2>
            <p className="text-gray-500 text-sm mt-1">
              You don't have any patients or family members registered under this account yet. Add your first patient profile or upload a medical report to start 24/7 AI health monitoring.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to="/app/patients" className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl">
              <Plus size={16} /> Add First Patient
            </Link>
            <Link to="/app/documents" className="btn-outline flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl">
              <Upload size={16} /> Upload Medical Report
            </Link>
          </div>
        </div>
      )}

      {/* ── Patient hero ── */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 rounded-full px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Active Monitoring
              </span>
              {activePatient?.blood_type && (
                <span className="text-xs bg-white/15 rounded-full px-2.5 py-1 font-medium">
                  {activePatient.blood_type}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold">
              {activePatient ? `${activePatient.first_name} ${activePatient.last_name}` : 'No Patient Selected'}
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              {activePatient?.gender ? `${activePatient.gender} · ` : ''}
              {allMetricValues.length > 0
                ? `${allMetricValues.length} vitals tracked · Last updated just now`
                : activePatient ? 'Upload a medical report to start monitoring' : 'Add a patient to begin'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/app/chat" className="btn-outline bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs py-2 px-3">
              <MessageSquare size={14} /> AI Assistant
            </Link>
            <Link to="/app/documents" className="btn-outline bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs py-2 px-3">
              <Upload size={14} /> Upload Report
            </Link>
            <Link to="/app/emergency" className="btn-danger text-xs py-2 px-3">
              <Phone size={14} /> Emergency
            </Link>
          </div>
        </div>
      </div>

      {/* ── Health Summary Index ── */}
      {allMetricValues.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="section-card p-5 card-hover border-red-100">
            <p className="text-xs font-semibold text-gray-500 mb-1">Abnormal Tests</p>
            <p className="text-4xl font-black text-red-600">{abnormalCount}</p>
            <p className="text-xs text-gray-400 mt-1">Require attention</p>
          </div>
          <div className="section-card p-5 card-hover border-amber-100">
            <p className="text-xs font-semibold text-gray-500 mb-1">Elevated Tests</p>
            <p className="text-4xl font-black text-amber-500">{elevatedCount}</p>
            <p className="text-xs text-gray-400 mt-1">Monitor closely</p>
          </div>
          <div className="section-card p-5 card-hover border-emerald-100">
            <p className="text-xs font-semibold text-gray-500 mb-1">Normal Tests</p>
            <p className="text-4xl font-black text-emerald-600">{normalCount}</p>
            <p className="text-xs text-gray-400 mt-1">Within range</p>
          </div>
        </div>
      )}

      {/* ── Vitals grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <VitalCard title="Blood Pressure" value={bp} unit="mmHg" icon={Heart}
          iconColor="bg-red-50 text-red-500" status={bpStatus} trend="stable" />
        <VitalCard
          title="Blood Glucose" icon={Droplets} iconColor="bg-blue-50 text-blue-500"
          value={get('blood_glucose') ? `${Math.round(get('blood_glucose')!.value)}` : '—'}
          unit={get('blood_glucose') ? 'mg/dL' : ''}
          status={get('blood_glucose') ? getMetricStatus('blood_glucose', get('blood_glucose')!.value) : 'normal'}
          trend="stable"
        />
        <VitalCard
          title="Heart Rate" icon={Activity} iconColor="bg-pink-50 text-pink-500"
          value={get('heart_rate') ? `${Math.round(get('heart_rate')!.value)}` : '—'}
          unit={get('heart_rate') ? 'bpm' : ''}
          status={get('heart_rate') ? getMetricStatus('heart_rate', get('heart_rate')!.value) : 'normal'}
          trend="stable"
        />
        <VitalCard
          title="Oxygen (SpO₂)" icon={Wind} iconColor="bg-sky-50 text-sky-500"
          value={get('oxygen_saturation') ? `${Math.round(get('oxygen_saturation')!.value)}` : '—'}
          unit={get('oxygen_saturation') ? '%' : ''}
          status={get('oxygen_saturation') ? getMetricStatus('oxygen_saturation', get('oxygen_saturation')!.value) : 'normal'}
          trend="stable"
        />
      </div>

      {/* ── Body systems + chart + alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: body system table + chart */}
        <div className="lg:col-span-2 space-y-5">

          {/* Health Status by Body System */}
          {systemRows.length > 0 && (
            <div className="section-card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-bold text-gray-900">Health Status by Body System</h2>
                <p className="text-xs text-gray-500 mt-0.5">Based on uploaded medical reports</p>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="grid grid-cols-4 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50">
                  <span>System</span>
                  <span className="text-center">Out of Range</span>
                  <span className="text-center">Status</span>
                  <span>Key Results</span>
                </div>
                {systemRows.map(row => (
                  <div key={row.name}
                    className="grid grid-cols-4 px-5 py-3 items-center hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{row.icon}</span>
                      <span className="text-sm font-semibold text-gray-800">{row.name}</span>
                    </div>
                    <div className="text-center">
                      <span className={`text-sm font-bold ${
                        row.outOfRange > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {row.outOfRange}/{row.total}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {row.keyResults.length > 0 ? row.keyResults.join(', ') : (
                        <span className="text-emerald-500">All Normal</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-gray-50 flex justify-end">
                <Link to="/app/health" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  View detailed health data <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* BP Trend chart */}
          {bpReadings.length > 1 && (
            <div className="section-card p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Systolic BP Trend</h2>
                  <p className="text-xs text-gray-400">30-day analysis</p>
                </div>
                <Link to="/app/health" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  All vitals <ArrowUpRight size={13} />
                </Link>
              </div>
              <HealthChart readings={bpReadings} metric="Systolic Blood Pressure" />
            </div>
          )}

          {/* Medications + Documents row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="section-card p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50"><Pill size={14} className="text-blue-600" /></span>
                  Medications
                  <span className="text-xs font-normal bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">{medications.length}</span>
                </h3>
                <Link to="/app/medications" className="text-xs text-blue-600 font-semibold hover:underline">Manage</Link>
              </div>
              {medications.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">No active medications.</p>
              ) : (
                <div className="space-y-2">
                  {medications.slice(0, 4).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{m.name}
                          <span className="text-gray-400 font-normal ml-1">({m.dosage})</span>
                        </p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {m.frequency}
                        </p>
                      </div>
                      <span className="badge-normal text-[10px] py-0.5">Active</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="section-card p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50"><FileText size={14} className="text-indigo-600" /></span>
                  Documents
                </h3>
                <Link to="/app/documents" className="text-xs text-blue-600 font-semibold hover:underline">View all</Link>
              </div>
              {recentDocs.length === 0 ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-gray-400">No documents uploaded yet.</p>
                  <Link to="/app/documents" className="btn-primary text-xs py-1.5 px-3">
                    <Plus size={13} /> Upload Report
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentDocs.map((d: any) => (
                    <div key={d.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                      <span className="p-1.5 bg-indigo-50 rounded-lg"><FileText size={12} className="text-indigo-500" /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{d.file_name}</p>
                        <p className="text-[10px] text-gray-400">{new Date(d.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="badge-normal text-[10px] py-0.5">Processed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: alerts + quick actions */}
        <div className="space-y-5">
          <div className="section-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Recent Alerts</h2>
              <Link to="/app/alerts" className="text-xs text-blue-600 font-semibold hover:underline">View all</Link>
            </div>
            <div className="p-4">
              <AlertPanel patientId={activePatient?.id || null} />
            </div>
          </div>

          {/* Women's Health / Menstrual Tracker Card (Female Patients Only) */}
          {activePatient?.gender?.toLowerCase() === 'female' && (
            <div className="section-card p-5 border-pink-100 bg-gradient-to-br from-white via-pink-50/20 to-rose-50/30">
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-pink-100 text-pink-600">🌸</span>
                  Menstrual Health
                </h3>
                <Link to="/app/menstrual-tracker" className="text-xs text-pink-600 font-semibold hover:underline">Open Tracker</Link>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Track cycle phases, fertile window, ovulation forecasts, and hormonal wellness insights.
              </p>
              <Link
                to="/app/menstrual-tracker"
                className="flex items-center justify-between p-2.5 bg-white border border-pink-100 rounded-xl hover:bg-pink-50/50 transition-all text-xs font-bold text-pink-700 shadow-sm"
              >
                <span>View Active Cycle Phase</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* Quick actions */}
          <div className="section-card p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/app/report-analyzer', icon: '🔬', label: 'Analyze Report' },
                ...(activePatient?.gender?.toLowerCase() === 'female' ? [{ to: '/app/menstrual-tracker', icon: '🌸', label: 'Cycle Tracker' }] : []),
                { to: '/app/emergency', icon: '🩸', label: 'Blood Banks' },
                { to: '/app/documents', icon: '📄', label: 'Upload Lab' },
                { to: '/app/medications', icon: '💊', label: 'Add Med' },
                { to: '/app/chat', icon: '🎙️', label: 'AI Health Chat' },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-gray-100 rounded-xl transition-all text-center group">
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
