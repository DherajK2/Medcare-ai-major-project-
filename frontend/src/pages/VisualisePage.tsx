import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Dna,
  FileText,
  Focus,
  Info,
  Layers3,
  Maximize2,
  Minimize2,
  Pause,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  X
} from 'lucide-react';
import AnatomyScene from '../components/anatomy/scene';
import CellViewer from '../components/anatomy/CellViewer';
import type { CellTypeId } from '../components/anatomy/CellScene';
import {
  DEFAULT_VISIBLE,
  SYSTEMS,
  EXPLANATIONS,
  explanation,
  type Atlas,
  type Concept,
  type SceneState,
  type SystemId,
  type View
} from '../components/anatomy/anatomy';
import { resolveBiomarkerToElements, resolveCellularBiomarker } from '../components/anatomy/biomarker-mapping';
import { registerAtlasTools } from '../components/anatomy/agent-tools';
import { useAuthStore } from '../store/authStore';
import './VisualisePage.css';

const initial: SceneState = {
  explode: 0,
  visible: DEFAULT_VISIBLE,
  selected: [],
  isolate: false,
  selectionMode: 'whole',
  view: 'three-quarter',
  rotate: false,
  reset: 0
};

export default function VisualisePage() {
  const navigate = useNavigate();
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const user = useAuthStore((s) => s.user);

  const [viewMode, setViewMode] = useState<'macro' | 'cellular'>('macro');
  const [cellularCellId, setCellularCellId] = useState<CellTypeId>('rbc');
  const [patientBiomarkers, setPatientBiomarkers] = useState<any[]>([]);
  const [selectedBiomarkerKey, setSelectedBiomarkerKey] = useState<string>('');

  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [state, setState] = useState<SceneState>(initial);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<'layers' | 'search' | 'biomarkers' | null>(null);
  const [details, setDetails] = useState(false);
  const [about, setAbout] = useState(false);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Concept | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('medcare_analyzed_biomarkers');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPatientBiomarkers(parsed);
        }
      }
    } catch {}
  }, []);

  const hasPatientReport = Boolean(user && patientBiomarkers && patientBiomarkers.length > 0);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      const bName = urlParams.get('biomarker') || urlParams.get('test') || urlParams.get('name');
      if (mode === 'cellular') {
        setViewMode('cellular');
      }
      if (bName) {
        const cellType = resolveCellularBiomarker(bName);
        if (cellType) {
          setCellularCellId(cellType as CellTypeId);
          setViewMode('cellular');
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    setProgress(0);
    setError('');
    setAtlas(null);
    setChosen(null);
    setDetails(false);
    setState({ ...initial, visible: DEFAULT_VISIBLE });

    fetch('/models/atlas.json', { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error('The anatomy catalogue could not be loaded.');
        return r.json();
      })
      .then((data) => setAtlas(data as Atlas))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });

    return () => abort.abort();
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setPanel('search');
        setDetails(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const parts = useMemo(() => new Map(atlas?.parts.map((p) => [p.id, p])), [atlas]);
  const counts = useMemo(
    () => Object.fromEntries(SYSTEMS.map((s) => [s.id, atlas?.parts.filter((p) => p.system === s.id).length ?? 0])),
    [atlas]
  );
  const activeSystems = SYSTEMS.filter((s) => counts[s.id] > 0);
  const selectedParts = state.selected.map((id) => parts.get(id)).filter((p) => !!p);
  const selected = selectedParts[0];
  const system = SYSTEMS.find((s) => s.id === selected?.system);
  const visibleCount =
    atlas?.parts.filter((p) =>
      state.isolate
        ? state.selected.includes(p.id)
        : state.visible.includes(p.system) || state.selected.includes(p.id)
    ).length ?? 0;

  const results = useMemo(() => {
    if (!atlas) return [];
    const term = query.toLowerCase().trim();
    if (!term) {
      return ['heart', 'brain', 'liver', 'stomach', 'spleen', 'pancreas', 'urinary bladder', 'trachea']
        .map((name) => atlas.concepts.find((c) => c.name.toLowerCase() === name))
        .filter((x): x is Concept => !!x);
    }
    return atlas.concepts
      .filter((c) => c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term))
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, 80);
  }, [atlas, query]);

  const choose = (c: Concept) => {
    setChosen(c);
    setState((s) => ({ ...s, selected: c.elements, isolate: false, rotate: false }));
    setDetails(true);
    setPanel(null);
  };

  const choosePart = (id: string) => {
    const p = parts.get(id);
    if (!p) return;

    const concept = atlas?.concepts.find((c) => c.id === p.conceptId);
    const selectedIds = concept?.elements ?? [id];

    if (state.isolate) {
      setChosen({
        id: p.conceptId,
        name: p.name,
        elements: [id]
      });

      setState((s) => ({
        ...s,
        selected: [id],
        selectionMode: 'structure',
        isolate: true,
        rotate: false,
        explode: 0
      }));

      setDetails(true);
      setPanel(null);
      return;
    }

    setChosen({
      id: p.conceptId,
      name: concept?.name ?? p.name,
      elements: selectedIds
    });

    setState((s) => ({
      ...s,
      selected: selectedIds,
      selectionMode: 'whole',
      isolate: false,
      rotate: false,
      explode: 0
    }));

    setDetails(true);
    setPanel(null);
  };

  // Deterministic URL Biomarker linking
  useEffect(() => {
    if (!atlas) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const bName = urlParams.get('biomarker') || urlParams.get('test') || urlParams.get('name');
      if (bName) {
        const res = resolveBiomarkerToElements(atlas, bName);
        const mapping = res.mapping;
        if (mapping.mapped && res.elements.length > 0) {
          choose({
            id: mapping.conceptIds.join(', '),
            name: mapping.organ,
            elements: res.elements
          });
        }
      }
    } catch {}
  }, [atlas]);

  useEffect(() => {
    if (!atlas) return;
    return registerAtlasTools(
      atlas,
      (c) => flushSync(() => choose(c)),
      (biomarkerName) => {
        const res = resolveBiomarkerToElements(atlas, biomarkerName);
        const mapping = res.mapping;
        if (mapping.mapped && res.elements.length > 0) {
          flushSync(() =>
            choose({
              id: mapping.conceptIds.join(', '),
              name: mapping.organ,
              elements: res.elements
            })
          );
        }
        return res.mapping;
      }
    );
  }, [atlas]);

  // Find matching patient biomarkers for the selected organ
  const matchedBiomarkers = useMemo(() => {
    if (!chosen || patientBiomarkers.length === 0) return [];
    const lowerConceptName = chosen.name.toLowerCase();
    const conceptId = chosen.id || '';

    return patientBiomarkers.filter((b) => {
      const rawName = (b.biomarker || b.name || '').toLowerCase();
      if (!rawName) return false;

      if (atlas) {
        const res = resolveBiomarkerToElements(atlas, rawName);
        if (res.mapping.mapped) {
          const mapping = res.mapping;
          const organMatch =
            mapping.organs.some(
              (o) => lowerConceptName.includes(o.toLowerCase()) || o.toLowerCase().includes(lowerConceptName)
            ) || mapping.conceptIds.some((cid) => conceptId.includes(cid) || cid.includes(conceptId));
          if (organMatch) return true;
        }
      }

      // Keyword organ mappings
      if (lowerConceptName.includes('kidney') && (rawName.includes('creatinine') || rawName.includes('egfr') || rawName.includes('urea') || rawName.includes('bun') || rawName.includes('uric acid'))) return true;
      if (lowerConceptName.includes('liver') && (rawName.includes('alt') || rawName.includes('ast') || rawName.includes('bilirubin') || rawName.includes('sgpt') || rawName.includes('sgot') || rawName.includes('alp') || rawName.includes('albumin') || rawName.includes('ggt'))) return true;
      if (lowerConceptName.includes('heart') && (rawName.includes('troponin') || rawName.includes('ck-mb') || rawName.includes('bnp') || rawName.includes('cholesterol') || rawName.includes('triglyceride'))) return true;
      if (lowerConceptName.includes('pancreas') && (rawName.includes('glucose') || rawName.includes('sugar') || rawName.includes('hba1c') || rawName.includes('amylase') || rawName.includes('lipase') || rawName.includes('insulin'))) return true;
      if (lowerConceptName.includes('lung') && (rawName.includes('oxygen') || rawName.includes('spo2') || rawName.includes('blood gas') || rawName.includes('pao2'))) return true;
      if (lowerConceptName.includes('stomach') && rawName.includes('gastrin')) return true;

      return false;
    });
  }, [chosen, patientBiomarkers, atlas]);

  const handleSelectBiomarker = (b: {
    biomarker: string;
    value: number | string;
    unit?: string;
    referenceRange?: string;
    status?: string;
    notes?: string;
  }) => {
    setSelectedBiomarkerKey(b.biomarker);
    const cellType = resolveCellularBiomarker(b.biomarker);

    if (cellType && viewMode === 'cellular') {
      setCellularCellId(cellType as CellTypeId);
      return;
    }

    if (atlas) {
      const res = resolveBiomarkerToElements(atlas, b.biomarker);
      const mapping = res.mapping;
      if (mapping.mapped && res.elements.length > 0) {
        if (viewMode === 'cellular') {
          setViewMode('macro');
        }
        choose({
          id: mapping.conceptIds.join(', '),
          name: `${mapping.organ} · ${b.biomarker} (${b.value} ${b.unit || ''})`,
          elements: res.elements
        });
        return;
      }
    }

    if (cellType) {
      setCellularCellId(cellType as CellTypeId);
      setViewMode('cellular');
    }
  };

  const toggle = (id: SystemId) => {
    setDetails(false);
    setState((s) => ({
      ...s,
      selected: [],
      isolate: false,
      visible: s.visible.includes(id) ? s.visible.filter((x) => x !== id) : [...s.visible, id]
    }));
  };

  const reset = () => {
    setState((s) => ({ ...initial, visible: DEFAULT_VISIBLE, reset: s.reset + 1 }));
    setChosen(null);
    setDetails(false);
    setPanel(null);
  };

  const openPanel = (next: 'layers' | 'search' | 'biomarkers') => {
    setDetails(false);
    setPanel((p) => (p === next ? null : next));
  };

  const isDetailOpen = Boolean(details && selectedParts.length > 0);

  if (viewMode === 'cellular') {
    return (
      <main className="w-full h-[100dvh] relative overflow-hidden bg-[#070d18]">
        {/* Top Floating Bar with Mode Toggle & Back button */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => navigate('/app')}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl border border-white/10 shadow-lg transition-all cursor-pointer"
            title="Back to MedCare AI"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center bg-black/40 backdrop-blur-xl p-1 rounded-xl border border-white/10 shadow-lg">
            <button
              onClick={() => setViewMode('macro')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              Body Anatomy (Macro)
            </button>
            <button
              onClick={() => setViewMode('cellular')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-200 animate-pulse" />
              Blood Cells 3D (Micro)
            </button>
          </div>
        </div>

        <CellViewer
          initialCellId={cellularCellId}
          patientBiomarkers={patientBiomarkers}
          onBackToAnatomy={() => setViewMode('macro')}
        />
      </main>
    );
  }

  return (
    <main className="studio">
      {/* 3D WebGL Canvas Scene */}
      {atlas && (
        <AnatomyScene
          atlas={atlas}
          state={{ ...state, inspectorOpen: isDetailOpen }}
          onSelect={choosePart}
          onProgress={(n) => {
            setProgress(n);
            if (n === 100) setError('');
          }}
          onError={setError}
        />
      )}

      <div className="vignette" />

      {/* Top Left Branding */}
      <header className="identity">
        <div className="eyebrow">
          <span className="status-dot" /> INTERACTIVE ANATOMY
        </div>
        <h1>
          Human Atlas<span className="edition">3D</span>
        </h1>
        <div className="identity-meta">
          {atlas ? atlas.parts.length.toLocaleString() : '2,234'} modeled pieces <span>·</span> BodyParts3D
        </div>
      </header>

      {/* Top Right Action Toolbars */}
      <nav className="top-actions" aria-label="Explorer panels">
        <div className="hidden sm:flex items-center bg-white/80 backdrop-blur-md p-1 rounded-xl border border-[#18253620] shadow-sm pointer-events-auto">
          <button
            onClick={() => setViewMode('macro')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#263b48] text-white shadow-sm cursor-pointer"
          >
            Body Anatomy
          </button>
          <button
            onClick={() => setViewMode('cellular')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            Blood Cells 3D
          </button>
        </div>

        {hasPatientReport && (
          <button
            className={`patient-report-btn ${panel === 'biomarkers' ? 'active' : ''}`}
            onClick={() => openPanel('biomarkers')}
            aria-label="View Patient Lab Tests"
            title="View your uploaded lab report biomarkers in 3D"
          >
            <Sparkles size={16} className="text-teal-600" />
            <span>My Lab Tests ({patientBiomarkers.length})</span>
          </button>
        )}

        <button
          className="icon-button"
          onClick={() => navigate('/app')}
          title="Back to MedCare AI"
          aria-label="Back to MedCare AI"
        >
          <ArrowLeft size={18} />
        </button>

        <button
          className={panel === 'search' ? 'active' : ''}
          onClick={() => openPanel('search')}
          aria-label="Search anatomy"
        >
          <Search size={18} />
          <span>Find a structure</span>
          <kbd>/</kbd>
        </button>

        <button
          className="icon-button"
          aria-label="About this atlas"
          onClick={() => {
            setDetails(false);
            setPanel(null);
            setAbout(true);
          }}
        >
          <Info size={18} />
        </button>
      </nav>

      {/* Left Floating Systems Layer Panel */}
      <section
        className={`layers-panel glass ${panel === 'layers' ? 'mobile-open' : ''}`}
        aria-label="Anatomical layers"
      >
        <div className="panel-heading">
          <span>Systems</span>
          <button
            className="mobile-only icon-button"
            onClick={() => setPanel(null)}
            aria-label="Close systems"
          >
            <X size={18} />
          </button>
          <span className="desktop-only small-number">{activeSystems.length}</span>
        </div>

        <div className="layer-presets">
          <button
            aria-pressed={activeSystems.every((x) => state.visible.includes(x.id))}
            onClick={() =>
              setState((s) => ({
                ...s,
                selected: [],
                isolate: false,
                visible: activeSystems.map((x) => x.id)
              }))
            }
          >
            All
          </button>
          <button
            aria-pressed={state.visible.length === 1 && state.visible[0] === 'skeletal'}
            onClick={() =>
              setState((s) => ({ ...s, selected: [], isolate: false, visible: ['skeletal'] }))
            }
          >
            Skeleton
          </button>
          <button
            aria-pressed={
              state.visible.length === 6 &&
              ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine', 'reproductive'].every(
                (id) => state.visible.includes(id as SystemId)
              )
            }
            onClick={() =>
              setState((s) => ({
                ...s,
                selected: [],
                isolate: false,
                visible: ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine', 'reproductive']
              }))
            }
          >
            Organs
          </button>
        </div>

        <div className="system-list">
          {activeSystems.map((s) => (
            <div
              className={`system-row ${state.visible.includes(s.id) ? 'enabled' : ''}`}
              key={s.id}
            >
              <button
                className="system-name"
                title={`Show only ${s.name.toLowerCase()}`}
                onClick={() =>
                  setState((v) => ({ ...v, visible: [s.id], isolate: false, selected: [] }))
                }
              >
                <span className="system-dot" style={{ background: s.color }} />
                {s.name}
                <span className="system-count">{counts[s.id]}</span>
              </button>
              <input
                type="checkbox"
                checked={state.visible.includes(s.id)}
                onChange={() => toggle(s.id)}
                aria-label={`Show ${s.name.toLowerCase()}`}
                className="cursor-pointer"
              />
            </div>
          ))}
        </div>

        <div className="panel-foot">
          <span>{visibleCount.toLocaleString()} pieces visible</span>
          <button
            onClick={() => setState((s) => ({ ...s, visible: [], selected: [], isolate: false }))}
          >
            Hide all
          </button>
        </div>
      </section>

      {/* Patient Biomarkers Slide-Over Panel (Top Right, Clean & Dedicated) */}
      {panel === 'biomarkers' && hasPatientReport && (
        <section className="biomarkers-panel glass" aria-label="Patient Lab Biomarkers">
          <div className="panel-heading">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-teal-600" />
              <span>Patient Lab Tests</span>
            </div>
            <button
              className="icon-button"
              onClick={() => setPanel(null)}
              aria-label="Close biomarkers"
            >
              <X size={18} />
            </button>
          </div>

          <div className="biomarkers-panel-subhead">
            <span>{patientBiomarkers.length} tests from your uploaded health report</span>
            <span className="live-badge">
              <span className="live-dot" /> LIVE TWIN
            </span>
          </div>

          <div className="biomarkers-panel-list">
            {patientBiomarkers.map((b, idx) => {
              const isAttention =
                b.status === 'attention' ||
                b.status === 'high' ||
                b.status === 'low' ||
                b.status === 'critical';
              const isSelected = selectedBiomarkerKey === b.biomarker;

              return (
                <button
                  key={`${b.biomarker}-${idx}`}
                  onClick={() => handleSelectBiomarker(b)}
                  className={`biomarker-card-item ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`status-indicator-dot ${
                        isAttention ? 'status-dot-attention' : 'status-dot-normal'
                      }`}
                    />
                    <div className="text-left min-w-0">
                      <div className="biomarker-card-name truncate">{b.biomarker}</div>
                      {b.referenceRange && (
                        <div className="biomarker-card-ref">Ref: {b.referenceRange}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="text-right">
                      <span className="biomarker-card-val">{b.value}</span>
                      <span className="biomarker-card-unit">{b.unit || ''}</span>
                    </div>
                    <span
                      className={`biomarker-badge ${
                        isAttention ? 'badge-attention' : 'badge-normal'
                      }`}
                    >
                      {isAttention ? 'ATTENTION' : 'NORMAL'}
                    </span>
                    <span className="biomarker-arrow">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Anatomy Search Panel */}
      {panel === 'search' && (
        <section className="search-panel glass" aria-label="Find anatomy">
          <div className="panel-heading">
            <span>Find a structure</span>
            <button
              className="icon-button"
              onClick={() => setPanel(null)}
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </div>
          <input
            type="text"
            className="biomarker-search-input"
            placeholder="Heart, femur, cranial nerve, liver..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="max-h-80 overflow-y-auto mt-3 space-y-1">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => choose(c)}
                className="w-full text-left p-2.5 rounded-lg hover:bg-gray-100 flex items-center justify-between text-xs"
              >
                <span className="search-result-name capitalize font-medium">{c.name}</span>
                <span className="small-number">
                  {c.elements.length} {c.elements.length === 1 ? 'piece' : 'pieces'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Right Column Camera Controls */}
      <nav className="view-controls glass" aria-label="Camera controls">
        {(['three-quarter', 'front', 'side', 'back'] as View[]).map((v, i) => (
          <button
            key={v}
            className={state.view === v ? 'active' : ''}
            aria-pressed={state.view === v}
            disabled={state.explode > 0.8 && v !== 'front'}
            onClick={() => setState((s) => ({ ...s, view: v, reset: s.reset + 1, rotate: false }))}
            title={`${v} view`}
            aria-label={`${v} view`}
          >
            <span>{['¾', 'F', 'S', 'B'][i]}</span>
          </button>
        ))}
        <i />
        <button
          disabled={state.explode >= 0.4}
          aria-label={state.rotate ? 'Pause rotation' : 'Rotate body'}
          title="Auto rotate"
          className={state.rotate ? 'active' : ''}
          onClick={() => setState((s) => ({ ...s, rotate: !s.rotate }))}
        >
          {state.rotate ? <Pause size={17} /> : <RotateCw size={18} />}
        </button>
        <button aria-label="Reset view and layers" title="Reset" onClick={reset}>
          <RotateCcw size={17} />
        </button>
      </nav>

      {/* Caption line */}
      <div className="scene-caption">
        <span className="caption-line" />
        <span>
          {state.isolate
            ? chosen?.name ?? 'SELECTED STRUCTURE'
            : state.explode > 0.95
            ? 'ANATOMICAL INVENTORY'
            : state.explode > 0.05
            ? 'SEPARATED STRUCTURES'
            : 'ADULT HUMAN · MALE'}
        </span>
        <span className="caption-line" />
      </div>

      {/* Bottom Dock Explode Slider */}
      <div className="bottom-dock glass">
        <button
          className="mobile-only dock-layers"
          onClick={() => openPanel('layers')}
          aria-label="Open system layers"
        >
          <Layers3 size={20} />
          <span>Systems</span>
        </button>
        <div className="explode-control">
          <div className="explode-label">
            <label id="explode-label">Explode anatomy</label>
            <output>
              {Math.round(state.explode * 100)}
              <span>%</span>
            </output>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={state.explode * 100}
            onChange={(e) => {
              const v = parseFloat(e.target.value) / 100;
              setState((s) => ({
                ...s,
                explode: v,
                view: v > 0.8 ? 'front' : s.view,
                rotate: false
              }));
            }}
            className="w-full accent-[#263b48] cursor-pointer"
          />
          <div className="slider-endpoints">
            <span>Assembled</span>
            <span>Every piece</span>
          </div>
        </div>
        <button className="dock-reset" onClick={reset} aria-label="Assemble and reset">
          <RotateCcw size={18} />
          <span>Reset</span>
        </button>
      </div>

      {/* Footer Instructions */}
      <footer className="studio-footer">
        <span>
          {state.explode > 0.8 ? 'Drag to pan' : 'Drag to orbit'} <b>·</b> Pinch to zoom <b>·</b> Tap to inspect
        </span>
        <button
          onClick={() => {
            setDetails(false);
            setPanel(null);
            setAbout(true);
          }}
        >
          Source & credits <ArrowUpRight size={12} />
        </button>
      </footer>

      {/* Loading overlay */}
      {progress < 100 && !error && (
        <div className="loading glass" role="status">
          <Activity size={18} />
          <div>
            <strong>Preparing the anatomy</strong>
            <span>{progress}% · Loading {atlas?.parts.length.toLocaleString() ?? '2,234'} pieces</span>
            <div className="loading-track">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="loading glass error" role="alert">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reload viewer</button>
        </div>
      )}

      {/* Detail Drawer (Right Sheet) */}
      {isDetailOpen && (
        <aside className={`detail-sheet glass ${state.isolate ? 'is-isolated' : ''}`}>
          <div className="detail-header">
            <div className="detail-accent" style={{ background: system?.color }} />
            <div className="eyebrow">{system?.name ?? 'ANATOMY'}</div>
            <h2 ref={detailTitle} className="structure-title">
              {chosen?.name}
            </h2>
          </div>

          <div className="detail-scroll" key={`${chosen?.id}-${state.isolate}`}>
            {/* Patient Lab Twin Mapped Results Card */}
            {hasPatientReport && matchedBiomarkers.length > 0 && (
              <div className="patient-organ-tests-section">
                <div className="patient-organ-tests-head">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-teal-800">
                    <Sparkles size={14} className="text-teal-600" />
                    <span>Your Lab Results for this Organ</span>
                  </div>
                  <span className="live-badge">
                    <span className="live-dot" /> TWIN
                  </span>
                </div>
                <div className="patient-organ-tests-list">
                  {matchedBiomarkers.map((b, idx) => {
                    const isAttention =
                      b.status === 'attention' ||
                      b.status === 'high' ||
                      b.status === 'low' ||
                      b.status === 'critical';
                    return (
                      <div key={idx} className="patient-test-card">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-900">{b.biomarker}</span>
                          <span
                            className={`biomarker-badge ${
                              isAttention ? 'badge-attention' : 'badge-normal'
                            }`}
                          >
                            {isAttention ? (b.status?.toUpperCase() || 'ATTENTION') : 'NORMAL'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-base font-extrabold text-gray-900">{b.value}</span>
                          <span className="text-xs text-gray-500">{b.unit || ''}</span>
                        </div>
                        {b.referenceRange && (
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Reference: {b.referenceRange}
                          </div>
                        )}
                        {b.notes && (
                          <p className="text-[11px] text-teal-900 bg-teal-50 border border-teal-100 p-2 rounded-lg mt-1.5 leading-snug">
                            {b.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="structure-description">
              {chosen && selected ? explanation(chosen.name, selected.system) : ''}
            </p>

            {chosen && !EXPLANATIONS[chosen.name.toLowerCase()] && (
              <span className="context-note">System overview · structure identified from source anatomy</span>
            )}

            {chosen && (
              <div className="structure-meta">
                <span>Atlas reference<strong>{chosen?.id}</strong></span>
                <span>Selected pieces<strong>{state.selected.length.toLocaleString()}</strong></span>
              </div>
            )}

            {selectedParts.length > 1 && (
              <div className="member-list">
                <h3>Included structures</h3>
                {selectedParts.slice(0, 50).map((p) => (
                  <button key={p.id} onClick={() => choosePart(p.id)}>
                    <span>{p.name}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
                {selectedParts.length > 50 && (
                  <p>And {selectedParts.length - 50} more modeled pieces.</p>
                )}
              </div>
            )}

            <a className="source-link" href="https://lifesciencedb.jp/bp3d/" target="_blank" rel="noreferrer">
              View anatomical source <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="detail-actions">
            <button
              className={`primary-action ${state.isolate ? 'active' : ''}`}
              onClick={() => setState((s) => ({ ...s, isolate: !s.isolate, explode: 0 }))}
            >
              <Focus size={18} />
              <span>{state.isolate ? 'Show surrounding anatomy' : 'Isolate structure'}</span>
              <ChevronRight size={16} />
            </button>

            <button
              className="secondary-action"
              onClick={() => {
                setState((s) => ({ ...s, selected: [], isolate: false }));
                setDetails(false);
              }}
            >
              Clear selection
            </button>
          </div>
        </aside>
      )}

      {/* About dataset popup */}
      {about && (
        <div className="about-sheet glass" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50 }}>
          <div className="eyebrow">SOURCE & SCOPE</div>
          <h2 className="structure-title">A body, revealed.</h2>
          <p className="structure-description">Explore the adult male reference anatomy from BodyParts3D.</p>
          <div className="about-copy">
            <p>
              <strong>Male · BodyParts3D</strong><br />
              2,234 individual meshes and 3,432 named concepts from an adult male reference anatomy.
            </p>
            <p>
              This reference does not contain every human structure or variation. Named concepts can contain multiple pieces; each source mesh is rendered once.
            </p>
            <p>
              Colors and system groupings are designed for exploration. The geometry is simplified for the web, and short explanations provide general educational context. This is an anatomical reference, not a diagnostic or surgical tool.
            </p>
            <h3>Source</h3>
            <p>BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.</p>
            <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">
              Dataset license <ArrowUpRight size={14} />
            </a>
            <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html" target="_blank" rel="noreferrer">
              Original geometry & metadata <ArrowUpRight size={14} />
            </a>
            <a href="https://academic.oup.com/nar/article/37/suppl_1/D782/1000752" target="_blank" rel="noreferrer">
              Read the source publication <ArrowUpRight size={14} />
            </a>
            <button
              onClick={() => setAbout(false)}
              className="px-4 py-2 bg-[#263b48] text-white rounded-lg text-xs font-semibold mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
