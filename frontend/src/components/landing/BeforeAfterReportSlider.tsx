import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, FileText, AlertTriangle, CheckCircle2, Phone, Mail, ArrowLeftRight } from 'lucide-react';

export function BeforeAfterReportSlider() {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const clamped = Math.max(0, Math.min(rect.width, x));
      const percentage = (clamped / rect.width) * 100;
      setSliderPos(percentage);
    },
    []
  );

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseLeave = () => {
    setSliderPos(50);
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-14 px-4 select-none">
      {/* Header / Instructions */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3 shadow-sm">
          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
          Interactive Medical AI Transformation
        </div>
        <h3 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          From Confusing Medical Jargon to <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Actionable Visual Insights</span>
        </h3>
        <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-2xl mx-auto flex items-center justify-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-blue-500 animate-bounce" />
          Hover your mouse over the card to reveal the real-time AI transformation
        </p>
      </div>

      {/* Slider Container */}
      <div
        ref={containerRef}
        className="relative w-full h-[520px] sm:h-[580px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-black/10 bg-white cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
      >
        {/* ============================================================
            AFTER LAYER (SMART VISUAL REPORT) - Full Background Layer
        ============================================================ */}
        <div className="absolute inset-0 w-full h-full bg-slate-50/50 flex flex-col p-4 sm:p-7 overflow-y-auto">
          {/* Top Brand Banner */}
          <div className="flex items-center justify-between border-b pb-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">MedCare AI Smart Health Report</h4>
                <p className="text-[11px] text-gray-500">Diagnostic Intelligence • Verified Reference Ranges</p>
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-500 hidden sm:block">
              <div className="flex items-center gap-1 text-gray-600 justify-end"><Phone className="w-3 h-3 text-blue-500" /> +91 1860-500-1066</div>
              <div className="flex items-center gap-1 text-gray-600 justify-end"><Mail className="w-3 h-3 text-blue-500" /> care@medcare-ai.com</div>
            </div>
          </div>

          {/* Patient Quick Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-blue-50/70 border border-blue-100 rounded-xl p-2.5 sm:p-3 mb-3.5 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] font-medium">PATIENT NAME</span>
              <strong className="text-gray-800 font-semibold">Mr. KODANDARAMA S</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] font-medium">AGE / GENDER</span>
              <strong className="text-gray-800 font-semibold">68 Y / Male</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] font-medium">CLINICAL FINDING</span>
              <strong className="text-rose-700 font-semibold">Elevated PSA & Glucose</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] font-medium">ATTENDING PHYSICIAN</span>
              <strong className="text-gray-800 font-semibold">Dr. Raghu M S</strong>
            </div>
          </div>

          {/* Test Biomarkers Breakdown */}
          <div className="space-y-3 mb-3.5">
            {/* Total PSA */}
            <div className="bg-white rounded-xl border border-rose-200 p-3 sm:p-3.5 shadow-sm hover:border-rose-300 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-gray-900">Total PSA (Prostate-Specific Antigen)</span>
                  <p className="text-[11px] text-gray-500">Serum Immunoassay • Standard Reference &le; 4.0 ng/mL</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-rose-600">6.0 ng/mL</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    <AlertTriangle className="w-2.5 h-2.5" /> High Risk
                  </span>
                </div>
              </div>

              {/* Visual Range Bar */}
              <div className="mt-2">
                <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 relative">
                  <div
                    className="absolute -top-1 w-4 h-4 bg-rose-600 border-2 border-white rounded-full shadow-md transition-all"
                    style={{ left: '72%' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
                  <span>0.0 (Normal)</span>
                  <span>4.0 (Upper Limit)</span>
                  <span className="text-rose-600 font-bold">6.0 (Current)</span>
                  <span>10.0+ (Critical)</span>
                </div>
              </div>
            </div>

            {/* Random Blood Glucose */}
            <div className="bg-white rounded-xl border border-amber-200 p-3 sm:p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-gray-900">Random Blood Glucose (RBS)</span>
                  <p className="text-[11px] text-gray-500">Diagnostic Panel • Normal Range: 70 - 140 mg/dL</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-amber-600">345 mg/dL</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Elevated
                  </span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 relative mt-2">
                <div
                  className="absolute -top-1 w-4 h-4 bg-amber-600 border-2 border-white rounded-full shadow-md"
                  style={{ left: '88%' }}
                />
              </div>
            </div>
          </div>

          {/* AI Plain-Language Explanation */}
          <div className="mt-auto bg-gradient-to-r from-blue-50 via-indigo-50/60 to-blue-50 border border-blue-200 rounded-xl p-3 sm:p-3.5">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Clinical Summary & Next Steps:</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Your Total PSA of <strong>6.0 ng/mL</strong> is above the 4.0 ng/mL threshold. Accompanied by blood sugar at 345 mg/dL, continued adherence to Metformin and a follow-up urology consult with Dr. Raghu M S is strongly advised.
            </p>
          </div>

          {/* Label Badge */}
          <div className="absolute top-4 right-4 bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 tracking-wide">
            <CheckCircle2 className="w-3.5 h-3.5" />
            AI SMART REPORT
          </div>
        </div>

        {/* ============================================================
            BEFORE LAYER (RAW SCANNED REPORT) - Clipped Top Layer
        ============================================================ */}
        <div
          className="absolute inset-0 w-full h-full bg-white border-r-2 border-blue-600 shadow-2xl overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          {/* Inner Raw Image fixed width container so image does not distort during slide */}
          <div className="relative w-[750px] sm:w-[980px] h-full bg-white p-3 sm:p-6 select-none flex items-center justify-center">
            <img
              src="/raw_report_sample.png"
              alt="Raw Scanned Medical Report"
              className="w-full h-full object-contain filter contrast-125 select-none pointer-events-none"
            />

            {/* Label Badge for Raw Report */}
            <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 tracking-wide">
              <FileText className="w-3.5 h-3.5 text-gray-300" />
              RAW REPORT (BEFORE)
            </div>
          </div>
        </div>

        {/* ============================================================
            SLIDER DIVIDER & DRAG HANDLE
        ============================================================ */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-blue-600 shadow-[0_0_16px_rgba(37,99,235,0.9)] z-30 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Handle Grip Circle */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-blue-400/50 pointer-events-auto cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
            <div className="flex items-center gap-1 text-[12px] font-black tracking-tighter">
              <span>◀</span>
              <span>▶</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Range Scrubber */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500 font-medium px-2">
        <span className="flex items-center gap-1.5 text-gray-700 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" />
          Raw Scanned Document
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="w-44 sm:w-72 accent-blue-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
        />
        <span className="flex items-center gap-1.5 text-blue-600 font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block animate-pulse" />
          AI Smart Visualization
        </span>
      </div>
    </div>
  );
}
