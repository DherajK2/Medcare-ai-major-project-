import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, FileText, CheckCircle2, Phone, Mail, AlertTriangle } from 'lucide-react';

interface HeroReportSliderProps {
  healthScore?: number;
  reportStep?: number;
}

export function HeroReportSlider({ healthScore = 87, reportStep = 0 }: HeroReportSliderProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clamped = Math.max(0, Math.min(rect.width, x));
    const percentage = (clamped / rect.width) * 100;
    setSliderPos(percentage);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseLeave = () => {
    // Optionally return smoothly to center (50%) on mouse leave
    setSliderPos(50);
  };

  return (
    <div className="relative w-full max-w-[420px] sm:max-w-[460px] h-[520px] select-none">
      {/* Background Orbit Rings */}
      <div className="lp-orbit lp-orbit-1" />
      <div className="lp-orbit lp-orbit-2" />

      {/* Main Slider Card */}
      <div
        ref={containerRef}
        className="relative w-full h-full rounded-2xl overflow-hidden border-[3px] border-[#3671e5] bg-white shadow-[0_25px_60px_rgba(27,75,165,0.28)] cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
      >
        {/* Top Gradient Banner Accent */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600 z-40" />

        {/* ============================================================
            AFTER LAYER (RIGHT / FULL BACKGROUND: SMART AI REPORT)
        ============================================================ */}
        <div className="absolute inset-0 w-full h-full bg-white pt-4 pb-3 px-3.5 sm:px-4 flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  ✦
                </div>
                <div>
                  <strong className="text-blue-700 text-xs sm:text-sm font-bold block leading-tight">MedCare AI</strong>
                  <span className="text-[9px] text-gray-400 font-medium">Smart Visual Report</span>
                </div>
              </div>
              <div className="text-right text-[9px] text-gray-500">
                <span className="text-emerald-600 font-bold flex items-center gap-0.5 justify-end">
                  <CheckCircle2 className="w-2.5 h-2.5" /> AI Verified
                </span>
                <span>+91 1860-500-1066</span>
              </div>
            </div>

            {/* Patient Bar */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2 mb-2.5 text-[10px] grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-gray-400 block text-[8px]">PATIENT</span>
                <b className="text-gray-800">Mr. KODANDARAMA</b>
              </div>
              <div>
                <span className="text-gray-400 block text-[8px]">DOCTOR</span>
                <b className="text-gray-800">Dr. Raghu M S</b>
              </div>
            </div>

            {/* Biomarker 1: Total PSA */}
            <div className="border border-rose-200 rounded-lg p-2 mb-2 bg-rose-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-900 block">Total PSA (Prostate Antigen)</span>
                  <span className="text-[9px] text-gray-500">Ref: &le; 4.0 ng/mL</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-rose-600">6.0 ng/mL</span>
                  <span className="ml-1 text-[8px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">
                    HIGH
                  </span>
                </div>
              </div>
              {/* Range Bar */}
              <div className="mt-1.5">
                <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 relative">
                  <div
                    className="absolute -top-1 w-3.5 h-3.5 bg-rose-600 border-2 border-white rounded-full shadow"
                    style={{ left: '72%' }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-gray-400 mt-0.5 font-medium">
                  <span>0.0 Normal</span>
                  <span>4.0 Threshold</span>
                  <span className="text-rose-600 font-bold">6.0 (High)</span>
                </div>
              </div>
            </div>

            {/* Biomarker 2: Blood Sugar */}
            <div className="border border-amber-200 rounded-lg p-2 mb-2 bg-amber-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-900 block">Random Blood Glucose</span>
                  <span className="text-[9px] text-gray-500">Adhya Diagnostics</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-600">345 mg/dL</span>
                  <span className="ml-1 text-[8px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                    ELEVATED
                  </span>
                </div>
              </div>
              <div className="mt-1.5">
                <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 relative">
                  <div
                    className="absolute -top-1 w-3.5 h-3.5 bg-amber-600 border-2 border-white rounded-full shadow"
                    style={{ left: '88%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Clinical Insight */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2 text-[10px] text-gray-700 leading-snug">
            <div className="flex items-center gap-1 text-blue-800 font-bold text-[10px] mb-0.5">
              <Sparkles className="w-2.5 h-2.5 text-blue-600" />
              <span>AI Summary & Actions:</span>
            </div>
            Total PSA (6.0 ng/mL) and Glucose (345 mg/dL) are elevated. Follow up with Dr. Raghu M S and maintain prescribed Metformin.
          </div>

          {/* Smart Badge */}
          <div className="absolute top-4 right-3 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> SMART REPORT
          </div>
        </div>

        {/* ============================================================
            BEFORE LAYER (LEFT / CLIPPED: RAW SCANNED LAB REPORT)
        ============================================================ */}
        <div
          className="absolute inset-0 w-full h-full bg-white border-r-2 border-blue-600 shadow-2xl overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="relative w-[380px] sm:w-[420px] h-full bg-white p-2 select-none flex items-center justify-center">
            <img
              src="/raw_report_sample.png"
              alt="Raw Medical Report"
              className="w-full h-full object-contain filter contrast-125 select-none pointer-events-none"
            />
            {/* Raw Badge */}
            <div className="absolute top-4 left-3 bg-gray-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
              <FileText className="w-2.5 h-2.5 text-gray-300" /> RAW REPORT (BEFORE)
            </div>
          </div>
        </div>

        {/* ============================================================
            CENTER DRAGGABLE SLIDER DIVIDER & THUMB
        ============================================================ */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.9)] z-30 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl border-2 border-white ring-2 ring-blue-400/50 pointer-events-auto cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
            <span className="text-[9px] font-black tracking-tighter">◀ ▶</span>
          </div>
        </div>
      </div>

      {/* Floating Health Score Card */}
      <div className="lp-float-health !z-30">
        <div className="lp-score-ring">
          <span>{healthScore}</span>
        </div>
        <div>
          <strong>Health Score</strong>
          <small>{reportStep === 2 ? 'Looking Stable' : 'Analyzing…'}</small>
        </div>
      </div>

      {/* Floating AI Status Card */}
      <div className="lp-float-ai !z-30">
        <span className="lp-ai-icon">✨</span>
        <div>
          <strong>AI Monitor</strong>
          <small>
            {reportStep === 0
              ? 'Reading report…'
              : reportStep === 1
              ? 'Checking thresholds…'
              : 'All clear ✓'}
          </small>
        </div>
      </div>

      {/* Interactive Hover Hint */}
      <div className="mt-2 text-center text-[11px] text-gray-500 font-medium flex items-center justify-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
        <span>Hover your mouse over the card to reveal <b>Before vs After</b></span>
      </div>
    </div>
  );
}
