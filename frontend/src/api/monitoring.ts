import { apiClient } from './client'

export interface RegisterTokenPayload {
  token: string
  provider: 'expo' | 'fcm' | 'apns'
  device_label?: string
}

export interface MonitoringFinding {
  metric_type: string
  severity: 'HIGH' | 'CRITICAL'
  title: string
  message: string
  current_value: number
  unit: string
  threshold_type: string
}

export interface TriggerScanResult {
  patient_id: string
  patient_name: string
  findings_count: number
  findings: MonitoringFinding[]
  message: string
}

export interface NotificationDelivery {
  id: string
  channel: 'whatsapp' | 'sms' | 'push' | 'in_app' | 'email'
  status: 'sent' | 'delivered' | 'failed' | 'pending'
  provider: string
  phone?: string
  email?: string
  sent_at?: string
  error?: string
}

export const monitoringApi = {
  /** Register or update a push token for the current user's device */
  registerToken: (payload: RegisterTokenPayload) =>
    apiClient.post('/api/monitoring/devices/register', payload).then(r => r.data),

  /** Remove a push token (call on logout) */
  deregisterToken: (token: string) =>
    apiClient.delete('/api/monitoring/devices/deregister', { data: { token } }).then(r => r.data),

  /** List all active push tokens for the current user */
  listTokens: () =>
    apiClient.get('/api/monitoring/devices').then(r => r.data),

  /** Manually trigger a monitoring scan for a specific patient */
  triggerPatientScan: (patientId: string): Promise<TriggerScanResult> =>
    apiClient.post(`/api/monitoring/trigger/${patientId}`).then(r => r.data),

  /** Run a full scan across all active patients */
  triggerFullScan: () =>
    apiClient.post('/api/monitoring/trigger-all').then(r => r.data),

  /** Get notification delivery log for a specific alert */
  getAlertNotifications: (alertId: string): Promise<NotificationDelivery[]> =>
    apiClient.get(`/api/monitoring/alerts/${alertId}/notifications`).then(r => r.data),

  /** Send a test HIGH/CRITICAL alert + WhatsApp/SMS to the patient's family right now */
  sendTestAlert: (payload: {
    patient_id: string
    severity?: 'HIGH' | 'CRITICAL'
    metric_type?: string
    metric_value?: number
    custom_message?: string
  }) => apiClient.post('/api/monitoring/test-alert', payload).then(r => r.data),
}
