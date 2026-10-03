import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Shield, Heart, Activity, FileText, Users, Zap, CheckCircle, Upload, ArrowRight } from 'lucide-react';
import heartPreview from '../../assets/Heart_corosol.png';
import brainPreview from '../../assets/Brain_corosol.png';
import lungsPreview from '../../assets/Lungs_corosol.png';
import liverPreview from '../../assets/Liver_corosol.png';
import kidneysPreview from '../../assets/Kidney_corosol.png';
import eyesPreview from '../../assets/Eyes_corosol.png';
import intestinePreview from '../../assets/Intestine_corosol.png';
import pancreasPreview from '../../assets/Pancrease_corosol.png';
import skinPreview from '../../assets/Skin_corosol.png';

// ── Brand logo (same as login) ───────────────────────────────────────────────
function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#1E40AF" />
      <circle cx="30" cy="30" r="22" fill="#3B82F6" />
      <circle cx="70" cy="30" r="22" fill="#60A5FA" />
      <circle cx="50" cy="68" r="22" fill="#93C5FD" />
      <circle cx="50" cy="50" r="14" fill="white" />
    </svg>
  );
}

// ── How it works illustration (upload → analyze → monitor → alert) ───────────
function HowItWorks() {
  const steps = [
    { icon: Upload,   label: 'Upload Report',     sub: 'PDF, image, or doc',        color: 'bg-blue-500'   },
    { icon: Activity, label: 'AI Analyzes',        sub: 'Extracts vitals & meds',    color: 'bg-indigo-500' },
    { icon: Shield,   label: 'Monitor 24/7',       sub: 'Every 5 min check',         color: 'bg-violet-500' },
    { icon: Zap,      label: 'Instant Alert',      sub: 'Email & WhatsApp to family',  color: 'bg-green-500'  },
  ];

  return (
    <div className="grid w-full max-w-sm grid-cols-4 gap-2 mx-auto">
      {steps.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col items-center text-center">
          <div className="flex flex-col items-center">
            <div className={`h-9 w-9 rounded-full ${s.color} flex items-center justify-center shrink-0 shadow-lg`}>
              <s.icon className="h-4.5 w-4.5 text-white" size={18} />
            </div>
          </div>
          <div className="mt-2 min-w-0">
            <div className="truncate text-[11px] font-semibold text-white">{s.label}</div>
            <div className="mt-0.5 text-[9px] leading-tight text-blue-200">{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Patient card preview ─────────────────────────────────────────────────────
function PatientCard() {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 w-full max-w-xs mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-300 to-blue-500 flex items-center justify-center text-white font-bold text-sm">RS</div>
        <div>
          <div className="text-white text-sm font-semibold">Rahul Sharma</div>
          <div className="text-blue-200 text-xs">Patient • Active monitoring</div>
        </div>
        <div className="ml-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'BP',        val: '128/82',   color: 'text-yellow-300', status: '⚠' },
          { label: 'Glucose',   val: '98 mg/dL', color: 'text-green-300',  status: '✓' },
          { label: 'HbA1c',     val: '6.2%',     color: 'text-green-300',  status: '✓' },
        ].map(m => (
          <div key={m.label} className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-blue-200 text-[10px]">{m.label}</div>
            <div className={`text-xs font-bold mt-0.5 ${m.color}`}>{m.val}</div>
            <div className="text-[10px] mt-0.5">{m.status}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
        <Zap className="h-3 w-3 text-red-300 shrink-0" />
        <span className="text-red-200 text-[11px]">Alert sent to family — BP slightly elevated</span>
      </div>
    </div>
  );
}

const visualizerOrgans = [
  { id: 'heart', name: 'Heart', image: heartPreview },
  { id: 'brain', name: 'Brain', image: brainPreview },
  { id: 'lungs', name: 'Lungs', image: lungsPreview },
  { id: 'liver', name: 'Liver', image: liverPreview },
  { id: 'kidneys', name: 'Kidneys', image: kidneysPreview },
  { id: 'eyes', name: 'Eye', image: eyesPreview },
  { id: 'intestine', name: 'Intestine', image: intestinePreview },
  { id: 'pancreas', name: 'Pancreas', image: pancreasPreview },
  { id: 'skin', name: 'Skin', image: skinPreview },
];

function HealthVisualizerCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const dragStart = useRef<number | null>(null);
  const activeOrgan = visualizerOrgans[activeIndex];

  const rotate = (direction: number) => {
    setActiveIndex((current) => (current + direction + visualizerOrgans.length) % visualizerOrgans.length);
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => rotate(1), 2400);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const distance = event.clientX - dragStart.current;
    if (Math.abs(distance) > 24) rotate(distance < 0 ? 1 : -1);
    dragStart.current = null;
  };

  const viewerUrl = `http://localhost:3000/en?organ=${activeOrgan.id}`;

  return (
    <div className="w-full max-w-sm mx-auto select-none" aria-label="3D Health Visualizer">
      <div
        className="relative h-[194px] touch-pan-y cursor-grab active:cursor-grabbing"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragStart.current = null; }}
      >
        <div className="absolute inset-x-0 top-0 h-[156px] overflow-hidden [perspective:700px]">
          {visualizerOrgans.map((organ, index) => {
            let offset = index - activeIndex;
            const half = visualizerOrgans.length / 2;
            if (offset > half) offset -= visualizerOrgans.length;
            if (offset < -half) offset += visualizerOrgans.length;
            const visible = Math.abs(offset) <= 2;
            return (
              <button
                key={organ.id}
                type="button"
                aria-label={`Show ${organ.name}`}
                onClick={() => setActiveIndex(index)}
                className={`absolute left-1/2 top-1/2 h-[138px] w-[103px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-lg backdrop-blur-sm transition-all duration-500 ease-out ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                style={{
                  transform: `translate(calc(-50% + ${offset * 72}px), -50%) translateZ(${offset === 0 ? 30 : -Math.abs(offset) * 28}px) rotateY(${offset * -14}deg) scale(${offset === 0 ? 1.08 : 0.78})`,
                  zIndex: 10 - Math.abs(offset),
                }}
              >
                <img src={organ.image} alt="" className="h-full w-full object-contain p-1 transition-transform duration-500 hover:scale-110" />
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative z-20 -mt-2 flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
        <div>
          <div className="text-[11px] font-semibold text-white">3D Health Visualizer</div>
          <div className="text-[10px] text-blue-200">{activeOrgan.name} · Explore your body in 3D</div>
        </div>
        <a href={viewerUrl} className="flex items-center gap-1 text-[10px] font-semibold text-cyan-200 hover:text-white">
          Visualise <ArrowRight size={12} />
        </a>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { signUp, signInWithGoogle } = useAuthStore();
  const navigate                = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, name);
      navigate('/app');
    } catch (err: any) {
      const code = err.code || '';
      if (code.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (code.includes('weak-password')) {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-800 flex-col justify-between p-10 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full bg-indigo-300/30 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo size={44} />
          <div>
            <div className="text-white text-xl font-bold tracking-tight">MedCare AI</div>
            <div className="text-blue-200 text-xs">Family Health Monitor</div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-8 space-y-5">
          <div className="text-center">
            <h2 className="text-white text-2xl font-bold leading-snug">
              Your Family's Health,<br />Always in Your Hands
            </h2>
            <p className="text-blue-200 text-sm mt-3 max-w-xs mx-auto leading-relaxed">
              Upload one medical report and MedCare AI sets up 24/7 monitoring,
              medication reminders, and real-time alerts for your entire family.
            </p>
          </div>

          <HealthVisualizerCarousel />

          {/* How it works */}
          <HowItWorks />

          {/* Live patient card */}
          <PatientCard />
        </div>

        {/* Bottom trust row */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/20 pt-5">
          {[
            { icon: Shield,      label: 'HIPAA Compliant'  },
            { icon: CheckCircle, label: 'AI Verified'      },
            { icon: Heart,       label: 'Trusted by Families' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-blue-300" />
              <span className="text-blue-200 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel — Form ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <BrandLogo size={36} />
          <span className="text-xl font-bold text-gray-900">MedCare AI</span>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="text-gray-500 text-sm mt-1">
                Free forever · No credit card required
              </p>
            </div>

            {/* What you get */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6 space-y-2">
              <p className="text-blue-800 text-xs font-semibold uppercase tracking-wide">What's included — free</p>
              {[
                'Upload unlimited medical reports',
                'AI health monitoring every 5 minutes',
                'Email & WhatsApp alerts to family',
                'Multilingual chat (English, Hindi, Kannada)',
              ].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="text-blue-700 text-xs">{f}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">⚠</span> {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <Input
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                  <span className="text-gray-400 font-normal ml-1">(min 6 characters)</span>
                </label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all mt-2 shadow-md shadow-blue-500/20"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Creating account…
                  </span>
                ) : 'Create Free Account →'}
              </Button>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  try {
                    await signInWithGoogle();
                    navigate('/app');
                  } catch (err: any) {
                    if (err.code !== 'auth/popup-closed-by-user') {
                      setError(err.message || 'Google sign-in failed');
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign up with Google
              </button>

              {/* Divider */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">or demo access</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold rounded-xl"
                onClick={async () => {
                  const { demoSignIn } = useAuthStore.getState();
                  await demoSignIn();
                  navigate('/app');
                }}
              >
                ⚡ 1-Click Demo Access
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign in →
              </Link>
            </p>

            <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
              By creating an account you agree to our Terms of Service.<br />
              Your health data is encrypted and never shared.
            </p>
          </div>

          {/* Partner logos strip */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 mb-3">Designed for India's healthcare ecosystem</p>
            <div className="flex items-center justify-center gap-6 opacity-60">
              {/* Tata 1mg style */}
              <div className="text-xs font-bold text-gray-500 border border-gray-300 px-2 py-1 rounded">TATA 1mg</div>
              {/* PharmEasy style */}
              <div className="text-xs font-bold text-green-600 border border-green-300 px-2 py-1 rounded">PharmEasy</div>
              {/* Dr Dangs */}
              <div className="text-xs font-bold text-red-600 border border-red-300 px-2 py-1 rounded">DR DANGS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
