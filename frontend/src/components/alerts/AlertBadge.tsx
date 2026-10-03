import type { AlertSeverity } from '../../types/health';

export function AlertBadge({ severity }: { severity: AlertSeverity }) {
  const cls: Record<AlertSeverity, string> = {
    CRITICAL: 'badge-critical',
    HIGH:     'badge-abnormal',
    MEDIUM:   'badge-elevated',
    LOW:      'badge-normal',
    INFO:     'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200',
  };
  return <span className={cls[severity] ?? cls.INFO}>{severity}</span>;
}
