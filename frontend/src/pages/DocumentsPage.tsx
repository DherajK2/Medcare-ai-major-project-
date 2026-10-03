import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import { Modal } from '../components/ui/Modal';
import {
  FileText, Trash2, Eye, RefreshCw, FileCheck, Sparkles,
  Search, Filter, Calendar, Stethoscope, Building2, Pill, Activity, ArrowRight,
  ShieldCheck, AlertCircle, UploadCloud, CheckCircle2, MessageSquare
} from 'lucide-react';
import { apiClient } from '../api/client';
import { medicationsApi } from '../api/medications';
import toast from 'react-hot-toast';

const DOC_TYPE_FILTERS = [
  { value: 'all',               label: 'All Documents' },
  { value: 'lab_report',        label: 'Lab Reports' },
  { value: 'prescription',      label: 'Prescriptions' },
  { value: 'doctor_note',       label: "Doctor's Notes" },
  { value: 'discharge_summary', label: 'Discharge Summaries' },
  { value: 'imaging',           label: 'Radiology / Imaging' },
];

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { currentPatient, patients, setActivePatient, refetch: refetchPatients } = usePatients();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detectedPatientPrompt, setDetectedPatientPrompt] = useState<{
    docId: string;
    fileName: string;
    detectedName: string;
    assignedName: string;
    assignedId: string;
  } | null>(null);
  const [targetReassignId, setTargetReassignId] = useState<string>('');
  const [customNewPatientName, setCustomNewPatientName] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);
  const [addingMeds, setAddingMeds] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddDocMedsToPatient = async (doc: any) => {
    const pid = doc.patient_id || currentPatient?.id;
    const meds = doc.extracted_data?.medications || [];
    if (!pid || meds.length === 0) return;
    setAddingMeds(true);
    try {
      const res = await medicationsApi.batchAddMedications({
        patient_id: pid,
        medications: meds.map((m: any) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          route: m.route || 'oral',
          instructions: m.instructions,
          prescribing_doctor: doc.extracted_data?.doctor_name,
          source_document_id: doc.id,
        })),
      });
      toast.success(res.message || `Added ${meds.length} medications to active prescriptions!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to add medications');
    } finally {
      setAddingMeds(false);
    }
  };

  const fetchDocuments = async (pid?: string) => {
    const id = pid || currentPatient?.id;
    if (!id) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/documents/${id}`);
      setDocuments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentPatient?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!currentPatient?.id) {
      toast.error('Please select a patient first');
      return;
    }

    setUploading(true);
    setUploadProgress(25);
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => (prev >= 85 ? 85 : prev + 15));
    }, 400);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', currentPatient.id);
      formData.append('document_type', 'lab_report');

      const res = await apiClient.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      clearInterval(progressTimer);
      setUploadProgress(100);
      toast.success(`"${file.name}" uploaded and AI clinical data extracted!`);
      await fetchDocuments();
      if (res.data) {
        setSelectedDoc(res.data);
        // If detected name differs from active patient or to confirm assignment
        const detName = res.data.detected_patient_name || res.data.extracted_data?.patient_name;
        if (detName && detName !== 'New Patient' && detName !== 'Unknown') {
          setDetectedPatientPrompt({
            docId: res.data.id,
            fileName: file.name,
            detectedName: detName,
            assignedName: res.data.assigned_patient_name || res.data.patient_name || `${currentPatient.first_name} ${currentPatient.last_name}`,
            assignedId: res.data.patient_id || currentPatient.id
          });
          setTargetReassignId(res.data.patient_id || currentPatient.id);
        }
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      toast.error(err?.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReassignPatient = async (docId: string, targetPid?: string, newName?: string) => {
    setReassigning(true);
    try {
      const payload = newName ? { create_new_patient_name: newName } : { target_patient_id: targetPid };
      const res = await apiClient.post(`/api/documents/${docId}/reassign`, payload);
      toast.success(res.data.message || 'Patient successfully reassigned!');
      setDetectedPatientPrompt(null);
      setCustomNewPatientName('');
      await refetchPatients();
      if (targetPid) {
        setActivePatient(targetPid);
      } else if (res.data.patient_id) {
        setActivePatient(res.data.patient_id);
      }
      await fetchDocuments(targetPid || res.data.patient_id);
      if (selectedDoc) {
        setSelectedDoc({ ...selectedDoc, patient_id: targetPid || res.data.patient_id, patient_name: res.data.patient_name });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to reassign document');
    } finally {
      setReassigning(false);
    }
  };

  const handleDelete = async (docId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    try {
      await apiClient.delete(`/api/documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      toast.success('Document deleted successfully');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  // Filter documents by type and search query
  const filteredDocs = documents.filter(doc => {
    const matchesType = selectedType === 'all' || doc.document_type === selectedType;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesType;
    
    const fileNameMatch = doc.file_name?.toLowerCase().includes(q);
    const textMatch = doc.extracted_text?.toLowerCase().includes(q);
    const diagMatch = doc.extracted_data?.diagnosis?.toLowerCase().includes(q);
    const docMatch = doc.extracted_data?.doctor_name?.toLowerCase().includes(q);
    
    return matchesType && (fileNameMatch || textMatch || diagMatch || docMatch);
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Saved Patient Documents</h1>
            {currentPatient && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {currentPatient.first_name} {currentPatient.last_name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Archive of all saved medical records, lab PDFs, prescriptions and discharge summaries for {currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'the active patient'}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchDocuments()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200/80 transition-all flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => navigate('/app/report-analyzer')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            Analyze New Report
          </button>
        </div>
      </div>

      {/* ── Dynamic Patient Assignment Confirmation Banner ── */}
      {detectedPatientPrompt && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-400 rounded-2xl p-4.5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Patient Assignment Verification for "{detectedPatientPrompt.fileName}"</span>
            </div>
            <button
              onClick={() => setDetectedPatientPrompt(null)}
              className="text-xs text-gray-400 hover:text-gray-700 font-bold"
            >
              ✕ Dismiss
            </button>
          </div>

          <p className="text-xs text-gray-700 leading-relaxed">
            AI extracted patient name: <strong className="text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded font-mono font-bold">"{detectedPatientPrompt.detectedName}"</strong>. 
            Currently linked to: <strong className="text-gray-900 font-semibold">{detectedPatientPrompt.assignedName}</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-gray-600">Assign this record & medications to:</span>
            
            <select
              value={targetReassignId}
              onChange={(e) => setTargetReassignId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  👤 {p.first_name} {p.last_name} {p.id === detectedPatientPrompt.assignedId ? '(Current)' : ''}
                </option>
              ))}
              <option value="NEW_PATIENT">➕ Create new patient profile for "{detectedPatientPrompt.detectedName}"</option>
            </select>

            {targetReassignId === 'NEW_PATIENT' && (
              <input
                type="text"
                value={customNewPatientName || detectedPatientPrompt.detectedName}
                onChange={(e) => setCustomNewPatientName(e.target.value)}
                placeholder="Enter new patient full name"
                className="px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-medium text-gray-900 outline-none w-56 shadow-2xs"
              />
            )}

            <button
              onClick={() => {
                if (targetReassignId === 'NEW_PATIENT') {
                  handleReassignPatient(detectedPatientPrompt.docId, undefined, customNewPatientName || detectedPatientPrompt.detectedName);
                } else {
                  handleReassignPatient(detectedPatientPrompt.docId, targetReassignId);
                }
              }}
              disabled={reassigning}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              {reassigning ? <RefreshCw size={12} className="animate-spin" /> : <ArrowRight size={13} />}
              Confirm & Move Medications
            </button>

            <button
              onClick={() => setDetectedPatientPrompt(null)}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold transition-all"
            >
              Keep as is
            </button>
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          {DOC_TYPE_FILTERS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setSelectedType(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedType === tab.value
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search report, doctor, test..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>
      </div>

      {/* ── Active Patient Document List ── */}
      <div>
        {!currentPatient ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
            <p className="font-bold text-gray-800 text-base">No Patient Selected</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Please select or create an active patient profile to view their medical document library.
            </p>
          </div>
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-16 bg-gray-100 rounded-xl" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3.5 shadow-inner">
              <FileText size={32} />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">
              {searchQuery ? 'No matching documents found' : 'No documents in library yet'}
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
              {searchQuery
                ? `No reports match "${searchQuery}". Try clearing search filters.`
                : `Upload and scan lab reports, prescriptions, or discharge summaries in Report Analyzer to extract clinical data for ${currentPatient.first_name} ${currentPatient.last_name}.`}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/app/report-analyzer')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all inline-flex items-center gap-2"
              >
                <Sparkles size={14} />
                Analyze a Report Now
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocs.map(doc => {
              const ext = doc.extracted_data || {};
              const medsCount = ext.medications?.length || 0;
              const vitalsCount = ext.vitals?.length || 0;
              const labsCount = ext.lab_results?.length || 0;

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-gray-200/80 p-5 hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Header: Icon, Name, Type */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <FileCheck size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate" title={doc.file_name}>
                            {doc.file_name}
                          </p>
                          <span className="inline-flex items-center text-[11px] font-semibold text-blue-700 capitalize mt-0.5">
                            {doc.document_type?.replace(/_/g, ' ') || 'Medical Report'}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        AI Indexed
                      </span>
                    </div>

                    {/* Metadata Tags */}
                    {(ext.doctor_name || ext.hospital_name || ext.diagnosis) && (
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1 text-xs text-gray-700">
                        {ext.doctor_name && (
                          <div className="flex items-center gap-1.5 text-gray-800 font-medium truncate">
                            <Stethoscope size={12} className="text-blue-600 shrink-0" />
                            <span className="truncate">{ext.doctor_name}</span>
                          </div>
                        )}
                        {ext.hospital_name && (
                          <div className="flex items-center gap-1.5 text-gray-600 truncate">
                            <Building2 size={12} className="text-indigo-600 shrink-0" />
                            <span className="truncate">{ext.hospital_name}</span>
                          </div>
                        )}
                        {ext.diagnosis && (
                          <div className="text-[11px] text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded border border-purple-100 truncate">
                            Diagnosis: {ext.diagnosis}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Counts Badge Row */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      {medsCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                          <Pill size={11} /> {medsCount} Meds
                        </span>
                      )}
                      {vitalsCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                          <Activity size={11} /> {vitalsCount} Vitals
                        </span>
                      )}
                      {labsCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 font-semibold border border-teal-100">
                          <Activity size={11} /> {labsCount} Tests
                        </span>
                      )}
                    </div>

                    {/* Snippet preview */}
                    {doc.extracted_text && (
                      <p className="text-xs text-gray-500 bg-gray-50/80 rounded-xl p-2.5 line-clamp-2 leading-relaxed font-sans">
                        {doc.extracted_text}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Date & Actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-1"
                      >
                        <Eye size={13} /> View Details
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => handleDelete(doc.id, doc.file_name)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detailed Document Analysis Modal ── */}
      {selectedDoc && (
        <Modal
          isOpen={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
          title={selectedDoc.file_name}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header info & Reassign Panel */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-600">Type:</span>
                  <span className="capitalize font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {selectedDoc.document_type?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-[11px]">
                  <Calendar size={12} />
                  <span>Uploaded on {new Date(selectedDoc.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Patient Ownership & Reassign */}
              <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium">Assigned Patient:</span>
                  <strong className="text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 font-bold">
                    {patients.find(p => p.id === selectedDoc.patient_id)?.first_name 
                      ? `${patients.find(p => p.id === selectedDoc.patient_id)?.first_name} ${patients.find(p => p.id === selectedDoc.patient_id)?.last_name}` 
                      : (selectedDoc.patient_name || 'Patient')}
                  </strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-medium text-[11px]">Move to:</span>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      if (val === 'NEW') {
                        const name = prompt('Enter full name for new patient:');
                        if (name) handleReassignPatient(selectedDoc.id, undefined, name);
                      } else {
                        handleReassignPatient(selectedDoc.id, val);
                      }
                    }}
                    value=""
                    className="px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-blue-900 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="" disabled>Switch Patient...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id} disabled={p.id === selectedDoc.patient_id}>
                        {p.first_name} {p.last_name} {p.id === selectedDoc.patient_id ? '(Current)' : ''}
                      </option>
                    ))}
                    <option value="NEW">➕ Create New Patient Profile...</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Structured Clinical Findings Content */}
            <div className="space-y-4">
              {/* Doctor & Hospital Details */}
              {(selectedDoc.extracted_data?.doctor_name || selectedDoc.extracted_data?.hospital_name || selectedDoc.extracted_data?.diagnosis) && (
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                    Medical Context
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {selectedDoc.extracted_data?.doctor_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Attending Doctor:</span>
                        <strong className="text-gray-900">{selectedDoc.extracted_data.doctor_name}</strong>
                      </div>
                    )}
                    {selectedDoc.extracted_data?.hospital_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Clinic / Hospital:</span>
                        <strong className="text-gray-900">{selectedDoc.extracted_data.hospital_name}</strong>
                      </div>
                    )}
                  </div>
                  {selectedDoc.extracted_data?.diagnosis && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Diagnosis:</span>
                      <p className="font-semibold text-purple-900 mt-0.5 bg-purple-50 p-2 rounded-lg border border-purple-100">
                        {selectedDoc.extracted_data.diagnosis}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Extracted Medications */}
              {selectedDoc.extracted_data?.medications?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                      <Pill size={13} className="text-indigo-600" />
                      Prescribed Medications ({selectedDoc.extracted_data.medications.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddDocMedsToPatient(selectedDoc)}
                        disabled={addingMeds}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {addingMeds ? <RefreshCw size={11} className="animate-spin" /> : <Pill size={11} />}
                        Add to Active Medications
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/app/medications')}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        View Hub →
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {selectedDoc.extracted_data.medications.map((m: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{m.name}</p>
                          <p className="text-gray-500 text-[11px]">{m.instructions || m.dosage}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded text-[11px] border border-indigo-100">
                          {m.frequency || 'Daily'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Lab Results */}
              {selectedDoc.extracted_data?.lab_results?.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Activity size={13} className="text-teal-600" />
                    Diagnostic Lab Results ({selectedDoc.extracted_data.lab_results.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400 font-semibold">
                          <th className="py-1.5 px-2">Test Name</th>
                          <th className="py-1.5 px-2">Result</th>
                          <th className="py-1.5 px-2">Reference</th>
                          <th className="py-1.5 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedDoc.extracted_data.lab_results.map((lr: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-1.5 px-2 font-medium text-gray-900">{lr.name}</td>
                            <td className="py-1.5 px-2 font-bold text-gray-900">{lr.value} {lr.unit}</td>
                            <td className="py-1.5 px-2 text-gray-500 text-[11px]">{lr.reference_range || '—'}</td>
                            <td className="py-1.5 px-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                lr.status === 'high' || lr.status === 'critical'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : lr.status === 'low'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {lr.status || 'Normal'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <button
                onClick={() => handleDelete(selectedDoc.id, selectedDoc.file_name)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all flex items-center gap-1"
              >
                <Trash2 size={13} /> Delete Document
              </button>

              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

