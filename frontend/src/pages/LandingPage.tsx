import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroReportSlider } from '../components/landing/HeroReportSlider';
import { BeforeAfterReportSlider } from '../components/landing/BeforeAfterReportSlider';
import './LandingPage.css';

/* ── Inline SVG logo (blue circular icon) ───────────────── */
function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="lp-logo-icon">
      <circle cx="50" cy="50" r="50" fill="#1E40AF"/>
      <circle cx="30" cy="30" r="22" fill="#3B82F6"/>
      <circle cx="70" cy="30" r="22" fill="#60A5FA"/>
      <circle cx="50" cy="68" r="22" fill="#93C5FD"/>
      <circle cx="50" cy="50" r="14" fill="white"/>
    </svg>
  );
}

/* ── Product data (MedCare AI adapted) ──────────────────── */
const products = [
  { icon: '✦', title: 'Smart Health Reports',    description: 'AI reads your lab reports and discharge summaries — plain-language insights, instantly.', points: ['Extracts vitals, diagnosis, medications', 'Gemini & Groq AI analysis', 'Automatic patient profile creation'], color: 'blue' },
  { icon: '◉', title: 'Continuous Monitoring',   description: 'Every 5 minutes, MedCare AI scans all patient health metrics against clinical thresholds.', points: ['3-rule risk engine: thresholds, baseline, trend', 'AUTO alert on HIGH/CRITICAL readings', 'Family notified via Email & WhatsApp'], color: 'purple' },
  { icon: '⌁', title: 'Smart Alert System',      description: 'Instant Email and WhatsApp alerts to all family members when risk is detected.', points: ['Direct SMTP & WhatsApp delivery', 'Delivery log with per-channel status', '"Notify Family" button on every alert'], color: 'green' },
  { icon: '⌘', title: 'Medication Reminders',    description: 'Automated WhatsApp & Email reminders dispatched daily based on the medication schedule.', points: ['Schedule auto-created from uploaded reports', 'IST-aware scheduler runs every minute', 'Patient phone & email auto-detected'], color: 'orange' },
  { icon: '◈', title: 'AI Health Assistant',     description: 'Multilingual chat (English, Hindi, Kannada) powered by Groq LLaMA-3.3-70B.', points: ['Answers from real patient records', 'Sarvam AI voice (TTS + STT)', 'Emergency SOS dispatch button'], color: 'blue' },
  { icon: '♥', title: 'Family Caregiver Portal', description: 'One account, multiple patients — with role-based access for each family member.', points: ['Owner / Caregiver / Viewer roles', 'Emergency contact directory', 'Nearby healthcare map (OpenStreetMap)'], color: 'purple' },
];

/* ── Solutions ──────────────────────────────────────────── */
const solutions = [
  {
    tag: 'FOR FAMILIES',
    title: 'Monitor Patient Health',
    highlight: 'Without Being There',
    description: 'Upload a discharge summary or lab report. MedCare AI extracts all clinical data, monitors vitals 24/7, and alerts your family the moment something goes wrong.',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80',
    steps: ['Upload Report', 'AI Extracts', 'Monitor 24/7'],
  },
  {
    tag: 'FOR CAREGIVERS',
    title: 'Automated Alerts &',
    highlight: 'Smart Reminders',
    description: 'Never miss a medication schedule or a dangerous health reading. Email + WhatsApp alerts fire automatically to all registered family members.',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=80',
    steps: ['Connect Family', 'Set Reminders', 'Auto-Alerts'],
  },
];

/* ── Testimonials ───────────────────────────────────────── */
const testimonials = [
  { name: 'Family Caregiver', role: 'Bengaluru', text: 'My father was discharged from CMC Vellore. I uploaded the 8-page summary — MedCare AI extracted all his medications, HbA1c, and BP readings in seconds. Now I get WhatsApp alerts if anything spikes.' },
  { name: 'Healthcare Professional', role: 'Clinical Partner', text: 'The automated medication reminders and real-time monitoring mean patients actually follow their post-discharge care plan. The multilingual voice chat is outstanding.' },
  { name: 'Remote Caregiver', role: 'NRI Family Member', text: 'Living abroad, I was always worried. Now I get instant WhatsApp alerts for both my parents. The AI chat explains their lab reports in simple Hindi. Life-changing.' },
];

/* ── Problems ───────────────────────────────────────────── */
const problems = [
  { title: 'For Families', items: ['Confusing medical jargon in discharge reports', 'No idea when vitals become dangerous', 'Manual medication tracking is error-prone'] },
  { title: 'For Caregivers', items: ['Cannot monitor patients remotely 24/7', 'Missed medication doses go unnoticed', 'Emergency contact process is slow'] },
  { title: 'For Patients', items: ['Don\'t understand their own lab reports', 'Uncertain about next steps after discharge', 'Language barrier with medical terminology'] },
];

/* ==========================================================
   LANDING PAGE COMPONENT
========================================================== */
export default function LandingPage() {
  const navigate = useNavigate();

  const [mobileMenu,    setMobileMenu]    = useState(false);
  const [activeProduct, setActiveProduct] = useState<number | null>(null);
  const [reportStep,    setReportStep]    = useState(0);
  const [healthScore,   setHealthScore]   = useState(72);
  const [testimonial,   setTestimonial]   = useState(0);

  /* Report step auto-cycle */
  useEffect(() => {
    const t = setInterval(() => setReportStep(p => p >= 2 ? 0 : p + 1), 2600);
    return () => clearInterval(t);
  }, []);

  /* Health score animation */
  useEffect(() => {
    const targets = [72, 81, 87];
    const target = targets[reportStep] ?? 72;
    let cur = healthScore;
    const t = setInterval(() => {
      if (cur < target) cur++;
      else if (cur > target) cur--;
      setHealthScore(cur);
      if (cur === target) clearInterval(t);
    }, 25);
    return () => clearInterval(t);
  }, [reportStep]);

  /* Testimonial auto-rotate */
  useEffect(() => {
    const t = setInterval(() => setTestimonial(p => p === testimonials.length - 1 ? 0 : p + 1), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="landing-page">

      {/* ======================================================
          NAVBAR
      ====================================================== */}
      <header className="lp-navbar">
        <div className="lp-nav-container">

          <a href="#" className="lp-logo">
            <span className="lp-logo-symbol"><LogoIcon size={34} /></span>
            <span>MedCare<span style={{ color: '#3974df' }}> AI</span></span>
          </a>

          <nav className={`lp-nav-links ${mobileMenu ? 'show' : ''}`}>
            <a href="#solutions">SOLUTIONS</a>
            <a href="#products">FEATURES</a>
            <a href="#why">WHY US</a>
            <a href="#process">HOW IT WORKS</a>
            <a href="#contact">CONTACT</a>
          </nav>

          <div className="lp-desktop-actions">
            <button className="lp-outline" onClick={() => navigate('/visualise')}>Visualise</button>
            <button className="lp-btn" onClick={() => navigate('/register')}>✨ Get Started Free</button>
            <button className="lp-outline" onClick={() => navigate('/login')}>Sign In</button>
          </div>

          <button className="lp-hamburger" onClick={() => setMobileMenu(!mobileMenu)}>☰</button>
        </div>
      </header>

      {/* ======================================================
          HERO
      ====================================================== */}
      <section className="lp-hero">
        <div className="lp-shape lp-shape-1" />
        <div className="lp-shape lp-shape-2" />
        <div className="lp-shape lp-shape-3" />

        <div className="lp-container lp-hero-grid">

          {/* Copy */}
          <div className="lp-hero-content">
            <div className="lp-trust-pill">
              <span className="lp-check">✓</span>
              Trusted by Families across India
            </div>

            <h1>
              Never Let Your Patient<br />
              Go Unmonitored<br />
              <span>Ever Again</span>
            </h1>

            <p className="lp-hero-desc">
              Upload a medical report. MedCare AI extracts every vital, medication, and diagnosis —
              then monitors 24/7 and alerts your family the moment risk is detected.
            </p>

            <div className="lp-pills">
              <span>✓ AI Report Analysis</span>
              <span>✓ WhatsApp Alerts</span>
              <span>✓ 24/7 Monitoring</span>
              <span>✓ Multilingual Chat</span>
            </div>

            <div className="lp-hero-actions">
              <button className="lp-main-btn" onClick={() => navigate('/register')}>
                Start Monitoring Free <span>→</span>
              </button>
              <button className="lp-sec-btn" onClick={() => navigate('/visualise')}>
                Visualise Anatomy
              </button>
              <button className="lp-sec-btn" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
          </div>

          {/* Interactive Report Comparison Slider in Hero */}
          <div className="lp-report-area">
            <HeroReportSlider healthScore={healthScore} reportStep={reportStep} />
          </div>
        </div>

        {/* Stats */}
        <div className="lp-container lp-stats">
          <div className="lp-stat lp-stat-blue"><strong>5+</strong><span>Active Patients</span></div>
          <div className="lp-stat lp-stat-green"><strong>24/7</strong><span>Continuous Monitoring</span></div>
          <div className="lp-stat lp-stat-yellow"><strong>3-Rule</strong><span>Risk Detection Engine</span></div>
          <div className="lp-stat lp-stat-purple"><strong>WhatsApp</strong><span>Real-time Family Alerts</span></div>
        </div>
      </section>

      {/* ======================================================
          SOLUTIONS
      ====================================================== */}
      <section id="solutions" className="lp-solutions lp-section">
        <div className="lp-container">
          <div className="lp-section-title">
            <h2>Solutions for Every Healthcare Need</h2>
            <p>Pick the one that fits you and explore what's built for you.</p>
          </div>

          <div className="lp-solutions-grid">
            {solutions.map((s, i) => (
              <div className="lp-sol-card" key={s.tag}>
                <div className="lp-sol-text">
                  <span className="lp-sol-tag">{s.tag}</span>
                  <h3>{s.title} <span>{s.highlight}</span></h3>
                  <p>{s.description}</p>
                  <div className="lp-sol-steps">
                    {s.steps.map((step, si) => (
                      <span key={step}>
                        {si > 0 && <i style={{ margin: '0 6px' }}>→</i>}
                        <b>{si + 1}</b> {step}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="lp-sol-img">
                  <div className="lp-img-glow" />
                  <img src={s.image} alt={s.title} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          INTERACTIVE BEFORE / AFTER REPORT SLIDER
      ====================================================== */}
      <section className="lp-section bg-gradient-to-b from-white via-blue-50/30 to-white py-12">
        <BeforeAfterReportSlider />
      </section>

      {/* ======================================================
          PROBLEM
      ====================================================== */}
      <section id="why" className="lp-problem lp-section">
        <div className="lp-container">
          <div className="lp-section-title">
            <h2>What's Broken in Patient Care Today?</h2>
          </div>
          <div className="lp-problem-grid">
            {problems.map((p, i) => (
              <div className="lp-prob-card" key={p.title}>
                <h3>{p.title}</h3>
                <ul>{p.items.map(item => <li key={item}>{item}</li>)}</ul>
                <button onClick={() => navigate('/register')}>
                  {i === 0 ? 'Start monitoring →' : i === 1 ? 'Get alerts →' : 'Understand reports →'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          INTERACTIVE REPORT SIMULATOR
      ====================================================== */}
      <section className="lp-sim-section lp-section">
        <div className="lp-container">
          <div className="lp-section-title">
            <h2>From Raw Report to Smart Monitoring</h2>
            <p>Watch complex medical documents become clear, actionable health insights.</p>
          </div>

          <div className="lp-sim-grid">

            {/* Traditional */}
            <div className="lp-sim-card traditional">
              <div className="lp-sim-header">⚠ Raw Report</div>
              <div className="lp-sim-content">
                <strong>Hemoglobin:</strong><span>13.2 g/dL</span><small>Range: 12.0–15.5</small>
                <strong>Blood Glucose:</strong><span>142 mg/dL</span><small>Range: 70–100</small>
                <strong>HbA1c:</strong><span>6.5%</span><small>Range: 4.0–5.7</small>
              </div>
              <div className="lp-dense-label">Dense terminology, no context, no action</div>
            </div>

            {/* AI Engine */}
            <div className="lp-sim-card ai-engine">
              <div className="lp-sim-header">✨ MedCare AI</div>
              <div className="lp-ai-progress">
                <div className="lp-ai-step active"><span>✓</span>OCR & text extraction</div>
                <div className="lp-ai-step active"><span>✓</span>Clinical data parsing</div>
                <div className="lp-ai-step active"><span>✓</span>Threshold evaluation</div>
                <div className={`lp-ai-step ${reportStep >= 2 ? 'active' : ''}`}>
                  <span>{reportStep >= 2 ? '✓' : '○'}</span>Family alert ready
                </div>
              </div>
              <div className="lp-ai-score">
                <div className="lp-big-score"><span>{healthScore}</span></div>
                <div>
                  <strong>Health Score</strong>
                  <small>AI confidence 96%</small>
                </div>
              </div>
            </div>

            {/* Smart output */}
            <div className="lp-sim-card smart">
              <div className="lp-sim-header">✓ Smart Monitor</div>
              <div className="lp-smart-result normal">
                <div><strong>Hemoglobin: Normal</strong><small>Oxygen capacity healthy</small></div>
                <span>✓</span>
              </div>
              <div className="lp-smart-result warning">
                <div><strong>Blood Glucose: Elevated</strong><small>Monitor weekly, retest in 1 month</small></div>
                <span>!</span>
              </div>
              <div className="lp-smart-result warning">
                <div><strong>HbA1c: Elevated</strong><small>Metformin scheduled — WhatsApp sent</small></div>
                <span>!</span>
              </div>
              <div className="lp-smart-footer">Clear language · Monitoring active · Family notified</div>
            </div>
          </div>

          <div className="lp-sim-controls">
            <button className={reportStep === 0 ? 'active' : ''} onClick={() => setReportStep(0)}>01 Upload</button>
            <button className={reportStep === 1 ? 'active' : ''} onClick={() => setReportStep(1)}>02 AI Analysis</button>
            <button className={reportStep === 2 ? 'active' : ''} onClick={() => setReportStep(2)}>03 Smart Monitor</button>
          </div>
        </div>
      </section>

      {/* ======================================================
          PRODUCTS — FLIP CARDS
      ====================================================== */}
      <section id="products" className="lp-products lp-section">
        <div className="lp-container">
          <div className="lp-section-title">
            <h2>Everything MedCare AI Does</h2>
            <p>Purpose-built tools for families, caregivers, and patients.</p>
          </div>

          <div className="lp-products-grid">
            {products.map((p, i) => (
              <div
                className={`lp-flip ${activeProduct === i ? 'flipped' : ''}`}
                key={p.title}
                onClick={() => setActiveProduct(activeProduct === i ? null : i)}
              >
                <div className="lp-flip-inner">
                  <div className="lp-pface lp-pfront">
                    <div className={`lp-p-icon ${p.color}`}>{p.icon}</div>
                    <span className="lp-p-num">0{i + 1}</span>
                    <h3>{p.title}</h3>
                    <p>{p.description}</p>
                    <div className="lp-p-preview"><span>✦</span>Tap to explore<span>→</span></div>
                    <button>Learn More</button>
                  </div>
                  <div className="lp-pface lp-pback">
                    <div className="lp-back-top"><span>{p.icon}</span><strong>{p.title}</strong></div>
                    <h4>Built for better care</h4>
                    <ul>{p.points.map(pt => <li key={pt}><span>✓</span>{pt}</li>)}</ul>
                    <button onClick={e => { e.stopPropagation(); navigate('/register'); }}>Get Started →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          PROCESS
      ====================================================== */}
      <section id="process" className="lp-process lp-section">
        <div className="lp-container">
          <div className="lp-section-title">
            <h2>From Upload to Active Monitoring</h2>
            <p>Four steps. Fully automated.</p>
          </div>
          <div className="lp-process-grid">
            <div className="lp-process-line" />
            {[
              { n: '01', title: 'Upload', desc: 'Upload a discharge summary, lab report, or prescription PDF or image.' },
              { n: '02', title: 'AI Extracts', desc: 'Groq LLaMA-3.3 reads the document and extracts vitals, medications, and diagnosis.' },
              { n: '03', title: 'Monitor 24/7', desc: 'Background scanner checks every 5 minutes against clinical thresholds and patient baselines.' },
              { n: '04', title: 'Family Alert', desc: 'HIGH/CRITICAL risk → instant Email & WhatsApp alerts to all family members. Automatic. No manual steps.' },
            ].map(s => (
              <div className="lp-proc-item" key={s.n}>
                <div className="lp-proc-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          TESTIMONIALS
      ====================================================== */}
      <section className="lp-testimonials lp-section">
        <div className="lp-container">
          <div className="lp-section-title"><h2>Trusted by Families Across India</h2></div>
          <div className="lp-test-slider">
            <button className="lp-test-arrow"
              onClick={() => setTestimonial(testimonial === 0 ? testimonials.length - 1 : testimonial - 1)}>←</button>
            <div className="lp-test-card">
              <div className="lp-test-avatar">❤</div>
              <p>"{testimonials[testimonial].text}"</p>
              <strong>— {testimonials[testimonial].name}</strong>
              <small>{testimonials[testimonial].role}</small>
            </div>
            <button className="lp-test-arrow"
              onClick={() => setTestimonial(testimonial === testimonials.length - 1 ? 0 : testimonial + 1)}>→</button>
          </div>
          <div className="lp-test-dots">
            {testimonials.map((_, i) => (
              <button key={i} className={testimonial === i ? 'active' : ''} onClick={() => setTestimonial(i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          CTA
      ====================================================== */}
      <section id="contact" className="lp-cta">
        <div className="lp-container">
          <div className="lp-cta-box">
            <div className="lp-cta-left">
              <span className="lp-cta-label">GET STARTED — FREE</span>
              <h2>Start Monitoring<br /><span>Your Family's Health</span></h2>
              <p>Upload the first medical report and MedCare AI handles everything — extraction, monitoring, alerts, and reminders.</p>
              <div className="lp-cta-list">
                <div>✓ AI reads any medical document</div>
                <div>✓ 24/7 health monitoring</div>
                <div>✓ Email & WhatsApp family alerts</div>
                <div>✓ Multilingual voice chat assistant</div>
              </div>
            </div>
            <div className="lp-cta-form">
              <h3>Create Free Account</h3>
              <p>No credit card required</p>
              <input type="email" placeholder="Your email address" />
              <button onClick={() => navigate('/register')}>
                Get Started Free <span>→</span>
              </button>
              <small>We respect your privacy. No spam, ever.</small>
              <div className="lp-trusted">
                DESIGNED FOR INDIA'S HEALTHCARE ECOSYSTEM
                <div>CMC Vellore &nbsp;·&nbsp; Apollo &nbsp;·&nbsp; Fortis &nbsp;·&nbsp; AIIMS &nbsp;·&nbsp; Narayana</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          FLOATING DEMO BUTTON
      ====================================================== */}
      <button className="lp-float-demo" onClick={() => navigate('/register')}>
        <span>▣</span> Start Free
      </button>

      {/* ======================================================
          FOOTER
      ====================================================== */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <a href="#" className="lp-logo lp-footer-logo">
              <span className="lp-logo-symbol"><LogoIcon size={28} /></span>
              MedCare<span style={{ color: '#3974df' }}> AI</span>
            </a>
            <p>Transforming family health care with AI-powered monitoring, real-time alerts, and multilingual assistance.</p>
            <div className="lp-socials">
              <span>f</span><span>◎</span><span>in</span><span>𝕏</span><span>▶</span>
            </div>
          </div>

          <div className="lp-footer-col">
            <h4>FEATURES</h4>
            <a href="#products">AI Report Analysis</a>
            <a href="#products">Health Monitoring</a>
            <a href="#products">WhatsApp Alerts</a>
            <a href="#products">Medication Reminders</a>
            <a href="#products">Voice AI Chat</a>
          </div>

          <div className="lp-footer-col">
            <h4>PLATFORM</h4>
            <a href="#solutions">For Families</a>
            <a href="#solutions">For Caregivers</a>
            <a href="#process">How It Works</a>
            <a href="#why">Why MedCare AI</a>
          </div>

          <div className="lp-footer-col">
            <h4>ACCOUNT</h4>
            <a onClick={() => navigate('/register')} style={{ cursor: 'pointer' }}>Create Account</a>
            <a onClick={() => navigate('/login')}    style={{ cursor: 'pointer' }}>Sign In</a>
            <a href="#contact">Contact Us</a>
          </div>

          <div className="lp-footer-col">
            <h4>CONTACT</h4>
            <a href="mailto:support@medcareai.app">✉ support@medcareai.app</a>
            <h4 className="lp-newsletter-title">NEWSLETTER</h4>
            <p>Get health AI insights weekly</p>
            <div className="lp-newsletter">
              <input placeholder="Your email" />
              <button>→</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
