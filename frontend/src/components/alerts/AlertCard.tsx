import { useState } from 'react';
import { Card } from '../ui/Card';
import { AlertBadge } from './AlertBadge';
import type { Alert, NotificationDelivery } from '../../types/alert';
import { formatDate } from '../../utils/formatters';
import { monitoringApi } from '../../api/monitoring';
import {
  MessageSquare,
  Phone,
  Bell,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  CircleCheck,
  CircleX,
  Send,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
  sms:      <Phone         className="h-3.5 w-3.5" />,
  push:     <Bell          className="h-3.5 w-3.5" />,
  email:    <Mail          className="h-3.5 w-3.5" />,
  in_app:   <Bell          className="h-3.5 w-3.5" />,
};

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  sms:      'SMS',
  push:     'Push',
  email:    'Email',
  in_app:   'In-App',
};

function DeliveryBadge({ d }: { d: NotificationDelivery }) {
  const isWhatsApp = d.channel === 'whatsapp' || d.provider?.includes('whatsapp');
  const isSMS = d.channel === 'sms' || d.provider?.includes('sms');
  const isEmail = d.channel === 'email' || d.provider?.includes('email') || d.provider?.includes('smtp');
  const channelKey = isWhatsApp ? 'whatsapp' : isSMS ? 'sms' : isEmail ? 'email' : d.channel;
  const label = isWhatsApp ? 'WhatsApp' : isSMS ? 'SMS' : isEmail ? 'Email' : (CHANNEL_LABEL[d.channel] ?? d.channel);
  const ok = d.status === 'sent' || d.status === 'delivered';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
      title={d.error ?? (ok ? 'Dispatched successfully' : 'Failed to deliver')}
    >
      {CHANNEL_ICONS[channelKey] ?? <Bell className="h-3.5 w-3.5" />}
      {label}
      {ok
        ? <CircleCheck className="h-3 w-3 text-emerald-600" />
        : <CircleX     className="h-3 w-3 text-red-500" />}
      {d.phone ? (
        <span className="text-gray-500 font-mono text-[11px]">{d.phone.slice(-4)}</span>
      ) : d.email ? (
        <span className="text-gray-500 text-[11px] max-w-[140px] truncate">{d.email}</span>
      ) : null}
    </span>
  );
}

export function AlertCard({ alert }: { alert: Alert }) {
  const isHighRisk = alert.severity === 'HIGH' || alert.severity === 'CRITICAL';

  const [expanded,       setExpanded]       = useState(false);
  const [deliveries,     setDeliveries]     = useState<NotificationDelivery[] | null>(null);
  const [loadingLog,     setLoadingLog]     = useState(false);
  const [notifying,      setNotifying]      = useState(false);

  const loadDeliveries = async () => {
    if (deliveries !== null) { setExpanded(e => !e); return; }
    setLoadingLog(true);
    try {
      const data = await monitoringApi.getAlertNotifications(alert.id);
      setDeliveries(data);
      setExpanded(true);
    } catch {
      toast.error('Could not load delivery log');
    } finally {
      setLoadingLog(false);
    }
  };

  const notifyNow = async () => {
    setNotifying(true);
    try {
      const result = await monitoringApi.sendTestAlert({
        patient_id:   alert.patient_id,
        severity:     (alert.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'),
        metric_type:  alert.metric_type || 'health_metric',
        metric_value: alert.metric_value !== null && alert.metric_value !== undefined ? Number(alert.metric_value) : undefined,
        custom_message: alert.message,
      });
      toast.success(
        result.sent > 0
          ? `📧 Dispatched to ${result.sent} recipient(s) via Email & WhatsApp`
          : (result.message || 'Alert created — check family email & phone contacts'),
        { duration: 5000 }
      );
      if (result.results && Array.isArray(result.results)) {
        const waLinks = result.results.filter((r: any) => r.whatsapp_link).map((r: any) => r.whatsapp_link);
        if (waLinks.length > 0) {
          window.open(waLinks[0], '_blank');
        }
      }
      // Refresh delivery log
      const data = await monitoringApi.getAlertNotifications(result.alert_id ?? alert.id);
      setDeliveries(data);
      setExpanded(true);
    } catch (err: any) {
      console.error('Notify family error:', err);
      toast.error(err?.response?.data?.detail || 'Failed to send notification');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <Card
      className={`space-y-2 ${
        alert.severity === 'CRITICAL'
          ? 'border-red-300 bg-red-50'
          : alert.severity === 'HIGH'
          ? 'border-amber-300 bg-amber-50'
          : ''
      }`}
    >
      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {alert.title && (
            <p className="text-sm font-semibold text-gray-900 truncate">{alert.title}</p>
          )}
          <p className="text-sm text-gray-700 mt-0.5">{alert.message}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(alert.created_at)}</p>
        </div>
        <AlertBadge severity={alert.severity} />
      </div>

      {/* ── Action bar — only for HIGH / CRITICAL ── */}
      {isHighRisk && (
        <div className="flex items-center gap-2 pt-1 border-t border-current border-opacity-10">
          {/* Notify family now */}
          <button
            onClick={notifyNow}
            disabled={notifying}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5
                       text-xs font-medium text-white shadow-sm transition hover:bg-blue-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            title="Send Email & WhatsApp alerts to all family members now"
          >
            {notifying
              ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              : <MessageSquare className="h-3.5 w-3.5" />}
            {notifying ? 'Sending…' : 'Notify Family'}
          </button>

          {/* View delivery log */}
          <button
            onClick={loadDeliveries}
            disabled={loadingLog}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white
                       px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition
                       hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400
                       disabled:opacity-60"
          >
            {loadingLog
              ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              : expanded
              ? <ChevronUp   className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
            {loadingLog ? 'Loading…' : 'Delivery log'}
          </button>
        </div>
      )}

      {/* ── Delivery log ── */}
      {expanded && deliveries !== null && (
        <div className="pt-1">
          {deliveries.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No messages sent for this alert yet. Click "Notify Family" to send now.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {deliveries.map(d => (
                <DeliveryBadge key={d.id} d={d} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
