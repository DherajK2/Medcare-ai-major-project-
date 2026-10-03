import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  RotateCw, 
  Pause, 
  Layers, 
  Info, 
  ChevronRight, 
  Sliders, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Sparkles,
  CheckCircle2,
  FileText
} from 'lucide-react';
import CellScene, { CELL_DEFINITIONS, type CellTypeId, type CellModelConfig } from './CellScene';

interface ParsedBiomarker {
  biomarker: string;
  value: number | string;
  unit?: string;
  referenceRange?: string;
  status?: string;
  notes?: string;
}

interface CellViewerProps {
  initialCellId?: CellTypeId;
  patientBiomarkers?: ParsedBiomarker[];
  onBackToAnatomy?: () => void;
}

export default function CellViewer({
  initialCellId = 'rbc',
  patientBiomarkers = [],
  onBackToAnatomy
}: CellViewerProps) {
  const [selectedCellId, setSelectedCellId] = useState<CellTypeId>(initialCellId);
  const [cytoplasmOpacity, setCytoplasmOpacity] = useState<number>(0.42);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'morphology' | 'clinical' | 'patient'>('overview');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const cell = CELL_DEFINITIONS[selectedCellId] || CELL_DEFINITIONS.rbc;

  // Sync initialCellId when prop changes
  useEffect(() => {
    if (initialCellId && CELL_DEFINITIONS[initialCellId]) {
      setSelectedCellId(initialCellId);
    }
  }, [initialCellId]);

  // Find corresponding patient lab biomarker if available
  const matchingPatientBiomarker = patientBiomarkers.find((b) => {
    const raw = b.biomarker.toLowerCase();
    if (selectedCellId === 'rbc') return raw.includes('rbc') || raw.includes('erythrocyte') || raw.includes('hemoglobin') || raw.includes('hb');
    if (selectedCellId === 'platelet') return raw.includes('platelet') || raw.includes('thrombocyte') || raw.includes('plt');
    if (selectedCellId === 'neutrophil') return raw.includes('neutrophil') || raw.includes('anc') || raw.includes('poly');
    if (selectedCellId === 'lymphocyte') return raw.includes('lymphocyte') || raw.includes('alc');
    if (selectedCellId === 'monocyte') return raw.includes('monocyte') || raw.includes('amc');
    if (selectedCellId === 'eosinophil') return raw.includes('eosinophil') || raw.includes('aec');
    if (selectedCellId === 'basophil') return raw.includes('basophil') || raw.includes('abc');
    if (selectedCellId === 'wbc_total') return raw.includes('wbc') || raw.includes('leukocyte') || raw.includes('tlc');
    return false;
  });

  const cellTypesList: { id: CellTypeId; label: string; badge: string; color: string }[] = [
    { id: 'rbc', label: 'RBC (Erythrocyte)', badge: 'Oxygen Transport', color: '#ef4444' },
    { id: 'platelet', label: 'Platelet (Thrombocyte)', badge: 'Hemostasis & Clotting', color: '#a855f7' },
    { id: 'neutrophil', label: 'Neutrophil (WBC)', badge: 'Bacterial Defense (60%)', color: '#0284c7' },
    { id: 'lymphocyte', label: 'Lymphocyte (WBC)', badge: 'Adaptive Immunity (30%)', color: '#6366f1' },
    { id: 'monocyte', label: 'Monocyte (WBC)', badge: 'Phagocyte Precursor (5%)', color: '#0d9488' },
    { id: 'eosinophil', label: 'Eosinophil (WBC)', badge: 'Allergy & Parasites (2%)', color: '#f43f5e' },
    { id: 'basophil', label: 'Basophil (WBC)', badge: 'Histamine Release (<1%)', color: '#9333ea' },
    { id: 'wbc_total', label: 'Total WBC Pool', badge: 'Complete Leukocyte Pool', color: '#3b82f6' }
  ];

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row overflow-hidden bg-[#070d18] text-white">
      {/* Center 3D Viewport */}
      <div className="relative flex-1 h-full min-h-[50vh]">
        <CellScene
          selectedCellId={selectedCellId}
          cytoplasmOpacity={cytoplasmOpacity}
          autoRotate={autoRotate}
          onSelectCell={setSelectedCellId}
          onError={setErrorMsg}
        />

        {/* Top Floating Cell Selector Ribbon */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center gap-2 overflow-x-auto pb-2 scrollbar-none pointer-events-auto">
          {cellTypesList.map((item) => {
            const isSelected = selectedCellId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedCellId(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-xl transition-all shadow-md ${
                  isSelected
                    ? 'bg-white text-gray-900 ring-2 ring-teal-400 font-bold scale-105'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: item.color }}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Floating Quick Controls on Viewport */}
        <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl">
          {/* Rotation Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all ${
              autoRotate
                ? 'bg-teal-500/30 text-teal-300 border border-teal-500/40'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title={autoRotate ? 'Pause Rotation' : 'Enable Auto-Rotation'}
          >
            {autoRotate ? <Pause size={16} /> : <RotateCw size={16} />}
            <span className="hidden sm:inline font-medium">
              {autoRotate ? 'Rotating' : 'Static'}
            </span>
          </button>

          {/* Cytoplasm Opacity Slider (for WBCs) */}
          {cell.isWbc && (
            <div className="flex items-center gap-2 px-2 border-l border-white/10">
              <Sliders size={15} className="text-teal-400" />
              <div className="flex flex-col">
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                  <span>Membrane</span>
                  <span>{Math.round(cytoplasmOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={cytoplasmOpacity}
                  onChange={(e) => setCytoplasmOpacity(parseFloat(e.target.value))}
                  className="w-24 h-1.5 accent-teal-400 bg-white/20 rounded-lg cursor-pointer"
                  title="Adjust cytoplasm membrane transparency to reveal nucleus"
                />
              </div>
            </div>
          )}

          {/* Reset Camera */}
          <button
            onClick={() => {
              setAutoRotate(true);
              setCytoplasmOpacity(0.42);
            }}
            className="p-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Reset scene camera & opacity"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Microscopic Scale Indicator */}
        <div className="absolute bottom-6 right-6 z-20 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-[11px] text-gray-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>Microscopic 3D Cellular Twin (Mesh Resolution: 100K+)</span>
        </div>
      </div>

      {/* Right Information & Clinical Interpretation Panel */}
      <div className="w-full md:w-[420px] lg:w-[460px] h-full flex flex-col bg-[#0b1322]/90 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-white/10 z-20 shadow-2xl overflow-y-auto">
        {/* Panel Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {cell.category}
            </span>
            {cell.differentialPct && (
              <span className="text-xs text-gray-400 font-medium">
                Differential: <strong className="text-teal-300">{cell.differentialPct}</strong>
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{cell.name}</h2>
          <p className="text-xs text-teal-400/80 font-mono mt-0.5">{cell.scientificName}</p>
        </div>

        {/* Patient Lab Report Highlight Card (if user has active lab test) */}
        {matchingPatientBiomarker && (
          <div className="m-4 p-4 rounded-2xl bg-gradient-to-br from-teal-950/60 via-slate-900/80 to-blue-950/60 border border-teal-500/40 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300 uppercase tracking-wide">
                <FileText size={15} />
                <span>Patient Lab Report Value</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                matchingPatientBiomarker.status === 'normal' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {matchingPatientBiomarker.status || 'Extracted'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{matchingPatientBiomarker.value}</span>
              <span className="text-xs text-gray-400 font-medium">{matchingPatientBiomarker.unit || ''}</span>
            </div>
            {matchingPatientBiomarker.referenceRange && (
              <div className="text-xs text-gray-400 mt-1">
                Normal Reference Range: <span className="text-gray-200 font-semibold">{matchingPatientBiomarker.referenceRange}</span>
              </div>
            )}
            {matchingPatientBiomarker.notes && (
              <p className="text-xs text-teal-200/90 mt-2 bg-teal-900/30 p-2.5 rounded-xl border border-teal-500/20 leading-relaxed">
                {matchingPatientBiomarker.notes}
              </p>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 px-4 bg-black/20">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'morphology', label: 'Structure & Metrics' },
            { id: 'clinical', label: 'Clinical Insights' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 text-xs font-bold transition-all relative ${
                activeTab === tab.id
                  ? 'text-teal-300'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-teal-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-5 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Biological Role</h4>
                <p className="text-sm text-gray-200 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/5">
                  {cell.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Primary Physiological Function</h4>
                <p className="text-sm text-teal-200 leading-relaxed bg-teal-950/30 p-3.5 rounded-xl border border-teal-500/20">
                  {cell.clinicalFunction}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[11px] text-gray-400">Normal Range</div>
                  <div className="text-xs font-bold text-white mt-1">{cell.normalRange}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[11px] text-gray-400">Lifespan</div>
                  <div className="text-xs font-bold text-white mt-1">{cell.lifespan}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'morphology' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">3D Morphology & Cellular Anatomy</h4>
                <p className="text-sm text-gray-200 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/5">
                  {cell.morphology}
                </p>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cytological Specifications</h4>
                <div className="divide-y divide-white/5 rounded-xl bg-white/5 border border-white/5 px-3">
                  <div className="flex items-center justify-between py-2.5 text-xs">
                    <span className="text-gray-400">Cell Diameter</span>
                    <span className="font-semibold text-white">{cell.diameter}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 text-xs">
                    <span className="text-gray-400">Nuclear Structure</span>
                    <span className="font-semibold text-white">
                      {cell.isWbc ? 'Distinct Stained Chromatin Nucleus' : 'Anucleate (No nucleus)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 text-xs">
                    <span className="text-gray-400">Membrane & Cytoplasm</span>
                    <span className="font-semibold text-white">
                      {cell.isWbc ? 'Translucent Leukocyte Membrane' : 'Biconcave / Discoid Envelope'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clinical' && (
            <div className="space-y-4">
              {/* Elevated */}
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/20">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <TrendingUp size={16} />
                  <span>Causes of Elevated Levels (High Count)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-200">
                  {cell.causesHigh.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Low */}
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <TrendingDown size={16} />
                  <span>Causes of Decreased Levels (Low Count)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-200">
                  {cell.causesLow.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Panel Footer */}
        {onBackToAnatomy && (
          <div className="p-4 border-t border-white/10 bg-black/30">
            <button
              onClick={onBackToAnatomy}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-700 via-teal-800 to-slate-800 hover:from-teal-600 hover:to-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>← Switch to Macro Human Body 3D Atlas</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
