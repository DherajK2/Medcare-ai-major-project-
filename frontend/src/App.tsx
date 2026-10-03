import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import PatientPage from './pages/PatientPage'
import FamilyPage from './pages/FamilyPage'
import DocumentsPage from './pages/DocumentsPage'
import HealthPage from './pages/HealthPage'
import ChatPage from './pages/ChatPage'
import MedicationsPage from './pages/MedicationsPage'
import AlertsPage from './pages/AlertsPage'
import DoctorsPage from './pages/DoctorsPage'
import EmergencyPage from './pages/EmergencyPage'
import MapPage from './pages/MapPage'
import SettingsPage from './pages/SettingsPage'
import ReportAnalyzer from './pages/ReportAnalyzer'
import MenstrualTrackerPage from './pages/MenstrualTrackerPage'
import VisualisePage from './pages/VisualisePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#F4F7FB]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { initialize } = useAuthStore()
  useEffect(() => { initialize() }, [initialize])

  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/"               element={<LandingPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/register"       element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/visualise"      element={<VisualisePage />} />

      {/* ── Protected app routes (all under /app) ── */}
      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index               element={<DashboardPage />} />
        <Route path="patients"     element={<PatientPage />} />
        <Route path="patients/:id" element={<PatientPage />} />
        <Route path="family"       element={<FamilyPage />} />
        <Route path="documents"    element={<DocumentsPage />} />
        <Route path="health"       element={<HealthPage />} />
        <Route path="chat"         element={<ChatPage />} />
        <Route path="medications"  element={<MedicationsPage />} />
        <Route path="alerts"       element={<AlertsPage />} />
        <Route path="doctors"      element={<DoctorsPage />} />
        <Route path="emergency"    element={<EmergencyPage />} />
        <Route path="map"          element={<MapPage />} />
        <Route path="settings"     element={<SettingsPage />} />
        <Route path="visualise"    element={<VisualisePage />} />
        <Route path="menstrual-tracker" element={<MenstrualTrackerPage />} />
        <Route path="report-analyzer" element={<ReportAnalyzer />} />
      </Route>

      {/* Legacy redirect — old routes still work */}
      <Route path="/dashboard"   element={<Navigate to="/app" replace />} />
      <Route path="/patients"    element={<Navigate to="/app/patients" replace />} />
      <Route path="/family"      element={<Navigate to="/app/family" replace />} />
      <Route path="/documents"   element={<Navigate to="/app/documents" replace />} />
      <Route path="/health"      element={<Navigate to="/app/health" replace />} />
      <Route path="/chat"        element={<Navigate to="/app/chat" replace />} />
      <Route path="/medications" element={<Navigate to="/app/medications" replace />} />
      <Route path="/alerts"      element={<Navigate to="/app/alerts" replace />} />
      <Route path="/doctors"     element={<Navigate to="/app/doctors" replace />} />
      <Route path="/emergency"   element={<Navigate to="/app/emergency" replace />} />
      <Route path="/map"         element={<Navigate to="/app/map" replace />} />
      <Route path="/settings"    element={<Navigate to="/app/settings" replace />} />
    </Routes>
  )
}
