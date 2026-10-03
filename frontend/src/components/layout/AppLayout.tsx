import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PatientSelector } from '../patient/PatientSelector';
import { NotificationPermissionBanner } from '../alerts/NotificationPermissionBanner';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { Bell, Menu, X, HeartPulse } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';
import { usePatients } from '../../hooks/usePatients';

function PushNotificationController() {
  usePushNotifications();
  return null;
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { alerts } = useAlertStore();
  const { activePatient } = usePatients();
  const unread = alerts.filter(a => !a.is_read && (a.severity === 'HIGH' || a.severity === 'CRITICAL')).length;

  return (
    <div className="flex h-screen bg-[#F4F7FB] overflow-hidden">
      <PushNotificationController />

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white border-r border-gray-100 shadow-lg
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:shadow-none
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <HeartPulse className="h-4.5 w-4.5 text-white" size={18} />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900">MedCare</span>
              <span className="text-base font-bold text-blue-600"> AI</span>
            </div>
          </Link>
          <button className="md:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-3">
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Bottom — patient chip */}
        {activePatient && (
          <div className="px-4 py-3 border-t border-gray-100 bg-blue-50/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Monitoring</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-[10px] font-bold">
                {activePatient.first_name?.[0]}{activePatient.last_name?.[0]}
              </div>
              <span className="text-xs font-semibold text-gray-700 truncate">
                {activePatient.first_name} {activePatient.last_name}
              </span>
              <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Active monitoring" />
            </div>
          </div>
        )}
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top header ── */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]">
          {/* Left: hamburger (mobile) */}
          <button
            className="md:hidden text-gray-500 hover:text-gray-700 mr-3"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          {/* Center title */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium hidden md:block">Family Health Platform</p>
          </div>

          {/* Right: patient selector + bell */}
          <div className="flex items-center gap-3">
            <PatientSelector />

            <Link to="/app/alerts" className="relative p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
            <NotificationPermissionBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
