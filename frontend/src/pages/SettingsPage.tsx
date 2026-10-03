import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { NotificationStatusBadge } from '../components/alerts/NotificationPermissionBanner';

export default function SettingsPage() {
  const { user, signOut } = useAuthStore();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-white p-6 rounded-xl border space-y-4">
        <p className="font-medium">Account Email:</p>
        <p className="text-gray-600">{user?.email}</p>

        <div className="border-t pt-4">
          <p className="font-medium mb-2">Push Notifications</p>
          <p className="text-sm text-gray-500 mb-3">
            Receive real-time alerts on this device when a patient's health metrics
            enter a high-risk range, based on their uploaded medical reports.
          </p>
          <NotificationStatusBadge />
        </div>

        <div className="border-t pt-4">
          <Button onClick={signOut} variant="danger">Sign Out</Button>
        </div>
      </div>
    </div>
  );
}