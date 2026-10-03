/**
 * NotificationPermissionBanner
 *
 * A dismissible banner shown at the top of the app when push notifications
 * have not yet been enabled. It prompts the user to allow notifications and
 * shows the current registration status.
 */

import { useState } from 'react'
import { Bell, BellOff, X, CheckCircle, LoaderCircle } from 'lucide-react'
import { usePushNotifications } from '../../hooks/usePushNotifications'

export function NotificationPermissionBanner() {
  const { permission, isRegistered, isRequesting, requestPermission } = usePushNotifications()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if:
  // - user has already dismissed this session
  // - notifications are unsupported
  // - permission already denied (can't re-ask)
  // - already registered
  if (dismissed) return null
  if (permission === 'unsupported') return null
  if (permission === 'denied') return null
  if (permission === 'granted' && isRegistered) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="relative flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm"
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {permission === 'granted' && !isRegistered ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-amber-500" aria-hidden="true" />
        ) : (
          <Bell className="h-5 w-5 text-amber-500" aria-hidden="true" />
        )}
      </div>

      {/* Copy */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">
          Enable health monitoring alerts
        </p>
        <p className="mt-0.5 text-xs text-amber-700">
          Get notified instantly when a patient's health metrics enter a high-risk
          range — even when you're not on this page.
        </p>
      </div>

      {/* CTA */}
      <div className="shrink-0 flex items-center gap-2">
        {permission !== 'granted' && (
          <button
            onClick={requestPermission}
            disabled={isRequesting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 disabled:opacity-60"
          >
            {isRequesting ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isRequesting ? 'Enabling…' : 'Enable alerts'}
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss notification banner"
          className="rounded-md p-1 text-amber-400 hover:bg-amber-100 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}


/**
 * NotificationStatusBadge
 *
 * Small inline badge for the Settings page showing current push status.
 */
export function NotificationStatusBadge() {
  const { permission, isRegistered, isRequesting, requestPermission } = usePushNotifications()

  if (permission === 'unsupported') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <BellOff className="h-4 w-4" aria-hidden="true" />
        Push notifications not supported in this browser
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <BellOff className="h-4 w-4" aria-hidden="true" />
        Notifications blocked — enable them in browser settings
      </div>
    )
  }

  if (permission === 'granted' && isRegistered) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        Push notifications active
      </div>
    )
  }

  return (
    <button
      onClick={requestPermission}
      disabled={isRequesting}
      className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
    >
      {isRequesting ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Bell className="h-4 w-4" aria-hidden="true" />
      )}
      {isRequesting ? 'Enabling…' : 'Enable push notifications'}
    </button>
  )
}
