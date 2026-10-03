import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Shield, Heart, Activity, FileText, Users, Zap, Star, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Brand logo SVG (blue circular icon matching Niroggyan style) ─────────────
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

// ── Left panel illustration (medical/health dashboard style) ─────────────────
function HealthIllustration() {
  return (
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
      {/* Phone/tablet device */}
      <rect x="120" y="40" width="160" height="240" rx="16" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.3" strokeWidth="2"/>
      <rect x="130" y="55" width="140" height="210" rx="8" fill="white" fillOpacity="0.1"/>
      {/* Health chart lines */}
      <polyline points="140,180 160,160 180,170 200,140 220,150 240,130 260,145" stroke="#60A5FA" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="140,200 160,195 180,205 200,190 220,195 240,185 260,190" stroke="#34D399" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"/>
      {/* Bar chart */}
      <rect x="145" y="215" width="12" height="25" rx="3" fill="#3B82F6" fillOpacity="0.8"/>
      <rect x="162" y="208" width="12" height="32" rx="3" fill="#60A5FA" fillOpacity="0.8"/>
      <rect x="179" y="218" width="12" height="22" rx="3" fill="#3B82F6" fillOpacity="0.8"/>
      <rect x="196" y="205" width="12" height="35" rx="3" fill="#93C5FD" fillOpacity="0.8"/>
      <rect x="213" y="212" width="12" height="28" rx="3" fill="#60A5FA" fillOpacity="0.8"/>
      <rect x="230" y="200" width="12" height="40" rx="3" fill="#3B82F6" fillOpacity="0.8"/>
      {/* Heart rate icon */}
      <circle cx="170" cy="95" r="18" fill="#EF4444" fillOpacity="0.2" stroke="#EF4444" strokeOpacity="0.6" strokeWidth="1.5"/>
      <path d="M162 95 C162 91 165 88 170 91 C175 88 178 91 178 95 C178 99 170 105 170 105 C170 105 162 99 162 95Z" fill="#EF4444" fillOpacity="0.8"/>
      {/* Glucose icon */}
      <circle cx="230" cy="95" r="18" fill="#3B82F6" fillOpacity="0.2" stroke="#3B82F6" strokeOpacity="0.6" strokeWidth="1.5"/>
      <text x="230" y="100" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">BG</text>
      {/* Metric value cards */}
      <rect x="135" y="115" width="55" height="30" rx="6" fill="white" fillOpacity="0.2"/>
      <text x="162" y="128" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">Heart Rate</text>
      <text x="162" y="140" textAnchor="middle" fill="#60A5FA" fontSize="10" fontWeight="bold">72 bpm</text>
      <rect x="210" y="115" width="55" height="30" rx="6" fill="white" fillOpacity="0.2"/>
      <text x="237" y="128" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">Blood Sugar</text>
      <text x="237" y="140" textAnchor="middle" fill="#34D399" fontSize="10" fontWeight="bold">98 mg/dL</text>
      {/* Doctor figure left */}
      <circle cx="55" cy="100" r="22" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.3" strokeWidth="1.5"/>
      <circle cx="55" cy="92" r="10" fill="#93C5FD" fillOpacity="0.8"/>
      <path d="M35 120 C35 108 45 104 55 104 C65 104 75 108 75 120" fill="#60A5FA" fillOpacity="0.6"/>
      <line x1="55" y1="82" x2="55" y2="96" stroke="white" strokeWidth="2"/>
      <line x1="48" y1="89" x2="62" y2="89" stroke="white" strokeWidth="2"/>
      {/* Family icon right */}
      <circle cx="345" cy="100" r="22" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.3" strokeWidth="1.5"/>
      <circle cx="338" cy="91" r="7" fill="#34D399" fillOpacity="0.8"/>
      <circle cx="352" cy="91" r="7" fill="#6EE7B7" fillOpacity="0.8"/>
      <path d="M325 115 C325 107 331 104 338 104 C345 104 348 106 350 108 C352 106 358 104 365 104 C372 104 378 107 378 115" fill="#34D399" fillOpacity="0.5"/>
      {/* Connection dots */}
      <circle cx="77" cy="100" r="3" fill="white" fillOpacity="0.5"/>
      <line x1="80" y1="100" x2="118" y2="100" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 3"/>
      <circle cx="323" cy="100" r="3" fill="white" fillOpacity="0.5"/>
      <line x1="280" y1="100" x2="320" y2="100" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 3"/>
      {/* Cloud icon top center */}
      <ellipse cx="200" cy="22" rx="30" ry="14" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.3" strokeWidth="1.5"/>
      <circle cx="185" cy="24" r="9" fill="white" fillOpacity="0.1"/>
      <circle cx="215" cy="24" r="9" fill="white" fillOpacity="0.1"/>
      <line x1="200" y1="36" x2="200" y2="54" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="3 2"/>
      {/* Alert badge */}
      <circle cx="310" cy="175" r="24" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeOpacity="0.7" strokeWidth="1.5"/>
      <path d="M310 164 L317 178 H303 Z" fill="#F59E0B" fillOpacity="0.8"/>
      <text x="310" y="192" textAnchor="middle" fill="#FCD34D" fontSize="9" fontWeight="bold">ALERT</text>
      {/* Check badge */}
      <circle cx="90" cy="195" r="20" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeOpacity="0.7" strokeWidth="1.5"/>
      <path d="M82 195 L88 201 L98 189" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-blue-200 mt-0.5">{label}</div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  
  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail]         = useState('');
  const [forgotLoading, setForgotLoading]     = useState(false);
  const [forgotSuccess, setForgotSuccess]     = useState(false);
  const [forgotError, setForgotError]         = useState('');

  // Magic link state
  const [magicLoading, setMagicLoading]       = useState(false);
  const [magicSent, setMagicSent]             = useState(false);

  const { signIn, signInWithGoogle, resetPasswordForEmail, signInWithOtp } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/app');
    } catch (err: any) {
      const code = err.code || '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(err.message || 'Invalid login credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    const target = forgotEmail.trim() || email.trim();
    if (!target) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    try {
      await resetPasswordForEmail(target);
      setForgotSuccess(true);
      toast.success('Password reset link sent to your inbox!');
    } catch (err: any) {
      const msg = err.message || 'Failed to send password reset email.';
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address above to receive a 1-click magic link.');
      return;
    }
    setMagicLoading(true);
    try {
      await signInWithOtp(email.trim());
      setMagicSent(true);
      toast.success('1-Click Magic Link sent to your email!');
    } catch (err: any) {
      const msg = err?.message || 'Failed to send magic link.';
      if (msg.includes('rate limit')) {
        setError('Supabase email rate limit reached. Please use "Forgot password?" for Instant Direct Reset.');
      } else {
        setError(msg);
      }
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 flex-col justify-between p-10 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-blue-300/30 blur-3xl" />
        </div>

        {/* Logo + brand */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo size={44} />
          <div>
            <div className="text-white text-xl font-bold tracking-tight">MedCare AI</div>
            <div className="text-blue-200 text-xs">Family Health Monitor</div>
          </div>
        </div>

        {/* Illustration */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-8">
          <HealthIllustration />
          <h2 className="text-white text-2xl font-bold text-center mt-4 leading-snug">
            Never Let Patients Go<br />Unmonitored Again
          </h2>
          <p className="text-blue-200 text-sm text-center mt-3 max-w-xs leading-relaxed">
            Upload a medical report. Our AI reads it, monitors health metrics,
            and alerts your family the moment something is wrong.
          </p>

          {/* Features */}
          <div className="mt-6 space-y-2 w-full max-w-xs">
            {[
              { icon: FileText,  text: 'AI reads lab reports & discharge summaries' },
              { icon: Activity,  text: 'Continuous health monitoring every 5 minutes' },
              { icon: Zap,       text: 'Email & WhatsApp alerts on HIGH/CRITICAL risk' },
              { icon: Users,     text: 'Family caregiver access with role permissions' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-blue-100 text-xs">{text}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => window.location.assign('http://localhost:3000/en')}
              className="mt-5 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-left text-white transition hover:bg-white/20"
            >
              <span className="flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 text-yellow-300" /> Visualise anatomy</span>
              <span className="mt-1 block pl-6 text-xs text-blue-100">Explore an interactive visual learning atlas</span>
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 grid grid-cols-4 gap-4 border-t border-white/20 pt-6">
          <StatBadge value="50+"  label="Hospitals"        color="text-white" />
          <StatBadge value="1M+"  label="Reports Analyzed" color="text-blue-300" />
          <StatBadge value="4.9★" label="Rating"           color="text-yellow-300" />
          <StatBadge value="10K+" label="Patients Helped"  color="text-green-300" />
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
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to your family health dashboard</p>
            </div>

            {/* Trust badges */}
            <div className="flex gap-3 mb-6">
              {[
                { icon: Shield,       label: 'HIPAA Safe'    },
                { icon: CheckCircle,  label: 'AI Powered'    },
                { icon: Heart,        label: 'Family First'  },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 bg-blue-50 rounded-full px-3 py-1">
                  <Icon className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">{label}</span>
                </div>
              ))}
            </div>

            {magicSent && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <span className="text-base">✉️</span>
                <span>Magic login link sent to <strong>{email}</strong>! Click the link in your email to sign in.</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-start gap-2">
                  <span className="text-red-500 font-bold">⚠</span> {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Email address
                </label>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotSuccess(false);
                      setForgotError('');
                      setShowForgotModal(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign In →'}
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
                Continue with Google
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
                ⚡ 1-Click Demo Login
              </Button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700">
                Create one free →
              </Link>
            </p>
          </div>

          {/* Bottom social proof */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span>Rated 4.9/5</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-green-500" />
              <span>256-bit Encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span>10,000+ families</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reset Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter your registered account email to receive a secure password reset link.
                </p>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {forgotSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs space-y-2.5">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                  <span>✅</span> Recovery Email Sent!
                </div>
                <p>
                  We have sent a secure password reset link to <strong>{forgotEmail || email}</strong>. Please check your inbox and follow the link to choose a new password.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSuccess(false);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-medium">
                    ⚠ {forgotError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Account Email
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    A secure password reset link will be sent to this email address.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl text-xs shadow-md shadow-blue-500/20"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Recovery Email →'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
