import { useState, useEffect } from 'react';
import { usePatients } from '../hooks/usePatients';
import { monitoringApi, type MonitoringFinding } from '../api/monitoring';
import { AlertCard } from '../components/alerts/AlertCard';
import { alertsApi } from '../api/alerts';
import { useAlertStore } from '../store/alertStore';
import type { Alert } from '../types/alert';
import {
  Activity, LoaderCircle, CircleCheck, TriangleAlert,
  ShieldAlert, RefreshCw, AlertTriangle, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

function SeverityRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm text-gray-700 font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-900">{count}</span>
    </div>
  );
}

export default function AlertsPage() {
  const { activePatientId, activePatient } = usePatients();
  const { addAlert } = useAlertStore();
  const [alerts, setAlerts]       = useState<Alert[]>([]);
  const [loading, setLoading]     = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [lastScan, setLastScan]   = useState<{ findings: MonitoringFinding[]; ts: string } | null>(null);

  const fetchAlerts = async () => {
    if (!activePatientId) {
      setAlerts([]); // Clear alerts when no patient selected
      return;
    }
    setLoading(true);
    try {
      const data = await alertsApi.getAlerts(activePatientId);
      setAlerts(data);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  // Clear alerts immediately when patient changes, then fetch new ones
  useEffect(() => {
    setAlerts([]); // Immediate cleanup to prevent showing wrong patient's alerts
    fetchAlerts();
  }, [activePatientId]);

  const runScan = async () => {
    if (!activePatientId) { toast.error('Select a patient first'); return; }
    setScanning(true);
    try {
      const result = await monitoringApi.triggerPatientScan(activePatientId);
      setLastScan({ findings: result.findings, ts: new Date().toLocaleTimeString() });
      if (result.findings_count === 0) {
        toast.success('All metrics within normal ranges ✅');
      } else {
        const crit = result.findings.filter(f => f.severity === 'CRITICAL').length;
        const high = result.findings.filter(f => f.severity === 'HIGH').length;
        toast(
          `${crit > 0 ? `🚨 ${crit} CRITICAL` : ''} ${high > 0 ? `⚠️ ${high} HIGH` : ''} risk findings detected`.trim(),
          { duration: 7000, style: { background: '#FEF2F2', border: '1px solid #FECACA' } }
        );
      }
      await fetchAlerts();
    } catch { toast.error('Scan failed. Try again.'); }
    finally { setScanning(false); }
  };

  /* Stats */
  const critical = alerts.filter(a => a.severity === 'CRITICAL').length;
  const high      = alerts.filter(a => a.severity === 'HIGH').length;
  const medium    = alerts.filter(a => a.severity === 'MEDIUM').length;
  const low       = alerts.filter(a => ['LOW', 'INFO'].includes(a.severity)).length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activePatient
              ? `Monitoring ${activePatient.first_name} ${activePatient.last_name} — real-time risk detection`
              : 'Select a patient to view alerts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAlerts} disabled={loading} className="btn-outline text-xs py-2 px-3">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={runScan} disabled={scanning || !activePatientId} className="btn-primary text-xs py-2 px-3">
            {scanning
              ? <><LoaderCircle size={13} className="animate-spin" /> Scanning…</>
              : <><Activity size={13} /> Run Health Scan</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Sidebar: stats + last scan ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Risk summary */}
          <div className="section-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-red-50 rounded-lg"><ShieldAlert size={15} className="text-red-500" /></div>
              <h2 className="text-sm font-bold text-gray-900">Alert Summary</h2>
            </div>
            <SeverityRow label="Critical"  count={critical} color="bg-red-500" />
            <SeverityRow label="High"      count={high}     color="bg-orange-400" />
            <SeverityRow label="Medium"    count={medium}   color="bg-amber-400" />
            <SeverityRow label="Low / Info" count={low}     color="bg-blue-400" />
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-400">Total alerts</span>
              <span className="text-sm font-bold text-gray-900">{alerts.length}</span>
            </div>
          </div>

          {/* Last scan result */}
          {lastScan && (
            <div className={`section-card p-4 ${
              lastScan.findings.length === 0 ? 'border-emerald-100' : 'border-amber-100'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {lastScan.findings.length === 0
                  ? <CircleCheck size={15} className="text-emerald-600" />
                  : <TriangleAlert size={15} className="text-amber-600" />}
                <span className="text-xs font-bold text-gray-700">Last Scan — {lastScan.ts}</span>
              </div>
              {lastScan.findings.length === 0 ? (
                <p className="text-xs text-emerald-600">All metrics within normal ranges ✅</p>
              ) : (
                <div className="space-y-2">
                  {lastScan.findings.map((f, i) => (
                    <div key={i} className={`rounded-lg p-2 text-xs ${
                      f.severity === 'CRITICAL' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      <span className="font-bold">{f.severity}</span> — {f.metric_type.replace(/_/g, ' ')}
                      <span className="ml-1 font-semibold">{f.current_value} {f.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monitoring status */}
          <div className="section-card p-4 border-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-gray-700">Auto-Monitor</span>
              <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Continuous scan runs every 5 min. HIGH/CRITICAL alerts trigger Email + WhatsApp alerts to family.
            </p>
          </div>
        </div>

        {/* ── Alert list ── */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="section-card p-12 text-center">
              <LoaderCircle size={28} className="mx-auto text-blue-400 animate-spin mb-3" />
              <p className="text-sm text-gray-400">Loading alerts…</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="section-card p-12 text-center">
              <CircleCheck size={44} className="mx-auto text-emerald-300 mb-3" />
              <p className="font-semibold text-gray-500">No active alerts</p>
              <p className="text-sm text-gray-400 mt-1">
                {activePatientId
                  ? 'All health metrics are within acceptable ranges.'
                  : 'Select a patient to view their alerts.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Critical first */}
              {alerts
                .slice()
                .sort((a, b) => {
                  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
                  return (order[a.severity as keyof typeof order] ?? 5) - (order[b.severity as keyof typeof order] ?? 5);
                })
                .map(alert => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
