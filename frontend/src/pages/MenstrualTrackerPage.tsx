import React, { useState, useEffect } from 'react';
import { usePatients } from '../hooks/usePatients';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';
import {
  Heart,
  Calendar,
  Sparkles,
  Droplets,
  Plus,
  Flame,
  Activity,
  Smile,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Info,
  Trash2,
  Clock,
  Apple,
  Dumbbell,
  Moon,
  Sun,
  AlertCircle,
  Brain,
  Zap,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

const COMMON_SYMPTOMS = [
  'Cramps',
  'Bloating',
  'Headache',
  'Fatigue',
  'Back Pain',
  'Breast Tenderness',
  'Acne',
  'Nausea',
  'Cravings',
  'Insomnia'
];

const COMMON_MOODS = [
  'Calm 😌',
  'Happy 😊',
  'Energetic ⚡',
  'Sensitive 🥺',
  'Irritable 😤',
  'Anxious 😰',
  'Exhausted 😴',
  'Confident 💃'
];

interface Gynecologist {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  area: string;
  phone: string;
}

const MYSURU_GYNECOLOGISTS: Gynecologist[] = [
  { id: 'GYN001', name: 'Dr. K S Sowbhagyalakshmi', specialty: 'Obstetrics & Gynaecology', hospital: 'Apollo BGS Hospitals', area: 'Kuvempunagar', phone: '+91 80629 70067' },
  { id: 'GYN002', name: 'Dr. L V Vanitha', specialty: 'Obstetrics & Gynaecology', hospital: 'Apollo BGS Hospitals', area: 'Kuvempunagar', phone: '+91 80629 70068' },
  { id: 'GYN003', name: 'Dr. Rashmi M D', specialty: 'Obstetrics & Gynaecology', hospital: 'Apollo BGS Hospitals', area: 'Jayanagar / Kuvempunagar', phone: '+91 80690 49759' },
  { id: 'GYN004', name: 'Dr. Kavitha B', specialty: 'Obstetrics & Gynaecology', hospital: 'Apollo BGS Hospitals', area: 'Kuvempunagar', phone: '0821-2566666' },
  { id: 'GYN005', name: 'Dr. Nivedita Shetty', specialty: 'Obstetrician-Gynaecologist', hospital: 'Apollo Clinic', area: 'Vani Vilas Mohalla', phone: '+91 80690 49759' },
  { id: 'GYN006', name: 'Dr. Noor Farhana', specialty: 'Obstetrics & Gynaecology', hospital: "St. Joseph's Hospital", area: 'Mysuru', phone: '0821-2492222' },
  { id: 'GYN007', name: 'Dr. Suma K B', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN008', name: 'Dr. Poornima M', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN009', name: 'Dr. Rashmi H S', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN010', name: 'Dr. Sahana K', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN011', name: 'Dr. Sujatha M S', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN012', name: 'Dr. Chaithra C', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN013', name: 'Dr. Sapna H P', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN014', name: 'Dr. Mamatha S', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN015', name: 'Dr. SowmyaShree T', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN016', name: 'Dr. Sowmya K', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN017', name: 'Dr. Shrunga', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN018', name: 'Dr. Jayashree S', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN019', name: 'Dr. Hema Priya L', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN020', name: 'Dr. Maureen Pratiba Tigga', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN021', name: 'Dr. Meghana', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN022', name: 'Dr. Virupakshi Ajjammanavar', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN023', name: 'Dr. Madhuri N', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN024', name: 'Dr. Shruthi K R', specialty: 'Obstetrics & Gynaecology', hospital: 'JSS Hospital', area: 'Ramanuja Rd', phone: '0821-2335168' },
  { id: 'GYN025', name: 'Dr. Madhura Pathak', specialty: 'Gynaecology & Obstetrics', hospital: 'Motherhood Hospital', area: 'Devaraja Mohalla', phone: '0821-4288888' },
  { id: 'GYN026', name: 'Dr. Shwetha Nayak', specialty: 'Gynaecology & Obstetrics', hospital: 'Motherhood Hospital', area: 'Devaraja Mohalla', phone: '0821-4288888' },
  { id: 'GYN027', name: 'Dr. Asha M B', specialty: 'Gynaecology Consultant', hospital: 'S. S. Health & Neuro Care', area: 'Kuvempunagar', phone: '0821-2545981' },
  { id: 'GYN028', name: 'Dr. Soumya Patil', specialty: 'Obstetrics & Gynaecology', hospital: 'Sampoorna Health Care', area: 'Krishnamurthy Puram', phone: '+91 80732 69064' },
  { id: 'GYN029', name: 'Dr. Asma Farha', specialty: 'Obstetrics & Gynaecology', hospital: 'Bharath Clinic', area: 'Udayagiri', phone: '+91 88618 55551' },
  { id: 'GYN030', name: 'Dr. Swati Kumar Urs', specialty: 'Obstetrics & Gynaecology', hospital: 'Arya Arcade Clinic', area: 'Kuvempunagar', phone: '+91 89713 81725' },
  { id: 'GYN031', name: 'Dr. Amulya K G', specialty: 'Obstetrics & Gynaecology', hospital: 'Manipal Hospital', area: 'Bannimantap', phone: '+91 1800 102 4647' },
  { id: 'GYN032', name: 'Dr. Meghana', specialty: 'Obstetrics, Gynaecology & IVF Specialist', hospital: "Dr Meghana's Advanced Women's Healthcare & IVF", area: 'Kalyanagiri', phone: '+91 80889 67575' },
  { id: 'GYN033', name: 'Dr. Lokeshwari', specialty: "Women's Health & Gynaecology", hospital: "Lokeshwari's Women Care", area: 'N.R. Mohalla', phone: '+91 98866 06395' },
];

export default function MenstrualTrackerPage() {
  const { currentPatient, patients, setActivePatient } = usePatients();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Doctors directory state
  const [docSearch, setDocSearch] = useState('');
  const [docAreaFilter, setDocAreaFilter] = useState('all');

  // Form State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [flowIntensity, setFlowIntensity] = useState<'light' | 'medium' | 'heavy' | 'spotting'>('medium');
  const [painLevel, setPainLevel] = useState(2);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const fetchCycleData = async () => {
    if (!currentPatient?.id) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/menstrual/${currentPatient.id}`);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load menstrual tracker data', err);
      // Fallback local calculations if offline
      setData({
        patient_name: currentPatient.first_name,
        analytics: {
          has_data: false,
          current_cycle_day: 1,
          cycle_length_days: 28,
          period_duration_days: 5,
          current_phase: 'Unknown',
          phase_description: 'Log your last period start date to calculate your cycle phase and predictions.',
          days_until_next_period: null,
          phase_tips: [
            'Track your cycle start date to receive personalized hormonal and health forecasts.',
            'Maintain good hydration with 2-3 liters of water daily.',
            'Nutritious balanced diet helps regulate natural cycle rhythms.'
          ]
        },
        history: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycleData();
  }, [currentPatient?.id]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient?.id) return;
    try {
      setSubmitting(true);
      await apiClient.post('/api/menstrual', {
        patient_id: currentPatient.id,
        start_date: startDate,
        cycle_length_days: Number(cycleLength),
        period_duration_days: Number(periodDuration),
        flow_intensity: flowIntensity,
        pain_level: Number(painLevel),
        symptoms: selectedSymptoms,
        mood: selectedMoods,
        notes: notes || undefined
      });
      toast.success('Cycle entry logged successfully! 🌸');
      setIsLogModalOpen(false);
      setSelectedSymptoms([]);
      setSelectedMoods([]);
      setNotes('');
      fetchCycleData();
    } catch (err: any) {
      console.error('Failed to save cycle log', err);
      toast.error(err?.response?.data?.detail || 'Failed to save cycle log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this cycle log?')) return;
    try {
      await apiClient.delete(`/api/menstrual/${logId}`);
      toast.success('Log deleted');
      fetchCycleData();
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  const analytics = data?.analytics || {};
  const mlForecast = data?.ml_forecast || {};
  const isFemale = currentPatient?.gender?.toLowerCase() === 'female';
  const femalePatients = patients.filter((p) => p.gender?.toLowerCase() === 'female');

  // Filter Gynecologists
  const filteredGynecologists = MYSURU_GYNECOLOGISTS.filter((doc) => {
    const q = docSearch.toLowerCase();
    const matchesSearch =
      doc.name.toLowerCase().includes(q) ||
      doc.hospital.toLowerCase().includes(q) ||
      doc.area.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.phone.includes(q);

    if (!matchesSearch) return false;
    if (docAreaFilter === 'all') return true;
    if (docAreaFilter === 'Apollo') return doc.hospital.includes('Apollo');
    if (docAreaFilter === 'JSS') return doc.hospital.includes('JSS');
    if (docAreaFilter === 'Motherhood') return doc.hospital.includes('Motherhood');
    if (docAreaFilter === 'Kuvempunagar') return doc.area.includes('Kuvempunagar');
    if (docAreaFilter === 'Manipal') return doc.hospital.includes('Manipal');
    return true;
  });

  // Phase Theme Helpers
  const getPhaseColor = (phase: string) => {
    switch (phase?.toLowerCase()) {
      case 'menstrual phase':
      case 'menstrual':
        return {
          bg: 'bg-rose-500',
          text: 'text-rose-600',
          border: 'border-rose-200',
          gradient: 'from-rose-500 to-pink-600',
          pill: 'bg-rose-100 text-rose-700',
          tag: 'Menstruation'
        };
      case 'follicular phase':
      case 'follicular':
        return {
          bg: 'bg-emerald-500',
          text: 'text-emerald-600',
          border: 'border-emerald-200',
          gradient: 'from-emerald-500 to-teal-600',
          pill: 'bg-emerald-100 text-emerald-700',
          tag: 'Follicular (Estrogen Rise)'
        };
      case 'ovulation phase':
      case 'ovulation':
        return {
          bg: 'bg-fuchsia-500',
          text: 'text-fuchsia-600',
          border: 'border-fuchsia-200',
          gradient: 'from-fuchsia-500 to-pink-500',
          pill: 'bg-fuchsia-100 text-fuchsia-700',
          tag: 'Ovulation (Peak Fertility)'
        };
      case 'luteal phase':
      case 'luteal':
        return {
          bg: 'bg-purple-500',
          text: 'text-purple-600',
          border: 'border-purple-200',
          gradient: 'from-purple-500 to-indigo-600',
          pill: 'bg-purple-100 text-purple-700',
          tag: 'Luteal (Progesterone)'
        };
      default:
        return {
          bg: 'bg-pink-500',
          text: 'text-pink-600',
          border: 'border-pink-200',
          gradient: 'from-pink-500 to-rose-500',
          pill: 'bg-pink-100 text-pink-700',
          tag: 'Cycle Tracker'
        };
    }
  };

  const phaseTheme = getPhaseColor(analytics.current_phase || '');

  return (
    <div className="min-h-screen pb-16 space-y-6 max-w-6xl mx-auto">
      {/* ── Top Header with Soft Pink Glow ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 p-7 text-white shadow-xl shadow-pink-500/15">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-rose-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-lg">
                🌸
              </span>
              <h1 className="text-2xl font-black tracking-tight">Menstrual Health & Pregnancy Tracker</h1>
              <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur-md">
                Women's Wellness
              </span>
            </div>
            <p className="text-pink-100 text-sm max-w-xl">
              Intelligent hormonal cycle predictions, fertile window monitoring, daily symptom check-ins, and verified Mysuru gynecologists directory.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-pink-600 shadow-md transition-all hover:bg-pink-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={17} className="stroke-[2.5]" />
              Log Period / Symptoms
            </button>
          </div>
        </div>
      </div>

      {/* ── Patient Switcher Banner if Male Profile Active ── */}
      {!isFemale && (
        <div className="rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50/90 via-rose-50/50 to-purple-50/80 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-pink-900 font-bold text-sm">
                <Info size={17} className="text-pink-600 flex-shrink-0" />
                <span>Viewing profile for {currentPatient?.first_name} {currentPatient?.last_name} ({currentPatient?.gender || 'Male'})</span>
              </div>
              <p className="text-xs text-pink-700">
                Menstrual cycle logging and ovulation forecasts are tailored for female patient profiles. Switch to a female family member below:
              </p>
            </div>

            {femalePatients.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                {femalePatients.map((fp) => (
                  <button
                    key={fp.id}
                    onClick={() => setActivePatient(fp.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                  >
                    <span>🌸 Switch to {fp.first_name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs font-medium text-pink-600 bg-pink-100/60 px-3 py-1 rounded-xl">
                Add a female family member in the Patients tab
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Main Dashboard Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Cycle Dial & Key Status (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Cycle Dial Card */}
          <Card className="relative overflow-hidden border-pink-100/80 bg-white/90 shadow-sm backdrop-blur-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Circular Phase Dial */}
              <div className="relative flex h-48 w-48 sm:h-52 sm:w-52 items-center justify-center">
                <div
                  className={`absolute inset-0 rounded-full bg-gradient-to-tr ${phaseTheme.gradient} opacity-20 blur-xl animate-pulse`}
                />
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="stroke-pink-100"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className={`stroke-current ${phaseTheme.text} transition-all duration-1000 ease-out`}
                    strokeWidth="7"
                    strokeDasharray={264}
                    strokeDashoffset={
                      analytics.has_data
                        ? 264 - (264 * (analytics.current_cycle_day || 1)) / (analytics.cycle_length_days || 28)
                        : 264 - (264 * 1) / 28
                    }
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center p-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
                    Cycle Day
                  </span>
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                    {analytics.has_data ? analytics.current_cycle_day : '—'}
                  </span>
                  <span className="text-xs text-gray-500 font-medium mt-0.5">
                    of {analytics.cycle_length_days || 28} days
                  </span>
                </div>
              </div>

              {/* Phase Details & Predictions */}
              <div className="flex-1 space-y-4 text-center sm:text-left">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide bg-pink-100 text-pink-700 mb-2">
                    <Sparkles size={13} />
                    {analytics.current_phase || 'Awaiting Cycle Data'}
                  </div>
                  <h2 className="text-xl font-black text-gray-900">
                    {analytics.current_phase === 'Unknown'
                      ? 'No Period Logged Yet'
                      : analytics.current_phase}
                  </h2>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    {analytics.phase_description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-3">
                    <span className="text-[11px] font-semibold text-pink-600 uppercase tracking-wider block">
                      Next Period In
                    </span>
                    <span className="text-lg font-bold text-gray-900 mt-0.5 block">
                      {analytics.days_until_next_period !== null
                        ? `${analytics.days_until_next_period} Days`
                        : '—'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {analytics.next_period_date
                        ? new Date(analytics.next_period_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'Set start date'}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3">
                    <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
                      Pregnancy Chance
                    </span>
                    <span className="text-sm font-bold text-gray-900 mt-1 block truncate">
                      {analytics.pregnancy_chance || 'Normal'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {analytics.fertile_window_start ? 'Fertile window active' : 'Low fertility'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Fertile Window & Ovulation Timeline Card */}
          <Card className="border-pink-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <Calendar size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Estimated Fertile Window & Ovulation</h3>
                  <p className="text-xs text-gray-500">Hormonal forecast based on {analytics.cycle_length_days || 28}-day cycle</p>
                </div>
              </div>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                Fertility Lens
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 p-4 border border-rose-100">
                <div className="flex items-center gap-2 text-rose-700 mb-1">
                  <Droplets size={15} />
                  <span className="text-xs font-bold uppercase">Period Expected</span>
                </div>
                <p className="text-sm font-extrabold text-gray-900">
                  {analytics.next_period_date
                    ? new Date(analytics.next_period_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'Log period'}
                </p>
                <span className="text-[10px] text-gray-500 mt-1 block">Duration ~ {analytics.period_duration_days || 5} days</span>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-fuchsia-50 to-purple-50 p-4 border border-fuchsia-100">
                <div className="flex items-center gap-2 text-fuchsia-700 mb-1">
                  <Sparkles size={15} />
                  <span className="text-xs font-bold uppercase">Peak Ovulation</span>
                </div>
                <p className="text-sm font-extrabold text-gray-900">
                  {analytics.ovulation_date
                    ? new Date(analytics.ovulation_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Calculated at Day 14'}
                </p>
                <span className="text-[10px] text-gray-500 mt-1 block">Highest conception chance</span>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 p-4 border border-purple-100">
                <div className="flex items-center gap-2 text-purple-700 mb-1">
                  <Heart size={15} />
                  <span className="text-xs font-bold uppercase">Fertile Range</span>
                </div>
                <p className="text-sm font-extrabold text-gray-900">
                  {analytics.fertile_window_start && analytics.fertile_window_end
                    ? `${new Date(analytics.fertile_window_start).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })} – ${new Date(analytics.fertile_window_end).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}`
                    : '6-day window'}
                </p>
                <span className="text-[10px] text-gray-500 mt-1 block">High fertility probability</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: AI Phase Guidance & Wellness Tips (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-pink-100/90 bg-gradient-to-br from-white via-rose-50/30 to-pink-50/50 p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
                <Sparkles size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Cycle Care & Hormone Tips</h3>
                <p className="text-xs text-gray-500">Customized for {analytics.current_phase || 'Your Cycle'}</p>
              </div>
            </div>

            <div className="space-y-3">
              {(analytics.phase_tips || []).map((tip: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl border border-pink-100/60 bg-white/80 p-3.5 shadow-sm transition-all hover:bg-white"
                >
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 text-xs font-bold">
                    {idx === 0 ? <Apple size={13} /> : idx === 1 ? <Dumbbell size={13} /> : <Moon size={13} />}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>

            {/* Daily Nutrition & Wellness Checklist */}
            <div className="mt-5 rounded-2xl bg-white p-4 border border-pink-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-2.5 flex items-center gap-1.5">
                <ShieldCheck size={14} /> Recommended Daily Focus
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1.5 bg-pink-50/50 rounded-xl p-2">
                  <span>💧</span> 2.5L Water Intake
                </div>
                <div className="flex items-center gap-1.5 bg-pink-50/50 rounded-xl p-2">
                  <span>🥬</span> Iron & Leafy Greens
                </div>
                <div className="flex items-center gap-1.5 bg-pink-50/50 rounded-xl p-2">
                  <span>🥑</span> Healthy Fats (Omega 3)
                </div>
                <div className="flex items-center gap-1.5 bg-pink-50/50 rounded-xl p-2">
                  <span>🧘‍♀️</span> Mindful Breathing
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── SECTION: Machine Learning Cycle Forecasting & Pattern Intelligence ── */}
      <div className="space-y-4 pt-4 border-t border-pink-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm">
              <Brain size={19} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">
                  ML Cycle Forecasting & Pattern Discovery
                </h3>
                <span className="bg-purple-100 text-purple-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
                  Bayesian-EWMA Model
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                Adaptive machine learning model trained on {mlForecast.total_logs_trained || 0} historical cycle entries with dynamic variance estimation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <Zap size={13} className="text-emerald-600" />
              {mlForecast.model_confidence_percentage || 85}% Model Confidence
            </span>
          </div>
        </div>

        {/* ML Learned Biomarkers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 bg-gradient-to-br from-white to-purple-50/40 border-purple-100 shadow-2xs">
            <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
              Predicted Cycle Length
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-gray-900">
                {mlForecast.predicted_cycle_length_days || 28}
              </span>
              <span className="text-xs text-gray-500 font-medium">Days</span>
            </div>
            <span className="text-[10px] text-purple-700 font-medium mt-1 block">
              ± {mlForecast.cycle_variance_std_dev_days || 1.8}d adaptive variance
            </span>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-white to-rose-50/40 border-rose-100 shadow-2xs">
            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
              Predicted Bleeding
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-gray-900">
                {mlForecast.predicted_period_duration_days || 5}
              </span>
              <span className="text-xs text-gray-500 font-medium">Days</span>
            </div>
            <span className="text-[10px] text-rose-700 font-medium mt-1 block">
              Typical flow duration
            </span>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-white to-indigo-50/40 border-indigo-100 shadow-2xs">
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
              Cycle Regularity
            </span>
            <span className="text-base font-bold text-gray-900 mt-1 block truncate">
              {mlForecast.regularity_status || 'Normal Variation'}
            </span>
            <span className="text-[10px] text-indigo-700 font-medium mt-1 block">
              Hormonal stability index
            </span>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-white to-amber-50/40 border-amber-100 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
              Mean Pain Index
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-gray-900">
                {mlForecast.average_pain_level || 2.0}
              </span>
              <span className="text-xs text-gray-500 font-medium">/ 10</span>
            </div>
            <span className="text-[10px] text-amber-700 font-medium mt-1 block">
              Dysmenorrhea severity trend
            </span>
          </Card>
        </div>

        {/* Next 3 Cycles Machine Learning Timeline */}
        {mlForecast.forecasted_cycles && mlForecast.forecasted_cycles.length > 0 && (
          <Card className="p-5 border-pink-100 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-pink-600" />
                <h4 className="text-sm font-bold text-gray-900">
                  Forward 3-Cycle Predictive Timeline
                </h4>
              </div>
              <span className="text-[11px] text-gray-500">
                Machine Learning Projections
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {mlForecast.forecasted_cycles.map((fc: any) => (
                <div
                  key={fc.cycle_number}
                  className={`p-4 rounded-2xl border transition-all ${
                    fc.cycle_number === 1
                      ? 'bg-gradient-to-b from-pink-50/80 to-white border-pink-200 shadow-2xs'
                      : 'bg-gray-50/60 border-gray-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-pink-700 bg-pink-100/80 px-2 py-0.5 rounded-md">
                      {fc.cycle_number === 1
                        ? 'Next Cycle (Upcoming)'
                        : `Cycle +${fc.cycle_number - 1}`}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {fc.confidence_percentage}% Confidence
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-500 text-[11px]">Predicted Period Start:</span>
                      <p className="font-bold text-gray-900 text-sm">
                        {new Date(fc.start_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] space-y-1">
                      <div className="flex justify-between items-center text-purple-900 font-semibold">
                        <span>🌸 Ovulation:</span>
                        <span>
                          {new Date(fc.ovulation_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-purple-700">
                        <span>⚡ Fertile Window:</span>
                        <span>
                          {new Date(fc.fertile_window_start).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })} – {new Date(fc.fertile_window_end).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Learned Symptom Likelihood & Clinical Guidance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Symptom Probabilities */}
          <Card className="p-5 border-pink-100 bg-white shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Activity size={14} className="text-pink-600" />
              Symptom Pattern Probabilities (Learned from Logs)
            </h4>

            {mlForecast.symptom_predictions && mlForecast.symptom_predictions.length > 0 ? (
              <div className="space-y-2.5">
                {mlForecast.symptom_predictions.map((sp: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800">{sp.symptom}</span>
                      <span className="font-bold text-pink-600">{sp.probability}% Likelihood</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${sp.probability}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Typical Phase: {sp.typical_phase}</span>
                      <span>Logged in {sp.frequency_logged} cycles</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-3">
                Log symptoms (cramps, bloating, mood changes) in your daily tracker to train personalized symptom prediction curves.
              </p>
            )}
          </Card>

          {/* Clinical Insights & Guidance */}
          <Card className="p-5 border-pink-100 bg-gradient-to-br from-white to-pink-50/30 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Hormonal Health & Clinical Guidance
            </h4>
            <div className="p-3.5 rounded-2xl bg-white border border-pink-100 text-xs text-gray-700 space-y-2">
              <p className="leading-relaxed">
                {mlForecast.clinical_guidance || 'Your cycle logs demonstrate consistent hormonal rhythms.'}
              </p>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                {(mlForecast.recommended_lifestyle || []).map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-pink-500">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── SECTION: 33 Verified Mysuru Gynecologists & Obstetricians Directory ── */}
      <div className="space-y-4 pt-4 border-t border-pink-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
                🌸
              </span>
              <h3 className="text-lg font-bold text-gray-900">
                Mysuru Gynecologists & Obstetricians Directory
              </h3>
              <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[11px] font-bold text-pink-700">
                33 Specialists
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">
              Verified specialists across Apollo BGS, JSS Hospital, Motherhood, Manipal, and leading clinics in Mysuru.
            </p>
          </div>
        </div>

        {/* Doctor Search & Locality Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by doctor name, hospital (e.g. Apollo, JSS, Motherhood), area..."
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              className="w-full rounded-xl border border-pink-200 pl-4 pr-3 py-2 text-xs focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all', label: `All (${MYSURU_GYNECOLOGISTS.length})` },
              { key: 'Apollo', label: 'Apollo BGS / Clinic' },
              { key: 'JSS', label: 'JSS Hospital (18)' },
              { key: 'Motherhood', label: 'Motherhood Hospital' },
              { key: 'Kuvempunagar', label: 'Kuvempunagar' },
              { key: 'Manipal', label: 'Manipal' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setDocAreaFilter(f.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  docAreaFilter === f.key
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'bg-pink-50/80 text-pink-700 hover:bg-pink-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gynecologist Cards Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGynecologists.map((doc) => (
            <Card
              key={doc.id}
              className="p-4 border border-pink-100/90 bg-white flex flex-col justify-between hover:shadow-md hover:border-pink-300 transition-all rounded-2xl"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm leading-tight">
                      {doc.name}
                    </h4>
                    <p className="text-xs text-pink-600 font-medium mt-0.5">
                      {doc.specialty}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">
                    {doc.id}
                  </span>
                </div>

                <div className="space-y-1 pt-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5 text-gray-800 font-semibold">
                    <span>🏥</span>
                    <span>{doc.hospital}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <span>📍</span>
                    <span>{doc.area}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-pink-50 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${doc.phone.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 py-2 text-xs font-bold transition-colors shadow-sm"
                >
                  <span>📞</span>
                  <span>Call Doctor</span>
                </a>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${doc.name} ${doc.hospital} ${doc.area} Mysuru`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 text-xs font-semibold transition-colors"
                >
                  <span>🗺️ Directions</span>
                </a>
              </div>
            </Card>
          ))}
        </div>

        {filteredGynecologists.length === 0 && (
          <div className="p-8 text-center bg-pink-50/50 rounded-2xl border border-pink-200 text-pink-700 text-xs">
            No specialists matched your search query "{docSearch}". Try searching by doctor name or hospital.
          </div>
        )}
      </div>

      {/* ── Cycle History & Symptom Log Section ── */}
      <div className="space-y-4 pt-4 border-t border-pink-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
              <Clock size={15} />
            </span>
            <h3 className="text-base font-bold text-gray-900">Period & Symptom History Log</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {data?.history?.length || 0} entries recorded
          </span>
        </div>

        {data?.history && data.history.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.history.map((log: any) => (
              <Card
                key={log.id}
                className="border-pink-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-pink-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                        <Droplets size={14} />
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {new Date(log.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 block">
                      Cycle: {log.cycle_length_days} days • Duration: {log.period_duration_days} days
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 capitalize">
                      {log.flow_intensity} Flow
                    </span>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-3.5 space-y-2 border-t border-gray-100 pt-3">
                  {log.symptoms && log.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {log.symptoms.map((s: string, si: number) => (
                        <span
                          key={si}
                          className="rounded-lg bg-pink-50 px-2 py-0.5 text-[10px] font-medium text-pink-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {log.mood && log.mood.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {log.mood.map((m: string, mi: number) => (
                        <span
                          key={mi}
                          className="rounded-lg bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {log.notes && (
                    <p className="text-xs text-gray-600 italic bg-gray-50 rounded-xl p-2 mt-2">
                      "{log.notes}"
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-pink-100 bg-gradient-to-br from-pink-50/40 via-white to-rose-50/40 p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-100 text-pink-500 shadow-inner mb-3">
              🌸
            </div>
            <h4 className="text-base font-bold text-gray-900">No menstrual records logged yet</h4>
            <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
              Start tracking your cycle start date, flow intensity, and daily symptoms to receive custom hormonal forecasts and fertility calculations.
            </p>
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:scale-105"
            >
              <Plus size={15} />
              Log First Cycle Now
            </button>
          </Card>
        )}
      </div>

      {/* ── Log Cycle Modal ── */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="🌸 Log Period & Menstrual Cycle"
      >
        <form onSubmit={handleSaveLog} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Period Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Cycle Length (Days)
              </label>
              <input
                type="number"
                min="20"
                max="50"
                value={cycleLength}
                onChange={(e) => setCycleLength(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Period Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={periodDuration}
                onChange={(e) => setPeriodDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
              />
            </div>
          </div>

          {/* Flow Intensity */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Flow Intensity
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['spotting', 'light', 'medium', 'heavy'] as const).map((flow) => (
                <button
                  type="button"
                  key={flow}
                  onClick={() => setFlowIntensity(flow)}
                  className={`rounded-xl border py-2 text-xs font-bold capitalize transition-all ${
                    flowIntensity === flow
                      ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {flow === 'spotting' ? '💧 Spotting' : flow === 'light' ? '🩸 Light' : flow === 'medium' ? '🩸🩸 Medium' : '🩸🩸🩸 Heavy'}
                </button>
              ))}
            </div>
          </div>

          {/* Symptoms Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Symptoms Experienced
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((symptom) => {
                const isSelected = selectedSymptoms.includes(symptom);
                return (
                  <button
                    type="button"
                    key={symptom}
                    onClick={() => toggleSymptom(symptom)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-pink-500 bg-pink-500 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-pink-50 hover:border-pink-200'
                    }`}
                  >
                    {symptom}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Mood & Energy
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_MOODS.map((mood) => {
                const isSelected = selectedMoods.includes(mood);
                return (
                  <button
                    type="button"
                    key={mood}
                    onClick={() => toggleMood(mood)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-purple-50 hover:border-purple-200'
                    }`}
                  >
                    {mood}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Personal Notes / Observations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Started morning with mild fatigue, warm herbal tea helped..."
              className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-2 text-xs font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Cycle Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
