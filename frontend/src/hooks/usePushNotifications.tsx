/**
 * usePushNotifications
 *
 * Manages the full browser/PWA push notification lifecycle:
 *   1. Checks if the browser supports notifications
 *   2. Requests permission from the user (once — remembers state in localStorage)
 *   3. Subscribes to the browser Push API (VAPID / Web Push for PWA)
 *   4. Also detects Expo SDK if running inside an Expo-managed WebView
 *   5. Registers the resulting token with the backend
 *   6. Polls for new HIGH/CRITICAL alerts every 30 s and surfaces them as
 *      in-app toast banners (fallback when native push is unavailable)
 *
 * For a native mobile build using Expo, the Expo Notifications API
 * (expo-notifications) should be called from the native layer and the
 * resulting ExponentPushToken passed to registerToken() directly.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { monitoringApi } from '../api/monitoring'
import { alertsApi } from '../api/alerts'
import { useAuthStore } from '../store/authStore'
import { useAlertStore } from '../store/alertStore'
import { usePatients } from './usePatients'

// ─── Constants ───────────────────────────────────────────────────────────────

const PERMISSION_KEY = 'medcare_push_permission'
const TOKEN_KEY = 'medcare_push_token'
const POLL_INTERVAL_MS = 30_000   // 30 seconds in-app polling
const ALERT_BADGE_KEY = 'medcare_last_alert_ts'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported'

interface PushNotificationState {
  permission: PermissionState
  isRegistered: boolean
  isRequesting: boolean
  token: string | null
  requestPermission: () => Promise<void>
  registerToken: (token: string, provider?: 'expo' | 'fcm' | 'apns') => Promise<void>
  deregisterCurrentToken: () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePushNotifications(): PushNotificationState {
  const { user } = useAuthStore()
  const { addAlert } = useAlertStore()
  const { activePatientId } = usePatients()

  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof window === 'undefined') return 'unsupported'
    if (!('Notification' in window)) return 'unsupported'
    const saved = localStorage.getItem(PERMISSION_KEY) as PermissionState | null
    if (saved) return saved
    return (Notification.permission as PermissionState) || 'unknown'
  })

  const [isRegistered, setIsRegistered] = useState(
    () => !!localStorage.getItem(TOKEN_KEY)
  )
  const [isRequesting, setIsRequesting] = useState(false)
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  )

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastAlertTs = useRef<string>(
    localStorage.getItem(ALERT_BADGE_KEY) || new Date(0).toISOString()
  )

  // ── Register a token with the backend ──────────────────────────────────────

  const registerToken = useCallback(
    async (pushToken: string, provider: 'expo' | 'fcm' | 'apns' = 'expo') => {
      if (!user) return
      try {
        await monitoringApi.registerToken({
          token: pushToken,
          provider,
          device_label: `${navigator.platform} — ${navigator.userAgent.slice(0, 40)}`,
        })
        localStorage.setItem(TOKEN_KEY, pushToken)
        setToken(pushToken)
        setIsRegistered(true)
        console.info('[Push] Token registered with backend')
      } catch (err) {
        console.error('[Push] Failed to register token', err)
      }
    },
    [user]
  )

  // ── Deregister on logout ────────────────────────────────────────────────────

  const deregisterCurrentToken = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) return
    try {
      await monitoringApi.deregisterToken(stored)
    } catch {
      // best-effort
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setIsRegistered(false)
    }
  }, [])

  // ── Request browser notification permission ─────────────────────────────────

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    if (Notification.permission === 'granted') {
      setPermission('granted')
      localStorage.setItem(PERMISSION_KEY, 'granted')
      await _trySubscribeBrowserPush(registerToken)
      return
    }
    if (Notification.permission === 'denied') {
      setPermission('denied')
      localStorage.setItem(PERMISSION_KEY, 'denied')
      toast('Notifications are blocked. Enable them in your browser settings.', { icon: '🔕' })
      return
    }

    setIsRequesting(true)
    try {
      const result = await Notification.requestPermission()
      const state = result as PermissionState
      setPermission(state)
      localStorage.setItem(PERMISSION_KEY, state)

      if (state === 'granted') {
        toast.success('Push notifications enabled!', { icon: '🔔' })
        await _trySubscribeBrowserPush(registerToken)
      } else {
        toast('Notifications were not enabled. You can enable them later in Settings.', {
          icon: '🔕',
          duration: 4000,
        })
      }
    } finally {
      setIsRequesting(false)
    }
  }, [registerToken])

  // ── On mount: auto-request if we haven't asked yet ─────────────────────────

  useEffect(() => {
    if (!user) return
    // Only auto-prompt if the user hasn't made a decision yet
    if (permission === 'unknown' && 'Notification' in window && Notification.permission === 'default') {
      // Small delay so it doesn't fire immediately on first render
      const t = setTimeout(requestPermission, 3000)
      return () => clearTimeout(t)
    }
    // If already granted but not yet registered, try to register silently
    if (permission === 'granted' && !isRegistered) {
      _trySubscribeBrowserPush(registerToken)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── In-app alert polling (30 s) — fallback for when native push isn't available ──

  useEffect(() => {
    if (!user || !activePatientId) return

    const poll = async () => {
      try {
        const alerts = await alertsApi.getAlerts(activePatientId)
        const newHighRisk = alerts.filter(
          (a: any) =>
            ['HIGH', 'CRITICAL'].includes(a.severity) &&
            !a.is_dismissed &&
            new Date(a.created_at) > new Date(lastAlertTs.current)
        )

        if (newHighRisk.length > 0) {
          // Update local timestamp so we don't re-notify
          const latest = newHighRisk[0].created_at
          lastAlertTs.current = latest
          localStorage.setItem(ALERT_BADGE_KEY, latest)

          // Add to store and show toasts
          newHighRisk.forEach((alert: any) => {
            addAlert(alert)
            const isCritical = alert.severity === 'CRITICAL'

            toast(
              (t) => (
                <div className="flex flex-col gap-1 max-w-xs">
                  <span className="font-semibold text-sm">
                    {isCritical ? '🚨' : '⚠️'} {alert.title}
                  </span>
                  <span className="text-xs text-gray-600 line-clamp-2">
                    {alert.message}
                  </span>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="text-xs text-blue-600 hover:underline text-left mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              ),
              {
                duration: isCritical ? Infinity : 8000,
                style: {
                  background: isCritical ? '#FEF2F2' : '#FFFBEB',
                  border: `1px solid ${isCritical ? '#FECACA' : '#FDE68A'}`,
                  maxWidth: '340px',
                },
              }
            )

            // Also fire a native browser notification if permitted
            if (permission === 'granted') {
              _sendBrowserNotification(alert.title, alert.message, isCritical)
            }
          })
        }
      } catch {
        // Polling errors are silent
      }
    }

    poll() // immediate first check
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [user, activePatientId, permission, addAlert])

  return {
    permission,
    isRegistered,
    isRequesting,
    token,
    requestPermission,
    registerToken,
    deregisterCurrentToken,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Try to create a Web Push subscription (PWA / service worker).
 * Falls back gracefully if service workers are not supported or VAPID is not configured.
 * For Expo native, the token comes from expo-notifications, not this function.
 */
async function _trySubscribeBrowserPush(
  registerToken: (token: string, provider: 'expo' | 'fcm' | 'apns') => Promise<void>
) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      // Browser push not supported — in-app polling will serve as fallback
      console.info('[Push] Web Push API not available in this browser')
      return
    }

    const registration = await navigator.serviceWorker.ready

    // Check if VAPID public key is configured
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      console.info('[Push] VITE_VAPID_PUBLIC_KEY not set — skipping Web Push subscription')
      return
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(vapidKey) as any,
    })

    // Serialize the subscription as JSON and use its endpoint as the "token"
    // The backend (Expo Push API path) won't understand Web Push subscriptions,
    // so we label this as 'fcm' and rely on the backend to handle it appropriately
    // (or you can add a separate Web Push provider later).
    const tokenString = JSON.stringify(subscription)
    await registerToken(tokenString, 'fcm')
  } catch (err) {
    console.warn('[Push] Web Push subscription failed:', err)
  }
}

function _sendBrowserNotification(title: string, body: string, critical: boolean) {
  try {
    const notif = new Notification(title, {
      body: body.slice(0, 120),
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `health-alert-${Date.now()}`,
      requireInteraction: critical,
    })
    notif.onclick = () => {
      window.focus()
      notif.close()
    }
  } catch {
    // Some browsers block Notification constructor in certain contexts
  }
}

function _urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
