import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePatients } from "../hooks/usePatients";
import { documentsApi, type DocumentAnalysisResult, type VitalExtracted, type LabResult } from "../api/documents";
import { medicationsApi } from "../api/medications";
import { UserCheck, RefreshCw, ArrowRight, UserPlus, AlertCircle, Pill, CheckCircle2, FlaskConical } from "lucide-react";
import toast from "react-hot-toast";
import "./ReportAnalyzer.css";

interface Biomarker {
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: "normal" | "attention" | "borderline";
  explanation: string;
  action: string;
  trend: number[];
}

const faqs = [
  {
    q: "Is it safe to upload my lab report?",
    a: "Yes. All files are processed securely and encrypted. We follow healthcare data protection standards to ensure your privacy.",
  },
  {
    q: "Will this tool give me a medical diagnosis?",
    a: "No. This tool provides educational information about lab values. Always consult a qualified healthcare professional for medical advice.",
  },
  {
    q: "What types of lab reports can I upload?",
    a: "PDF, JPG, and PNG files are supported. The AI can extract data from blood tests, CBC, lipid panels, thyroid tests, prescriptions, and discharge summaries.",
  },
  {
    q: "I don't understand medical terms. Will this make them simpler?",
    a: "Yes. The tool translates technical terminology into plain language while preserving accuracy and showing reference ranges visually.",
  },
];

const reviews = [
  {
    stars: 5,
    quote:
      "The visual explanations completely changed how I review my reports. I can immediately see what needs attention.",
    name: "Priya Sharma",
    role: "Patient User",
  },
  {
    stars: 5,
    quote:
      "Instead of googling every medical term, I can see the result, range and explanation together. Extremely helpful.",
    name: "Rajesh Kumar",
    role: "Family Caregiver",
  },
  {
    stars: 4,
    quote:
      "The trend view makes it much easier to understand how my values have changed over time. Highly recommended.",
    name: "Anita Desai",
    role: "Health Monitoring User",
  },
];

function SeverityRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm text-gray-700 font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-900">{count}</span>
    </div>
  );
}

export default function ReportAnalyzer() {
  const navigate = useNavigate();
  const { patients, activePatientId, setActivePatient, refetch: refetchPatients, currentPatient } = usePatients();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "analyzing" | "complete">("idle");
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);

  // Dynamic Patient Assignment Prompt
  const [detectedPatientPrompt, setDetectedPatientPrompt] = useState<{
    docId: string;
    fileName: string;
    detectedName: string;
    assignedName: string;
    assignedId: string;
  } | null>(null);
  const [targetReassignId, setTargetReassignId] = useState<string>("");
  const [customNewPatientName, setCustomNewPatientName] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);

  // Medication Ingestion & Confirmation State
  const [selectedMedIndices, setSelectedMedIndices] = useState<number[]>([]);
  const [medicationsAdded, setMedicationsAdded] = useState(false);
  const [addingMedications, setAddingMedications] = useState(false);

  const [selectedMarker, setSelectedMarker] = useState<Biomarker | null>(null);
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);

  const [language, setLanguage] = useState("English");
  const [showFullReport, setShowFullReport] = useState(false);

  const [riskScore, setRiskScore] = useState(68);
  const [uploadHover, setUploadHover] = useState(false);

  // Interactive Risk Simulator state
  const [simGlucose, setSimGlucose] = useState(110);
  const [simSystolic, setSimSystolic] = useState(120);
  const [simHeartRate, setSimHeartRate] = useState(74);
  const [simSpO2, setSimSpO2] = useState(98);

  const simulatedHealthScore = useMemo(() => {
    let score = 100;
    if (simGlucose > 250 || simGlucose < 60) score -= 35;
    else if (simGlucose > 140 || simGlucose < 70) score -= 15;

    if (simSystolic > 160 || simSystolic < 90) score -= 30;
    else if (simSystolic > 130) score -= 12;

    if (simSpO2 < 90) score -= 40;
    else if (simSpO2 < 95) score -= 18;

    if (simHeartRate > 120 || simHeartRate < 45) score -= 20;
    else if (simHeartRate > 100 || simHeartRate < 55) score -= 10;

    return Math.max(20, Math.min(100, score));
  }, [simGlucose, simSystolic, simHeartRate, simSpO2]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenIn3DAtlas = (biomarkerName?: string, mode?: 'macro' | 'cellular') => {
    const payload = biomarkers.map(b => ({
      biomarker: b.name,
      value: b.value,
      unit: b.unit,
      referenceRange: b.min !== undefined && b.max !== undefined ? `${b.min} - ${b.max}` : undefined,
      status: b.status === "attention" ? "high" : b.status === "borderline" ? "borderline" : "normal",
      notes: b.explanation || b.action
    }));
    try {
      window.localStorage.setItem('medcare_analyzed_biomarkers', JSON.stringify(payload));
    } catch {}

    const query = new URLSearchParams();
    if (biomarkerName) query.set('biomarker', biomarkerName);
    if (mode) query.set('mode', mode);
    const search = query.toString() ? `?${query.toString()}` : '';

    navigate(`/visualise${search}`, { state: { biomarkers: payload, initialBiomarker: biomarkerName, mode } });
  };

  /* Analysis simulation with real upload */
  const performAnalysis = async (selectedFile: File) => {
    if (!activePatientId) {
      toast.error("Please select a patient first");
      return;
    }

    setFile(selectedFile);
    setStage("analyzing");
    setProgress(0);

    // Simulate progress
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return prev + 5;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("patient_id", activePatientId);
      formData.append("document_type", "lab_report");

      const result = await documentsApi.uploadDocument(formData);
      
      clearInterval(progressTimer);
      setProgress(100);
      setAnalysisResult(result);

      // Convert extracted vitals and lab results to biomarkers
      const extractedBiomarkers = convertToBiomarkers(result.extracted_data);
      setBiomarkers(extractedBiomarkers);
      
      if (extractedBiomarkers.length > 0) {
        setSelectedMarker(extractedBiomarkers[0]);
        try {
          const payload = extractedBiomarkers.map(b => ({
            biomarker: b.name,
            value: b.value,
            unit: b.unit,
            referenceRange: b.min !== undefined && b.max !== undefined ? `${b.min} - ${b.max}` : undefined,
            status: b.status === "attention" ? "high" : b.status === "borderline" ? "borderline" : "normal",
            notes: b.explanation || b.action
          }));
          window.localStorage.setItem('medcare_analyzed_biomarkers', JSON.stringify(payload));
        } catch {}
      }

      setStage("complete");
      
      // Initialize medication selection
      const medList = result.extracted_data.medications || [];
      setSelectedMedIndices(medList.map((_, i) => i));
      setMedicationsAdded(false);

      // Check detected patient name for dynamic verification & reassignment
      const detName = (result as any).detected_patient_name || result.extracted_data?.patient_name;
      if (detName && detName !== 'New Patient' && detName !== 'Unknown') {
        setDetectedPatientPrompt({
          docId: result.id,
          fileName: selectedFile.name,
          detectedName: detName,
          assignedName: (result as any).assigned_patient_name || result.patient_name || (currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Current Patient'),
          assignedId: (result as any).patient_id || activePatientId
        });
        setTargetReassignId((result as any).patient_id || activePatientId);
      }

      const medCount = result.extracted_data.medications?.length || 0;
      const vitalCount = result.extracted_data.vitals?.length || 0;
      
      toast.success(
        `Report analyzed! ${medCount} medications and ${vitalCount} vitals extracted.`,
        { duration: 5000 }
      );
    } catch (error: any) {
      clearInterval(progressTimer);
      setStage("idle");
      setProgress(0);
      toast.error(error?.response?.data?.detail || "Upload failed. Please try again.");
    }
  };

  const handleAddMedicationsToPatient = async (targetPatientId?: string) => {
    const pid = targetPatientId || analysisResult?.patient_id || activePatientId;
    if (!pid) {
      toast.error("Please select a patient profile first");
      return;
    }
    const allMeds = analysisResult?.extracted_data?.medications || [];
    const medsToAdd = allMeds.filter((_, idx) => selectedMedIndices.includes(idx));
    if (medsToAdd.length === 0) {
      toast.error("Please select at least one medication to add");
      return;
    }

    setAddingMedications(true);
    try {
      const res = await medicationsApi.batchAddMedications({
        patient_id: pid,
        medications: medsToAdd.map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          route: m.route || 'oral',
          instructions: m.instructions,
          prescribing_doctor: analysisResult?.extracted_data?.doctor_name,
          source_document_id: analysisResult?.id
        }))
      });
      setMedicationsAdded(true);
      toast.success(res.message || `Added ${medsToAdd.length} medications to active prescriptions!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to add medications");
    } finally {
      setAddingMedications(false);
    }
  };

  const handleReassignPatient = async (docId: string, targetPid?: string, newName?: string) => {
    setReassigning(true);
    try {
      const payload = newName ? { create_new_patient_name: newName } : { target_patient_id: targetPid };
      const res = await documentsApi.reassignDocument(docId, payload);
      toast.success(res.message || 'Patient profile updated!');
      setDetectedPatientPrompt(null);
      setCustomNewPatientName('');
      await refetchPatients();
      if (targetPid) {
        setActivePatient(targetPid);
      } else if (res.patient_id) {
        setActivePatient(res.patient_id);
      }
      if (analysisResult) {
        setAnalysisResult({ ...analysisResult, patient_id: targetPid || res.patient_id, patient_name: res.patient_name });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to reassign document');
    } finally {
      setReassigning(false);
    }
  };

  const convertToBiomarkers = (data: DocumentAnalysisResult['extracted_data']): Biomarker[] => {
    const markers: Biomarker[] = [];

    // Convert vitals to biomarkers
    data.vitals?.forEach((vital) => {
      const marker = createBiomarkerFromVital(vital);
      if (marker) markers.push(marker);
    });

    // Convert lab results to biomarkers
    data.lab_results?.forEach((lab) => {
      const marker = createBiomarkerFromLab(lab);
      if (marker) markers.push(marker);
    });

    return markers;
  };

  const createBiomarkerFromVital = (vital: VitalExtracted): Biomarker | null => {
    const metricConfigs: Record<string, { name: string; min: number; max: number; explanation: string; action: string }> = {
      blood_pressure_systolic: {
        name: "Blood Pressure (Systolic)",
        min: 90,
        max: 120,
        explanation: "Systolic blood pressure measures the pressure in your arteries when your heart beats.",
        action: "Monitor regularly and consult your doctor if readings are consistently outside the normal range.",
      },
      blood_pressure_diastolic: {
        name: "Blood Pressure (Diastolic)",
        min: 60,
        max: 80,
        explanation: "Diastolic blood pressure measures the pressure in your arteries between heartbeats.",
        action: "Maintain a healthy lifestyle with regular exercise and a balanced diet.",
      },
      blood_glucose: {
        name: "Blood Glucose",
        min: 70,
        max: 100,
        explanation: "Blood glucose level indicates how much sugar is in your bloodstream.",
        action: "If fasting glucose is elevated, discuss diabetes screening with your healthcare provider.",
      },
      heart_rate: {
        name: "Heart Rate",
        min: 60,
        max: 100,
        explanation: "Your heart rate shows how many times your heart beats per minute.",
        action: "Continue regular physical activity and consult if you experience irregular heartbeats.",
      },
      temperature: {
        name: "Body Temperature",
        min: 97,
        max: 99,
        explanation: "Body temperature is an indicator of overall health and metabolic activity.",
        action: "Fever above 100°F should be evaluated by a healthcare professional.",
      },
      oxygen_saturation: {
        name: "Oxygen Saturation",
        min: 95,
        max: 100,
        explanation: "Oxygen saturation measures how much oxygen your blood is carrying.",
        action: "Levels below 95% may require medical attention.",
      },
      hemoglobin: {
        name: "Hemoglobin",
        min: 12,
        max: 16,
        explanation: "Hemoglobin carries oxygen throughout your body.",
        action: "Low levels may indicate anemia; consult your doctor for iron supplementation if needed.",
      },
      hba1c: {
        name: "HbA1c",
        min: 4,
        max: 5.7,
        explanation: "HbA1c shows your average blood sugar over the past 2-3 months.",
        action: "Levels above 6.5% indicate diabetes. Discuss management strategies with your doctor.",
      },
      weight: {
        name: "Weight",
        min: 50,
        max: 80,
        explanation: "Body weight is monitored for overall health assessment.",
        action: "Maintain a healthy weight through balanced diet and regular exercise.",
      },
    };

    const config = metricConfigs[vital.metric_type];
    if (!config) return null;

    const status = determineStatus(vital.value, config.min, config.max);

    return {
      name: config.name,
      value: vital.value,
      unit: vital.unit,
      min: config.min,
      max: config.max,
      status,
      explanation: config.explanation,
      action: config.action,
      trend: [vital.value], // Single value for now
    };
  };

  const createBiomarkerFromLab = (lab: LabResult): Biomarker | null => {
    // Parse reference range like "70-100" or "12-16"
    const rangeMatch = lab.reference_range?.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
    if (!rangeMatch) return null;

    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    const value = parseFloat(lab.value);

    if (isNaN(value) || isNaN(min) || isNaN(max)) return null;

    const status = lab.status === 'normal' ? 'normal' : 
                   lab.status === 'high' || lab.status === 'low' ? 'attention' : 
                   lab.status === 'critical' ? 'attention' : 'borderline';

    return {
      name: lab.name,
      value,
      unit: lab.unit,
      min,
      max,
      status,
      explanation: `${lab.name} measures a specific health parameter. Reference range: ${lab.reference_range} ${lab.unit}.`,
      action: status === 'normal' 
        ? "Your value is within the normal range. Continue monitoring as recommended by your doctor."
        : "This value is outside the reference range. Discuss this result with your healthcare provider.",
      trend: [value],
    };
  };

  const determineStatus = (value: number, min: number, max: number): "normal" | "attention" | "borderline" => {
    if (value >= min && value <= max) return "normal";
    const deviation = value < min ? (min - value) / min : (value - max) / max;
    return deviation > 0.2 ? "attention" : "borderline";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) performAnalysis(selectedFile);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setUploadHover(false);
    const selectedFile = event.dataTransfer.files?.[0];
    if (selectedFile) performAnalysis(selectedFile);
  };

  const resetAnalyzer = () => {
    setFile(null);
    setStage("idle");
    setProgress(0);
    setAnalysisResult(null);
    setBiomarkers([]);
    setSelectedMarker(null);
    setRiskScore(68);
    setDetectedPatientPrompt(null);
    setSelectedMedIndices([]);
    setMedicationsAdded(false);
    setAddingMedications(false);
  };

  /* Risk score animation */
  useEffect(() => {
    if (stage !== "complete" || biomarkers.length === 0) return;

    const attention = biomarkers.filter((m) => m.status === "attention").length;
    const borderline = biomarkers.filter((m) => m.status === "borderline").length;
    const total = biomarkers.length;

    // Calculate risk score: 100 - (attention*20 + borderline*10)
    const calculatedScore = Math.max(30, 100 - (attention * 20 + borderline * 10));
    
    let value = 68;
    const timer = setInterval(() => {
      value += calculatedScore > value ? 1 : -1;
      setRiskScore(value);
      if (value === calculatedScore) {
        clearInterval(timer);
      }
    }, 35);

    return () => clearInterval(timer);
  }, [stage, biomarkers]);

  /* Reviews auto-rotate */
  useEffect(() => {
    const timer = setInterval(() => {
      setReviewIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const summary = useMemo(() => {
    const normal = biomarkers.filter((item) => item.status === "normal").length;
    const attention = biomarkers.filter((item) => item.status === "attention").length;
    const borderline = biomarkers.filter((item) => item.status === "borderline").length;
    return { normal, attention, borderline };
  }, [biomarkers]);

  return (
    <div className="report-page">

      {/* NAV */}
      <header className="report-nav">
        <div className="report-container nav-inner">

          <button onClick={() => navigate('/app')} className="report-logo">
            <span className="report-logo-mark">●</span>
            MedCare<span> AI</span>
          </button>

          <nav className="report-nav-links">
            <button onClick={() => scrollToSection("home")} className="hover:text-blue-600 font-medium transition-colors">Home</button>
            <button onClick={() => scrollToSection("risk")} className="hover:text-blue-600 font-medium transition-colors">Risk Score</button>
            <button onClick={() => scrollToSection("features")} className="hover:text-blue-600 font-medium transition-colors">Features</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-blue-600 font-medium transition-colors">FAQ</button>
          </nav>

          <div className="nav-right">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="language-select"
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Kannada</option>
            </select>

            <button
              className="nav-upload"
              onClick={() => fileInput.current?.click()}
            >
              ↑ Upload Report
            </button>
          </div>

          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />

        </div>
      </header>


      {/* HERO / UPLOAD */}
      <section id="home" className="upload-hero">

        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-orb hero-orb-three" />

        <div className="floating-star star-one">✦</div>
        <div className="floating-star star-two">✦</div>
        <div className="floating-star star-three">✦</div>

        <div className="report-container">

          <div className="hero-badge">
            <span>✦</span>
            AI-POWERED LAB REPORT ANALYZER
          </div>

          <h1>
            Know what{" "}
            <em>your blood test</em>
            <br />
            <strong>results</strong> actually mean
          </h1>

          <p className="hero-copy">
            Upload a blood test, CBC, thyroid, lipid panel, prescription or discharge summary.
            MedCare AI extracts vitals and explains results in plain language.
          </p>


          {/* UPLOAD BOX */}
          <div
            className={`upload-box ${uploadHover ? "drag-active" : ""} ${stage !== "idle" ? "processing" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setUploadHover(true);
            }}
            onDragLeave={() => setUploadHover(false)}
            onDrop={handleDrop}
          >

            {stage === "idle" && (
              <>
                <div className="upload-icon">↑</div>

                <h3>
                  Drop your lab report here,
                  <br />
                  or click to browse
                </h3>

                <p>
                  Supports PDF, JPG, or PNG files up to 15MB
                </p>

                <button
                  className="select-button"
                  onClick={() => fileInput.current?.click()}
                  disabled={!activePatientId}
                >
                  {activePatientId ? "Select File to Analyze" : "Select a patient first"}
                  <span>→</span>
                </button>

                {!activePatientId && (
                  <p className="text-xs text-red-500 mt-2">
                    Please select a patient from the dashboard before uploading
                  </p>
                )}

                <div className="upload-trust-row">
                  <span>♧ Secure processing</span>
                  <span>✦ Fast AI analysis</span>
                  <span>♢ Private by design</span>
                </div>
              </>
            )}


            {stage === "analyzing" && (
              <div className="analysis-loader">

                <div className="scan-document">
                  <div className="scan-paper">
                    <div className="paper-header">MEDICAL REPORT</div>
                    <div className="paper-line" />
                    <div className="paper-line short" />
                    <div className="paper-line" />
                    <div className="paper-line medium" />
                    <div className="scan-line" />
                  </div>
                </div>

                <h3>Analyzing your report...</h3>

                <p>
                  {progress < 30
                    ? "Reading document with OCR"
                    : progress < 60
                    ? "Extracting biomarkers & medications"
                    : progress < 85
                    ? "Comparing reference ranges"
                    : "Finalizing analysis"}
                </p>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <strong>{progress}%</strong>

              </div>
            )}


            {stage === "complete" && (
              <div className="analysis-complete">

                <div className="complete-check">✓</div>

                <h3>Your report is ready</h3>

                <p>{file?.name || "Medical report"}</p>

                {analysisResult && (
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <p>✓ {analysisResult.extracted_data.medications?.length || 0} medications extracted</p>
                    <p>✓ {biomarkers.length} health metrics analyzed</p>
                    {analysisResult.extracted_data.diagnosis && (
                      <p className="font-medium">Diagnosis: {analysisResult.extracted_data.diagnosis}</p>
                    )}
                  </div>
                )}

                {analysisResult && (analysisResult.extracted_data.medications?.length || 0) > 0 && (
                  <div className="mt-4 p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl text-left">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                        <Pill size={14} className="text-blue-600" />
                        <span>{analysisResult.extracted_data.medications.length} Medications Found</span>
                      </div>
                      {medicationsAdded ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 size={12} /> Added to Prescriptions
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                          Action Available
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3">
                      Would you like to add these medications to <strong>{currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'the patient'}'s</strong> active schedule?
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {!medicationsAdded ? (
                        <button
                          type="button"
                          onClick={() => handleAddMedicationsToPatient()}
                          disabled={addingMedications}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {addingMedications ? <RefreshCw size={12} className="animate-spin" /> : <Pill size={13} />}
                          Add Medications to Schedule
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate('/app/medications')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={13} />
                          View in Medications Page →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleOpenIn3DAtlas(undefined, 'macro')}
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-teal-700 via-teal-800 to-[#1c2a38] hover:from-teal-800 hover:to-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <FlaskConical size={15} className="text-teal-300 flex-shrink-0" />
                    <span>3D Organ Body Twin →</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenIn3DAtlas(undefined, 'cellular')}
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-700 via-blue-800 to-indigo-900 hover:from-cyan-800 hover:to-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse flex-shrink-0" />
                    <span>3D Blood Cells Twin (RBC/WBC) →</span>
                  </button>
                </div>

                <button
                  className="select-button"
                  onClick={() =>
                    document
                      .getElementById("results")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  View Smart Report
                  <span>↓</span>
                </button>

                <button
                  className="reset-button"
                  onClick={resetAnalyzer}
                >
                  Analyze another report
                </button>

              </div>
            )}

          </div>


          <div className="medical-note">
            ⓘ This tool provides educational information and is not
            a substitute for professional medical evaluation.
          </div>


          {/* HERO BENEFITS */}
          <div className="hero-benefits">

            <div>
              <span className="benefit-icon green">✓</span>
              <div>
                <strong>Clear explanations</strong>
                <small>Plain-language insights</small>
              </div>
            </div>

            <div>
              <span className="benefit-icon blue">♧</span>
              <div>
                <strong>Private processing</strong>
                <small>Healthcare-grade security</small>
              </div>
            </div>

            <div>
              <span className="benefit-icon orange">ϟ</span>
              <div>
                <strong>Fast analysis</strong>
                <small>Results in seconds</small>
              </div>
            </div>

            <div>
              <span className="benefit-icon purple">◎</span>
              <div>
                <strong>Visual insights</strong>
                <small>Ranges made easy</small>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* RESULT DASHBOARD */}
      {stage === "complete" && analysisResult && (
        <section id="results" className="results-section">

          <div className="report-container">

            {/* Dynamic Patient Verification Banner */}
            {detectedPatientPrompt && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                        Dynamic Patient Match
                      </span>
                      <span className="text-xs text-gray-500">Document: {detectedPatientPrompt.fileName}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      Name detected on report: <span className="text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">"{detectedPatientPrompt.detectedName}"</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Currently assigned to: <span className="font-semibold text-gray-800">{detectedPatientPrompt.assignedName}</span>. All extracted medications, vitals, and schedules will be synced with this profile.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={targetReassignId}
                    onChange={(e) => setTargetReassignId(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
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
                      className="px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-medium text-gray-900 outline-none w-56 shadow-xs"
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
                    Confirm & Move
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

            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="section-badge">
                ✨ SMART REPORT
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenIn3DAtlas(undefined, 'macro')}
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-700 via-teal-800 to-[#1c2a38] hover:from-teal-800 hover:to-black text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FlaskConical size={14} className="text-teal-300" />
                  <span>3D Organ Twin →</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenIn3DAtlas(undefined, 'cellular')}
                  className="px-3.5 py-2 bg-gradient-to-r from-cyan-700 via-blue-800 to-indigo-900 hover:from-cyan-800 hover:to-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                  <span>3D Blood Cells (RBC/WBC) →</span>
                </button>
              </div>
            </div>

            <h2>
              Your health report,
              <br />
              <span>made easier to understand.</span>
            </h2>

            <p className="section-description">
              See your values, reference ranges and plain-language explanations together.
            </p>

          {/* TOP SUMMARY & BIOMARKERS OR CLINICAL OVERVIEW */}
          {biomarkers.length > 0 ? (
            <>
              <div className="summary-grid">
                <div className="summary-card score-card">
                  <div className="summary-card-top">
                    <span>Overall Insight Score</span>
                    <span className="info">?</span>
                  </div>
                  <div className="score-content">
                    <div className="large-score">{riskScore}</div>
                    <div>
                      <strong>{riskScore >= 80 ? "Excellent" : riskScore >= 60 ? "Review recommended" : "Attention needed"}</strong>
                      <small>Based on {biomarkers.length} metrics</small>
                    </div>
                  </div>
                  <div className="score-bar">
                    <span style={{ width: `${riskScore}%` }} />
                  </div>
                </div>

                <div className="summary-card">
                  <span className="summary-label">Within Range</span>
                  <strong className="summary-number green-text">{summary.normal}</strong>
                  <small>biomarkers</small>
                </div>

                <div className="summary-card">
                  <span className="summary-label">Borderline</span>
                  <strong className="summary-number yellow-text">{summary.borderline}</strong>
                  <small>worth reviewing</small>
                </div>

                <div className="summary-card">
                  <span className="summary-label">Attention</span>
                  <strong className="summary-number red-text">{summary.attention}</strong>
                  <small>above/below range</small>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="biomarker-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Biomarker overview</h3>
                      <p>Select a value to explore it</p>
                    </div>
                    <span className="live-indicator">● LIVE</span>
                  </div>

                  <div className="biomarker-list">
                    {biomarkers.map((marker) => (
                      <button
                        key={marker.name}
                        className={`biomarker-row ${selectedMarker?.name === marker.name ? "selected" : ""}`}
                        onClick={() => setSelectedMarker(marker)}
                      >
                        <div className="marker-name">
                          <span className={`marker-dot ${marker.status}`} />
                          <div>
                            <strong>{marker.name}</strong>
                            <small>Reference: {marker.min}–{marker.max} {marker.unit}</small>
                          </div>
                        </div>
                        <div className="marker-value">
                          <strong>{marker.value}</strong>
                          <small>{marker.unit}</small>
                        </div>
                        <span className={`status-pill ${marker.status}`}>
                          {marker.status === "normal" ? "Normal" : marker.status === "borderline" ? "Borderline" : "Attention"}
                        </span>
                        <span className="row-arrow">→</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedMarker && (
                  <div className="detail-panel">
                    <div className="detail-panel-top">
                      <div>
                        <span className="panel-tag">SELECTED BIOMARKER</span>
                        <h3>{selectedMarker.name}</h3>
                      </div>
                      <div className="large-value">
                        <strong>{selectedMarker.value}</strong>
                        <small>{selectedMarker.unit}</small>
                      </div>
                    </div>

                    <div className="range-area">
                      <div className="range-labels">
                        <span>Low</span>
                        <span>Reference range</span>
                        <span>High</span>
                      </div>
                      <div className="range-track">
                        <div className="range-low" />
                        <div className="range-normal" />
                        <div className="range-high" />
                        <div
                          className={`range-marker ${selectedMarker.status}`}
                          style={{
                            left: `${Math.min(
                              Math.max(
                                ((selectedMarker.value - selectedMarker.min) / (selectedMarker.max - selectedMarker.min)) * 70 + 15,
                                5
                              ),
                              95
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="range-values">
                        <span>{selectedMarker.min}</span>
                        <span>{selectedMarker.max}</span>
                      </div>
                    </div>

                    <div className="ai-explanation">
                      <div className="ai-title"><span>✦</span>AI explanation</div>
                      <p>{selectedMarker.explanation}</p>
                    </div>

                    <div className="next-step">
                      <div className="next-icon">→</div>
                      <div>
                        <strong>Suggested next step</strong>
                        <p>{selectedMarker.action}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenIn3DAtlas(selectedMarker.name)}
                      className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-700 via-teal-800 to-[#1c2a38] hover:from-teal-800 hover:to-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
                    >
                      <FlaskConical size={14} className="text-teal-300" />
                      <span>Explore {selectedMarker.name} in 3D Anatomy / Cellular Twin →</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-6 my-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                  🩺
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Clinical Assessment & Report Overview</h3>
                  <p className="text-xs text-gray-500">Document analyzed and indexed for patient record</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResult.extracted_data.diagnosis && (
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Diagnosis / Findings</span>
                    <p className="text-sm font-semibold text-purple-950 mt-1">{analysisResult.extracted_data.diagnosis}</p>
                  </div>
                )}
                {(analysisResult.extracted_data.doctor_name || analysisResult.extracted_data.hospital_name) && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Medical Provider</span>
                    <p className="text-sm font-semibold text-blue-950 mt-1">
                      {analysisResult.extracted_data.doctor_name || 'Attending Physician'}
                      {analysisResult.extracted_data.hospital_name ? ` — ${analysisResult.extracted_data.hospital_name}` : ''}
                    </p>
                  </div>
                )}
              </div>

              {analysisResult.extracted_text && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Extracted Document Text</span>
                  <p className="text-xs text-gray-700 mt-2 whitespace-pre-line leading-relaxed font-sans max-h-60 overflow-y-auto">
                    {analysisResult.extracted_text}
                  </p>
                </div>
              )}
            </div>
          )}


            {/* MEDICATIONS EXTRACTED & INTERACTIVE INGESTION */}
            {analysisResult && analysisResult.extracted_data.medications && analysisResult.extracted_data.medications.length > 0 && (
              <div className="medications-section bg-gradient-to-br from-white to-blue-50/40 p-6 rounded-2xl border border-blue-200 shadow-sm mt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                      <Pill size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Prescribed Medications Detected ({analysisResult.extracted_data.medications.length})
                      </h3>
                      <p className="text-xs text-gray-500">
                        Review extracted prescriptions and add them to <strong>{currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'patient'}</strong>'s active schedule.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {medicationsAdded ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          Saved to Active Medications
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate('/app/medications')}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          View in Medications
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddMedicationsToPatient()}
                        disabled={addingMedications || selectedMedIndices.length === 0}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                      >
                        {addingMedications ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Pill size={14} />
                        )}
                        Add Selected ({selectedMedIndices.length}) to Medications
                      </button>
                    )}
                  </div>
                </div>

                {/* Medication Cards List with Checkboxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysisResult.extracted_data.medications.map((med, idx) => {
                    const isSelected = selectedMedIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (selectedMedIndices.includes(idx)) {
                            setSelectedMedIndices(selectedMedIndices.filter(i => i !== idx));
                          } else {
                            setSelectedMedIndices([...selectedMedIndices, idx]);
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-300 shadow-xs'
                            : 'bg-white border-gray-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="font-bold text-gray-900 text-sm">{med.name}</div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by container click
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
                            />
                          </div>

                          <div className="space-y-1 text-xs text-gray-600">
                            {med.dosage && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Dosage:</span>
                                <span className="font-semibold text-gray-800">{med.dosage}</span>
                              </div>
                            )}
                            {med.frequency && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Frequency:</span>
                                <span className="font-semibold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                                  {med.frequency}
                                </span>
                              </div>
                            )}
                            {med.instructions && (
                              <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-600 italic">
                                📝 {med.instructions}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-blue-100/60 flex items-center justify-between text-[11px] text-gray-500">
                          <span>Route: {med.route || 'oral'}</span>
                          {medicationsAdded && (
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                              <CheckCircle2 size={11} /> Scheduled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMedIndices(analysisResult.extracted_data.medications.map((_, i) => i))}
                      className="text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMedIndices([])}
                      className="text-gray-500 hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                  <p>
                    ✓ Added medications automatically sync morning & evening reminders into the Medications hub.
                  </p>
                </div>
              </div>
            )}


            {/* FULL REPORT BUTTON */}
            <div className="report-action-row">

              <button
                className="primary-action"
                onClick={() =>
                  setShowFullReport(!showFullReport)
                }
              >
                {showFullReport
                  ? "Hide Detailed Report"
                  : "Explore Full Report"}
                <span>
                  {showFullReport ? "↑" : "↓"}
                </span>
              </button>

              <button
                className="secondary-action"
                onClick={resetAnalyzer}
              >
                ↻ Analyze Another Report
              </button>

            </div>


            {showFullReport && (
              <div className="full-report-panel">

                <div className="full-report-head">
                  <div>
                    <span>
                      SMART REPORT
                    </span>

                    <h3>
                      Detailed biomarker analysis
                    </h3>
                  </div>

                  <span className="report-generated">
                    Generated just now
                  </span>
                </div>

                <div className="full-report-grid">

                  {biomarkers.map((item) => (

                    <div
                      className="full-report-item"
                      key={item.name}
                    >

                      <div className="full-report-name">
                        <strong>
                          {item.name}
                        </strong>

                        <span
                          className={`status-pill ${item.status}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="full-report-value">
                        {item.value}
                        <small>
                          {item.unit}
                        </small>
                      </div>

                      <p>
                        {item.explanation}
                      </p>

                    </div>

                  ))}

                </div>

                {/* Clinical Summary */}
                {analysisResult && analysisResult.extracted_data.summary && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-bold text-gray-900 mb-2">Clinical Summary</h4>
                    <p className="text-sm text-gray-700">{analysisResult.extracted_data.summary}</p>
                    {analysisResult.extracted_data.doctor_name && (
                      <p className="text-xs text-gray-500 mt-2">
                        Doctor: {analysisResult.extracted_data.doctor_name}
                        {analysisResult.extracted_data.hospital_name && ` | ${analysisResult.extracted_data.hospital_name}`}
                      </p>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        </section>
      )}


      {/* =========================================================================
          RISK SCORE EXPLAINER & INTERACTIVE SIMULATOR (#risk)
      ========================================================================= */}
      <section id="risk" className="py-16 bg-gradient-to-b from-white via-blue-50/50 to-white border-t border-b border-blue-100/70">
        <div className="report-container">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3 shadow-sm">
              <span>⚡</span> 3-RULE CLINICAL RISK DETECTION ENGINE
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              How MedCare AI Calculates <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Health Risk Scores</span>
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-2">
              Our clinical scoring model continuously correlates laboratory biomarkers, absolute safety thresholds, baseline deviations, and 30-day velocity trends into a clear 0–100 Health Score.
            </p>
          </div>

          {/* Interactive Risk Simulator Card */}
          <div className="bg-white rounded-3xl border-2 border-blue-200 shadow-xl p-6 sm:p-10 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Column: Interactive Sliders */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>🎛</span> Interactive Vital Simulator
                  </h3>
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    Test live calculations
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Adjust the sliders below to see how clinical vital spikes dynamically impact the patient's overall Health Score and trigger family alerts.
                </p>

                {/* Slider 1: Blood Glucose */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200">
                  <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
                    <span className="text-gray-700">Random Blood Glucose (RBS)</span>
                    <span className={`font-mono font-bold text-sm ${simGlucose > 180 ? 'text-amber-600' : simGlucose > 250 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {simGlucose} mg/dL {simGlucose > 250 ? '(Critical)' : simGlucose > 140 ? '(Elevated)' : '(Normal)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="450"
                    value={simGlucose}
                    onChange={(e) => setSimGlucose(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                    <span>70 (Low)</span>
                    <span>100 (Optimal)</span>
                    <span>180 (Threshold)</span>
                    <span>350+ (Severe)</span>
                  </div>
                </div>

                {/* Slider 2: Systolic Blood Pressure */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200">
                  <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
                    <span className="text-gray-700">Systolic Blood Pressure (BP)</span>
                    <span className={`font-mono font-bold text-sm ${simSystolic > 160 ? 'text-red-600' : simSystolic > 130 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {simSystolic} mmHg {simSystolic > 160 ? '(Stage 2 HTN)' : simSystolic > 130 ? '(Pre-HTN)' : '(Normal)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="200"
                    value={simSystolic}
                    onChange={(e) => setSimSystolic(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                    <span>90 (Hypo)</span>
                    <span>120 (Standard)</span>
                    <span>140 (Elevated)</span>
                    <span>180 (Hypertensive Crisis)</span>
                  </div>
                </div>

                {/* Slider 3: SpO2 */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200">
                  <div className="flex justify-between items-center mb-1.5 text-xs font-semibold">
                    <span className="text-gray-700">Oxygen Saturation (SpO₂)</span>
                    <span className={`font-mono font-bold text-sm ${simSpO2 < 90 ? 'text-red-600' : simSpO2 < 95 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {simSpO2}% {simSpO2 < 90 ? '(Hypoxemia Alert)' : simSpO2 < 95 ? '(Borderline)' : '(Healthy)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="100"
                    value={simSpO2}
                    onChange={(e) => setSimSpO2(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                    <span>85% (Critical)</span>
                    <span>90% (Low)</span>
                    <span>95% (Acceptable)</span>
                    <span>100% (Optimal)</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Computed Health Gauge */}
              <div className="lg:col-span-5 bg-gradient-to-b from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-6 text-center flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Simulated Health Score</span>
                
                {/* Score Dial */}
                <div className="relative w-36 h-36 my-3 flex items-center justify-center">
                  <div className={`w-36 h-36 rounded-full border-8 flex items-center justify-center transition-all duration-300 ${
                    simulatedHealthScore >= 80 ? 'border-emerald-500 bg-emerald-50/40 text-emerald-700' :
                    simulatedHealthScore >= 60 ? 'border-amber-500 bg-amber-50/40 text-amber-700' :
                    'border-rose-500 bg-rose-50/40 text-rose-700'
                  }`}>
                    <div>
                      <div className="text-4xl font-extrabold tracking-tight font-mono">{simulatedHealthScore}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">OUT OF 100</div>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="my-2">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold ${
                    simulatedHealthScore >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    simulatedHealthScore >= 60 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                  }`}>
                    {simulatedHealthScore >= 80 ? '✓ Patient Condition Stable' :
                     simulatedHealthScore >= 60 ? '⚠️ Moderate Risk — Clinical Review Advised' :
                     '🚨 High Risk Alert — Family Dispatch Triggered'}
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {simulatedHealthScore >= 80
                    ? 'All vital biomarkers align with established physiological reference ranges.'
                    : simulatedHealthScore >= 60
                    ? '1 or more parameters deviate from target baseline. Routine monitoring scheduled.'
                    : 'Critical vital outlier detected. Automated Email and WhatsApp alerts dispatched.'}
                </p>
              </div>

            </div>
          </div>

          {/* 3-Rule Logic Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-lg mb-4">
                1
              </div>
              <h4 className="font-bold text-gray-900 text-base mb-1.5">Static Threshold Rules</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Evaluates vitals against absolute clinical redlines (e.g., Blood Glucose &gt; 180 mg/dL, Systolic BP &gt; 160 mmHg, SpO₂ &lt; 92%).
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg mb-4">
                2
              </div>
              <h4 className="font-bold text-gray-900 text-base mb-1.5">Personalized Baseline Shift</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Compares the latest reading to the patient's individual 30-day moving average. Flags sudden deviations &gt; 20% even within "normal" ranges.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-lg mb-4">
                3
              </div>
              <h4 className="font-bold text-gray-900 text-base mb-1.5">Velocity & Trend Slopes</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Detects 3 consecutive point increases or drops over 72 hours, warning caregivers of worsening health before emergency symptoms manifest.
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          FEATURES SHOWCASE SECTION (#features)
      ========================================================================= */}
      <section id="features" className="py-16 bg-white">
        <div className="report-container">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-3 shadow-sm">
              <span>✦</span> FULL PLATFORM CAPABILITIES
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Engineered for Complete <span className="text-blue-600">Diagnostic Clarity</span>
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-2">
              Transform complicated hospital discharge documents and lab sheets into clear family insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 hover:border-blue-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-blue-500/20 mb-4">
                📷
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">Multimodal OCR & Vision AI</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                State-of-the-art vision models extract patient data, doctors, and lab tables from PDF documents, high-res scans, or quick smartphone camera photos.
              </p>
              <div className="mt-4 flex gap-1.5 flex-wrap">
                <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-200">PDF & Scans</span>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md border border-blue-200">Phone Camera Photos</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 hover:border-indigo-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-indigo-500/20 mb-4">
                📊
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">Visual Range Indicators</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                No more wondering what reference ranges mean. All 15+ biomarkers are mapped onto visual range bars with green, yellow, and red indicator markers.
              </p>
              <div className="mt-4 flex gap-1.5 flex-wrap">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-200">Color-Coded Status</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-200">Reference Ranges</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 hover:border-emerald-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-emerald-500/20 mb-4">
                💊
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">Prescription & Reminder Sync</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Extracted medications, dosages, and food instructions automatically generate daily morning and evening reminder schedules for the patient.
              </p>
              <div className="mt-4 flex gap-1.5 flex-wrap">
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">Auto Prescriptions</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">Daily Schedules</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 hover:border-purple-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-purple-500/20 mb-4">
                🌐
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">Multilingual Spoken AI</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Translate and converse about lab results in English, Kannada (ಕನ್ನಡ), and Hindi (हिन्दी) with natural Indian voice speech synthesis.
              </p>
              <div className="mt-4 flex gap-1.5 flex-wrap">
                <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-md border border-purple-200">English • ಕನ್ನಡ • हिन्दी</span>
                <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-md border border-purple-200">Voice Synthesis</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 hover:border-rose-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-rose-500/20 mb-4">
                ✉️
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">Email & WhatsApp Family Alerts</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                When dangerous lab readings or critical vital spikes occur, instant alerts with clinical summaries are dispatched to authorized family members.
              </p>
              <div className="mt-4 flex gap-1.5 flex-wrap">
                <span className="text-[10px] bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-md border border-rose-200">Email Alerts</span>
                <span className="text-[10px] bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-md border border-rose-200">WhatsApp Alert</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 hover:border-teal-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-teal-500/20 mb-4">
                🔒
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">Private & Secure Storage</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                All patient records are strictly isolated, encrypted in transit and at rest, maintaining hospital-grade security and role-based access control.
              </p>
              <div className="mt-4 flex gap-1.5 flex-wrap">
                <span className="text-[10px] bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-md border border-teal-200">Encrypted Vault</span>
                <span className="text-[10px] bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-md border border-teal-200">Role Permissions</span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* FAQ */}
      <section id="faq" className="faq-section">

        <div className="report-container">

          <div className="section-badge">
            ❓ HELP & FAQ
          </div>

          <h2>
            Frequently Asked Questions
          </h2>


          <div className="faq-list">

            {faqs.map((faq, index) => (

              <div
                className={`faq-item ${
                  activeFAQ === index ? "open" : ""
                }`}
                key={faq.q}
              >

                <button
                  onClick={() =>
                    setActiveFAQ(
                      activeFAQ === index ? null : index
                    )
                  }
                >

                  <span>
                    {faq.q}
                  </span>

                  <strong>
                    {activeFAQ === index
                      ? "−"
                      : "+"}
                  </strong>

                </button>


                <div className="faq-answer">
                  <p>
                    {faq.a}
                  </p>
                </div>

              </div>

            ))}

          </div>

        </div>
      </section>


      {/* FINAL CTA */}
      <section className="final-cta">

        <div className="marquee">

          <div className="marquee-content">

            HEALTH INSIGHTS
            <span>✦</span>

            PATIENT FRIENDLY
            <span>✦</span>

            PRIVATE PROCESSING
            <span>✦</span>

            INSTANT ANALYSIS
            <span>✦</span>

            SMART REPORTS
            <span>✦</span>

            HEALTH INSIGHTS
            <span>✦</span>

          </div>

        </div>


        <div className="report-container final-inner">

          <h2>
            Ready to understand
            your lab reports?
          </h2>

          <button
            className="final-upload"
            onClick={() =>
              fileInput.current?.click()
            }
            disabled={!activePatientId}
          >
            ↑ Upload Report Now
            <span>→</span>
          </button>


          <div className="footer-links">

            <a onClick={() => navigate('/app')}>Dashboard</a>
            <a onClick={() => navigate('/app/chat')}>AI Chat</a>
            <a onClick={() => navigate('/app/documents')}>Documents</a>
            <a onClick={() => navigate('/app/health')}>Health Data</a>

          </div>


          <div className="footer-brand-watermark">
            MEDCARE AI
          </div>

          <div className="crafted">
            POWERED BY MEDCARE AI
          </div>

        </div>

      </section>


      {/* BACK TO TOP */}
      <button
        className="back-top"
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }
      >
        ↑
      </button>

    </div>
  );
}

