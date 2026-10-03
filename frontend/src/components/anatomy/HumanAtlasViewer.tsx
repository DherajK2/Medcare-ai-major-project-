import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  FlaskConical,
  Focus,
  Info,
  Layers3,
  Pause,
  RotateCcw,
  RotateCw,
  Search,
  X,
  ArrowLeft,
  Sliders
} from 'lucide-react';
import AnatomyScene from './scene';
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
} from './anatomy';
import {
  resolveBiomarkerToElements,
  getBiomarkerMapping,
  SAMPLE_REPORT_BIOMARKERS,
  type BiomarkerData,
  type BiomarkerMappingResult
} from './biomarker-mapping';
import { registerAtlasTools } from './agent-tools';

export interface HumanAtlasViewerProps {
  patientBiomarkers?: BiomarkerData[];
  initialBiomarker?: string;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}

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

export default function HumanAtlasViewer({
  patientBiomarkers,
  initialBiomarker,
  onBack,
  title = "3D Patient Digital Twin",
  subtitle = "Interactive Anatomy & Biomarker Correlation"
}: HumanAtlasViewerProps) {
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [state, setState] = useState<SceneState>(initial);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<'layers' | 'search' | 'biomarkers' | null>(
    patientBiomarkers && patientBiomarkers.length > 0 ? 'biomarkers' : null
  );
  const [details, setDetails] = useState(false);
  const [about, setAbout] = useState(false);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Concept | null>(null);
  const [selectedBiomarker, setSelectedBiomarker] = useState<BiomarkerData | null>(null);
  const [biomarkerResult, setBiomarkerResult] = useState<BiomarkerMappingResult | null>(null);
  const [biomarkerSearch, setBiomarkerSearch] = useState('');

  // Combine report biomarkers or fallback to standard sample database
  const activeBiomarkerCatalog = useMemo(() => {
    if (patientBiomarkers && patientBiomarkers.length > 0) {
      return patientBiomarkers;
    }
    return SAMPLE_REPORT_BIOMARKERS;
  }, [patientBiomarkers]);

  useEffect(() => {
    const abort = new AbortController();
    setProgress(0);
    setError('');
    setAtlas(null);
    setChosen(null);
    setSelectedBiomarker(null);
    setBiomarkerResult(null);
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

  const filteredBiomarkers = useMemo(() => {
    const q = biomarkerSearch.toLowerCase().trim();
    if (!q) return activeBiomarkerCatalog;
    return activeBiomarkerCatalog.filter(
      (b) =>
        b.biomarker.toLowerCase().includes(q) ||
        (b.notes && b.notes.toLowerCase().includes(q)) ||
        (b.status && b.status.toLowerCase().includes(q))
    );
  }, [biomarkerSearch, activeBiomarkerCatalog]);

  const choose = (c: Concept) => {
    setSelectedBiomarker(null);
    setBiomarkerResult(null);
    setChosen(c);
    setState((s) => ({ ...s, selected: c.elements, isolate: false, rotate: false }));
    setDetails(true);
    setPanel(null);
  };

  const selectBiomarker = (data: BiomarkerData) => {
    if (!atlas) return;
    setSelectedBiomarker(data);
    const res = resolveBiomarkerToElements(atlas, data.biomarker);
    setBiomarkerResult(res.mapping);

    if (res.mapping.mapped && res.elements.length > 0) {
      setChosen({
        id: res.mapping.conceptIds.join(', '),
        name: res.mapping.organ,
        elements: res.elements
      });

      setState((s) => ({
        ...s,
        selected: res.elements,
        selectionMode: 'whole',
        isolate: false,
        rotate: false,
        explode: 0
      }));

      setDetails(true);
      setPanel(null);
    } else {
      setChosen(null);
      setState((s) => ({
        ...s,
        selected: [],
        selectionMode: 'whole',
        isolate: false
      }));
      setDetails(true);
      setPanel(null);
    }
  };

  // Initial trigger if requested via props
  useEffect(() => {
    if (atlas && initialBiomarker) {
      const found = activeBiomarkerCatalog.find(
        (b) => b.biomarker.toLowerCase() === initialBiomarker.toLowerCase()
      );
      if (found) {
        selectBiomarker(found);
      } else {
        selectBiomarker({ biomarker: initialBiomarker, value: 'Report Value', status: 'high' });
      }
    }
  }, [atlas, initialBiomarker]);

  useEffect(() => {
    if (!atlas) return;
    return registerAtlasTools(
      atlas,
      (c) => flushSync(() => choose(c)),
      (biomarkerName) => {
        const bData: BiomarkerData = { biomarker: biomarkerName, value: 'Lab Test', status: 'abnormal' };
        flushSync(() => selectBiomarker(bData));
        return getBiomarkerMapping(biomarkerName);
      }
    );
  }, [atlas]);

  const choosePart = (id: string) => {
    const p = parts.get(id);
    if (!p) return;

    setSelectedBiomarker(null);
    setBiomarkerResult(null);
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

  const isolateWhole = () => {
    setState((s) => ({
      ...s,
      isolate: true,
      selectionMode: 'whole',
      rotate: false,
      explode: 0
    }));
  };

  const showWholeConcept = () => {
    if (!chosen || !atlas) return;
    setState((s) => ({
      ...s,
      selected: chosen.elements,
      isolate: false,
      selectionMode: 'whole',
      rotate: false,
      explode: 0
    }));
  };

  const selectStructure = (id: string) => {
    const p = parts.get(id);
    if (!p) return;

    setChosen({
      id: p.conceptId,
      name: p.name,
      elements: [id]
    });

    setState((s) => ({
      ...s,
      selected: [id],
      isolate: true,
      selectionMode: 'structure',
      rotate: false,
      explode: 0
    }));
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
    setSelectedBiomarker(null);
    setBiomarkerResult(null);
    setDetails(false);
    setPanel(null);
  };

  const openPanel = (next: 'layers' | 'search' | 'biomarkers') => {
    setDetails(false);
    setPanel((p) => (p === next ? null : next));
  };

  const isDetailOpen = Boolean(
    details &&
      (selectedParts.length > 0 || (selectedBiomarker && biomarkerResult && !biomarkerResult.mapped))
  );

  return (
    <div className="relative w-full h-full min-h-[600px] overflow-hidden select-none bg-[#f2f4f6] text-[#20242b] font-sans">
      {/* 3D WebGL Scene */}
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

      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_51%_43%,transparent_35%,rgba(131,145,158,0.12)_100%)]" />

      {/* Identity / Header */}
      <header className="absolute top-5 left-6 z-10 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-[#6c7885] uppercase">
          {onBack && (
            <button
              onClick={onBack}
              className="pointer-events-auto flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg border border-teal-200/60 shadow-sm backdrop-blur-md transition-all mr-2"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
          <span className="h-2 w-2 rounded-full bg-[#458a85] shadow-[0_0_8px_#458a85]" />
          <span>{subtitle}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1c2a38] flex items-center gap-2">
          {title}
          <span className="text-[10px] font-semibold tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md uppercase">
            3D BodyParts3D
          </span>
        </h1>
        <div className="text-xs text-[#78828c]">
          {atlas ? atlas.parts.length.toLocaleString() : '2,234'} modeled meshes · Verified Clinical Anatomy
        </div>
      </header>

      {/* Top action toolbars */}
      <nav className="absolute top-5 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => openPanel('biomarkers')}
          className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2.5 rounded-xl border backdrop-blur-md transition-all shadow-sm ${
            panel === 'biomarkers'
              ? 'bg-[#263b48] text-white border-[#263b48]'
              : 'bg-white/90 text-[#3c4a57] border-gray-200 hover:bg-white'
          }`}
        >
          <FlaskConical size={16} className={panel === 'biomarkers' ? 'text-teal-300' : 'text-teal-600'} />
          <span>Biomarkers</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
            {activeBiomarkerCatalog.length}
          </span>
        </button>

        <button
          onClick={() => openPanel('layers')}
          className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2.5 rounded-xl border backdrop-blur-md transition-all shadow-sm ${
            panel === 'layers'
              ? 'bg-[#263b48] text-white border-[#263b48]'
              : 'bg-white/90 text-[#3c4a57] border-gray-200 hover:bg-white'
          }`}
        >
          <Layers3 size={16} />
          <span>Systems</span>
        </button>

        <button
          onClick={() => openPanel('search')}
          className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2.5 rounded-xl border backdrop-blur-md transition-all shadow-sm ${
            panel === 'search'
              ? 'bg-[#263b48] text-white border-[#263b48]'
              : 'bg-white/90 text-[#3c4a57] border-gray-200 hover:bg-white'
          }`}
        >
          <Search size={16} />
          <span className="hidden md:inline">Search</span>
        </button>

        <button
          onClick={() => setAbout(true)}
          className="p-2.5 rounded-xl border border-gray-200 bg-white/90 hover:bg-white text-[#5c6875] backdrop-blur-md shadow-sm transition-all"
          title="About Reference Anatomy"
        >
          <Info size={16} />
        </button>
      </nav>

      {/* Systems Layer Panel */}
      {panel === 'layers' && (
        <aside className="absolute left-6 top-28 bottom-28 w-64 max-h-[580px] bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-xl z-20 flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Anatomy Systems</span>
            <button
              onClick={() => setPanel(null)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-1.5 py-3">
            <button
              onClick={() =>
                setState((s) => ({
                  ...s,
                  selected: [],
                  isolate: false,
                  visible: activeSystems.map((x) => x.id)
                }))
              }
              className="flex-1 text-[11px] py-1.5 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium text-gray-700 text-center"
            >
              All
            </button>
            <button
              onClick={() =>
                setState((s) => ({ ...s, selected: [], isolate: false, visible: ['skeletal'] }))
              }
              className="flex-1 text-[11px] py-1.5 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium text-gray-700 text-center"
            >
              Skeleton
            </button>
            <button
              onClick={() =>
                setState((s) => ({
                  ...s,
                  selected: [],
                  isolate: false,
                  visible: ['cardiac', 'respiratory', 'digestive', 'urinary', 'endocrine']
                }))
              }
              className="flex-1 text-[11px] py-1.5 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium text-gray-700 text-center"
            >
              Organs
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {activeSystems.map((s) => {
              const enabled = state.visible.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                    enabled ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-400 opacity-60'
                  }`}
                >
                  <button
                    onClick={() =>
                      setState((v) => ({ ...v, visible: [s.id], isolate: false, selected: [] }))
                    }
                    className="flex items-center gap-2.5 flex-1 text-left"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span>{s.name}</span>
                    <span className="text-[10px] text-gray-400 ml-auto mr-2">{counts[s.id]}</span>
                  </button>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggle(s.id)}
                    className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>{visibleCount.toLocaleString()} meshes visible</span>
            <button
              onClick={() => setState((s) => ({ ...s, visible: [], selected: [], isolate: false }))}
              className="text-red-500 hover:underline"
            >
              Hide all
            </button>
          </div>
        </aside>
      )}

      {/* Biomarker Lab Correlation Panel */}
      {panel === 'biomarkers' && (
        <aside className="absolute right-6 top-20 w-84 md:w-96 max-h-[calc(100vh-140px)] bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-2xl z-30 flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <FlaskConical size={18} className="text-teal-600" />
              <span>Biomarker Lab Correlation</span>
            </div>
            <button
              onClick={() => setPanel(null)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X size={16} />
            </button>
          </div>

          <div className="py-2.5">
            <input
              type="text"
              className="w-full h-9 px-3 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:border-teal-500 focus:bg-white focus:outline-none transition-all"
              placeholder="Search parameter (Creatinine, ALT, Troponin, Glucose)..."
              value={biomarkerSearch}
              onChange={(e) => setBiomarkerSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[460px]">
            {filteredBiomarkers.map((b, idx) => {
              const mapping = getBiomarkerMapping(b.biomarker);
              const isSelected =
                selectedBiomarker?.biomarker.toLowerCase() === b.biomarker.toLowerCase();
              return (
                <button
                  key={`${b.biomarker}-${idx}`}
                  onClick={() => selectBiomarker(b)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-teal-50/80 border-teal-500 shadow-sm'
                      : 'bg-white hover:bg-gray-50/80 border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-900">{b.biomarker}</span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        (b.status || '').toLowerCase() === 'high'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : (b.status || '').toLowerCase() === 'critical'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : (b.status || '').toLowerCase() === 'low'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {b.status || 'Normal'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-600">
                    <span>
                      Value: <strong className="text-gray-900 font-semibold">{b.value} {b.unit}</strong>
                    </span>
                    {b.referenceRange && (
                      <span className="text-gray-400 text-[10px]">Ref: {b.referenceRange}</span>
                    )}
                  </div>

                  {mapping.mapped ? (
                    <div className="text-[10px] font-medium text-teal-700 flex items-center gap-1 mt-0.5">
                      <span>Mapped Organ:</span>
                      <strong className="underline">{mapping.organ}</strong>
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 italic">
                      Non-modeled in BodyParts3D scope
                    </div>
                  )}
                </button>
              );
            })}

            {filteredBiomarkers.length === 0 && biomarkerSearch.trim() && (
              <button
                onClick={() =>
                  selectBiomarker({
                    biomarker: biomarkerSearch,
                    value: 'Custom Value',
                    status: 'attention'
                  })
                }
                className="w-full text-left p-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-50 text-xs text-teal-800"
              >
                <strong>Evaluate "{biomarkerSearch}" in 3D Atlas</strong>
                <p className="text-[11px] text-gray-500 mt-1">
                  Click to test deterministic FMA anatomical resolution.
                </p>
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Anatomy Structure Search Panel */}
      {panel === 'search' && (
        <aside className="absolute right-6 top-20 w-80 md:w-96 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-2xl z-30 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">Find Named Structure</span>
            <button
              onClick={() => setPanel(null)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X size={16} />
            </button>
          </div>
          <div className="py-2.5">
            <input
              type="text"
              className="w-full h-9 px-3 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:border-teal-500 focus:bg-white focus:outline-none transition-all"
              placeholder="Heart, femur, liver, aorta, cranial nerve..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => choose(c)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-gray-100 text-xs flex items-center justify-between group transition-all"
              >
                <span className="font-medium text-gray-800 capitalize group-hover:text-teal-700">
                  {c.name}
                </span>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {c.elements.length} {c.elements.length === 1 ? 'part' : 'parts'}
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Camera View Orbit Toolbar */}
      <nav className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 p-1.5 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg">
        {(['three-quarter', 'front', 'side', 'back'] as View[]).map((v, i) => (
          <button
            key={v}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
              state.view === v
                ? 'bg-[#263b48] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setState((s) => ({ ...s, view: v, reset: s.reset + 1, rotate: false }))}
            title={`${v} camera view`}
          >
            {['¾', 'F', 'S', 'B'][i]}
          </button>
        ))}
        <div className="h-px bg-gray-200 my-1 mx-1.5" />
        <button
          onClick={() => setState((s) => ({ ...s, rotate: !s.rotate }))}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            state.rotate ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Auto Rotate"
        >
          {state.rotate ? <Pause size={15} /> : <RotateCw size={15} />}
        </button>
        <button
          onClick={reset}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all"
          title="Reset Camera & Systems"
        >
          <RotateCcw size={15} />
        </button>
      </nav>

      {/* Bottom Explode Slider & Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-5 py-3.5 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-xl w-[90%] max-w-lg">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Sliders size={14} className="text-teal-600" />
              Explode Anatomy
            </span>
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {Math.round(state.explode * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={state.explode * 100}
            onChange={(e) => {
              const val = parseFloat(e.target.value) / 100;
              setState((s) => ({
                ...s,
                explode: val,
                view: val > 0.8 ? 'front' : s.view,
                rotate: false
              }));
            }}
            className="w-full accent-[#263b48] h-1.5 bg-gray-200 rounded-lg cursor-pointer"
          />
        </div>

        <button
          onClick={reset}
          className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-gray-500 hover:text-gray-800 pl-3 border-l border-gray-200"
        >
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>
      </div>

      {/* Detail Inspector Drawer */}
      {isDetailOpen && (
        <aside className="absolute right-6 top-20 bottom-24 w-84 md:w-96 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-2xl z-30 flex flex-col p-5 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedBiomarker ? '#458a85' : system?.color || '#263b48' }}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {selectedBiomarker ? 'Lab Correlation' : system?.name || 'Anatomy'}
              </span>
            </div>
            <button
              onClick={() => {
                setDetails(false);
                setSelectedBiomarker(null);
                setBiomarkerResult(null);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            <h2 className="text-xl font-bold text-gray-900 capitalize leading-tight">
              {selectedBiomarker ? selectedBiomarker.biomarker : chosen?.name}
            </h2>

            {/* Biomarker Context Card */}
            {selectedBiomarker && biomarkerResult && biomarkerResult.mapped && (
              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900">{biomarkerResult.name}</span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      (selectedBiomarker.status || '').toLowerCase() === 'high'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {selectedBiomarker.status || 'Normal'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-teal-200/60">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Reported Value</span>
                    <strong className="text-gray-900 font-bold">
                      {selectedBiomarker.value} {selectedBiomarker.unit}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Reference Interval</span>
                    <strong className="text-gray-900 font-bold">
                      {selectedBiomarker.referenceRange || 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Target Organ</span>
                    <strong className="text-teal-800 font-bold">{biomarkerResult.organ}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Category</span>
                    <strong className="text-gray-800 font-bold">{biomarkerResult.clinicalCategory}</strong>
                  </div>
                </div>

                {selectedBiomarker.notes && (
                  <div className="text-xs text-gray-700 bg-white/80 p-2.5 rounded-lg border border-teal-100 leading-relaxed">
                    <strong>Clinical Note: </strong>
                    {selectedBiomarker.notes}
                  </div>
                )}

                <p className="text-xs text-gray-600 leading-relaxed pt-1">
                  {biomarkerResult.description}
                </p>
              </div>
            )}

            {/* Unmapped warning */}
            {selectedBiomarker && biomarkerResult && !biomarkerResult.mapped && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertCircle size={16} className="text-amber-600" />
                  <span>Unmodeled in 3D Reference Model</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-800">{biomarkerResult.reason}</p>
              </div>
            )}

            {/* Standard Anatomical Explanation */}
            {!selectedBiomarker && chosen && selected && (
              <p className="text-xs text-gray-600 leading-relaxed">
                {explanation(chosen.name, selected.system)}
              </p>
            )}

            {chosen && (
              <div className="flex items-center justify-between text-xs py-3 border-y border-gray-100 text-gray-500">
                <span>
                  Atlas Ref: <strong className="text-gray-800">{chosen.id}</strong>
                </span>
                <span>
                  Pieces: <strong className="text-gray-800">{state.selected.length}</strong>
                </span>
              </div>
            )}

            {/* Sub-structures */}
            {selectedParts.length > 1 && !selectedBiomarker && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Included Sub-structures
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {selectedParts.slice(0, 30).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectStructure(p.id)}
                      className="w-full text-left p-2 rounded-lg hover:bg-gray-100 text-xs flex items-center justify-between text-gray-700"
                    >
                      <span className="capitalize truncate">{p.name}</span>
                      <ChevronRight size={12} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-2">
            {chosen && !state.isolate && (
              <button
                onClick={isolateWhole}
                className="w-full py-2.5 px-3 rounded-xl bg-[#263b48] hover:bg-[#344f60] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Focus size={15} />
                <span>Isolate Whole {chosen.name}</span>
              </button>
            )}

            {chosen && state.isolate && (
              <button
                onClick={showWholeConcept}
                className="w-full py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Focus size={15} />
                <span>Show Surrounding Body Anatomy</span>
              </button>
            )}

            <button
              onClick={() => {
                setState((s) => ({ ...s, selected: [], isolate: false, selectionMode: 'whole' }));
                setSelectedBiomarker(null);
                setBiomarkerResult(null);
                setDetails(false);
                setChosen(null);
              }}
              className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              Clear Selection
            </button>
          </div>
        </aside>
      )}

      {/* About dataset popup */}
      {about && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Anatomical Reference Scope</h3>
              <button onClick={() => setAbout(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Based on the <strong>BodyParts3D</strong> adult reference anatomy, featuring 2,234 discrete 3D meshes and 3,432 named anatomical concepts mapped to the Foundational Model of Anatomy (FMA).
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Biomarker mappings are clinical correlations designed for educational visualization and patient understanding.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setAbout(false)}
                className="px-4 py-2 bg-[#263b48] text-white text-xs font-bold rounded-xl"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {progress < 100 && !error && (
        <div className="absolute inset-0 z-40 bg-[#f2f4f6]/90 backdrop-blur-md flex flex-col items-center justify-center gap-3">
          <Activity size={28} className="text-teal-600 animate-pulse" />
          <div className="text-sm font-semibold text-gray-800">Loading 3D Anatomy Model ({progress}%)</div>
          <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-40 bg-white/95 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle size={32} className="text-red-500 mb-2" />
          <h3 className="text-base font-bold text-gray-900">Viewer Error</h3>
          <p className="text-xs text-gray-600 max-w-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold"
          >
            Reload
          </button>
        </div>
      )}
    </div>
  );
}
