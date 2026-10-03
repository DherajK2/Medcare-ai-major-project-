import { AlertSeverity } from './health';

export interface Alert {
  id: string;
  patient_id: string;
  alert_type?: string;
  severity: AlertSeverity;
  title?: string;
  message: string;
  metric_type?: string;
  metric_value?: number;
  is_read?: boolean;
  read: boolean;
  created_at: string;
  type: 'health' | 'medication' | 'system' | 'appointment';
}

export interface NotificationDelivery {
  id: string;
  channel: 'whatsapp' | 'sms' | 'push' | 'in_app' | 'email';
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  provider: string;
  phone?: string;
  email?: string;
  sent_at?: string;
  error?: string;
}