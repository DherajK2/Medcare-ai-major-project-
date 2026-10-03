import { NavLink } from 'react-router-dom';
import {
  Home, Users, FileText, Pill, Activity, MessageSquare,
  Bell, Map, AlertTriangle, Stethoscope, Settings, UsersRound, FileSearch, Heart
} from 'lucide-react';
import { usePatients } from '../../hooks/usePatients';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  danger?: boolean;
  pink?: boolean;
  badge?: string;
  femaleOnly?: boolean;
}

const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { path: '/app',          label: 'Dashboard',     icon: Home },
      { path: '/app/patients', label: 'Patients',      icon: Users },
      { path: '/app/family',   label: 'Family',        icon: UsersRound },
    ]
  },
  {
    title: 'Clinical',
    items: [
      { path: '/app/health',       label: 'Health Data',    icon: Activity },
      { path: '/app/medications',  label: 'Medications',    icon: Pill },
      { path: '/app/documents',    label: 'Documents',      icon: FileText },
      { path: '/app/doctors',      label: 'Doctors',        icon: Stethoscope },
      { path: '/app/menstrual-tracker', label: 'Menstrual Tracker', icon: Heart, pink: true, badge: '🌸', femaleOnly: true },
      { path: '/app/report-analyzer', label: 'Report Analyzer', icon: FileSearch },
    ]
  },
  {
    title: 'Communication',
    items: [
      { path: '/app/chat',    label: 'AI Assistant',  icon: MessageSquare },
      { path: '/app/alerts',  label: 'Alerts',        icon: Bell },
      { path: '/app/map',     label: 'Nearby Care',   icon: Map },
    ]
  },
  {
    title: 'Other',
    items: [
      { path: '/app/emergency', label: 'Emergency SOS',  icon: AlertTriangle, danger: true },
      { path: '/app/settings',  label: 'Settings',       icon: Settings },
    ]
  }
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { currentPatient } = usePatients();
  const isFemale = currentPatient?.gender?.toLowerCase() === 'female';

  return (
    <nav className="flex flex-col h-full px-3">
      {NAV_SECTIONS.map((section, si) => {
        const filteredItems = section.items.filter(item => !item.femaleOnly || isFemale);
        if (filteredItems.length === 0) return null;

        return (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {section.title && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {filteredItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/app'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? item.danger
                          ? 'bg-red-50 text-red-700'
                          : item.pink
                            ? 'bg-pink-50 text-pink-700 font-semibold'
                            : 'bg-blue-50 text-blue-700'
                        : item.danger
                          ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
                          : item.pink
                            ? 'text-pink-600 hover:bg-pink-50/80 hover:text-pink-800'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`p-1.5 rounded-lg ${
                        isActive
                          ? item.danger ? 'bg-red-100' : item.pink ? 'bg-pink-100 text-pink-600' : 'bg-blue-100'
                          : item.pink ? 'bg-pink-50 text-pink-500' : 'bg-gray-100'
                      }`}>
                        <item.icon size={15} />
                      </span>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          item.pink ? 'bg-pink-100 text-pink-700' : 'bg-red-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
