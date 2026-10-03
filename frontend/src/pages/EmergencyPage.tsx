import { useState, useEffect } from 'react';
import { usePatients } from '../hooks/usePatients';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import {
  Phone,
  ShieldAlert,
  Plus,
  AlertTriangle,
  UserCheck,
  Stethoscope,
  Trash2,
  Building,
  Mail,
  MapPin,
  LoaderCircle,
  Droplets,
  Search,
  ExternalLink,
  Clock,
  Navigation,
  HeartHandshake,
  CheckCircle2,
  Bot,
  PhoneCall,
  Info,
  History,
  FileText,
  Sparkles,
  Volume2,
  Copy,
  Check,
  MessageSquare,
  RefreshCw,
  Users,
  Radio
} from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

import { BloodBankMapView, type BloodBankFacility } from '../components/maps/BloodBankMapView';

// Haversine distance calculator in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export interface BloodInquiryLog {
  inquiry_id: string;
  type?: 'blood_bank' | 'emergency_sos';
  timestamp: string;
  blood_bank_id?: string;
  blood_bank_name?: string;
  phone_number: string;
  patient_name: string;
  blood_group?: string;
  units_needed?: string;
  hospital_name?: string;
  emergency_type?: string;
  location?: string;
  symptoms?: string;
  contact_name?: string;
  status: 'Call Dispatched' | 'Stock Available' | 'Units Reserved' | 'Out of Stock' | 'Emergency Acknowledged' | 'Ambulance Dispatched' | 'Call Failed' | 'Call Unanswered';
  call_id?: string;
  ai_notes?: string;
}

const MYSURU_BLOOD_BANKS: BloodBankFacility[] = [
  {
    id: 'BB000',
    name: 'NIE Blood Bank & Research Centre',
    address: 'NIE Campus, Manandavadi Rd, Vidyaranyapura, Mysuru 570008',
    phone: '+91 8310341645',
    is24x7: 'Yes',
    type: 'Academic / Institutional',
    latitude: 12.2828,
    longitude: 76.6413
  },
  {
    id: 'BB001',
    name: 'Krishna Rajendra Blood Bank Hospital',
    address: 'Dhanvantri Rd, Devaraja Mohalla, Mysuru 570001',
    phone: '0821-2526230',
    is24x7: 'Yes',
    type: 'Government',
    latitude: 12.3116,
    longitude: 76.6492
  },
  {
    id: 'BB002',
    name: 'J. S. S. Hospital Blood Bank',
    address: 'JSS Hospital, Ramanuja Rd, Mysuru 570004',
    phone: '0821-2335555',
    is24x7: 'Yes',
    type: 'Private/Institutional',
    latitude: 12.2986,
    longitude: 76.6575
  },
  {
    id: 'BB003',
    name: 'B. G. S. Apollo Hospital Blood Bank',
    address: 'Adichunchanagiri Rd, Kuvempunagar, Mysuru 570023',
    phone: '0821-2566666',
    is24x7: 'Yes',
    type: 'Private',
    latitude: 12.2917,
    longitude: 76.6268
  },
  {
    id: 'BB004',
    name: 'Holdsworth Memorial Mission Hospital Blood Bank',
    address: 'Medar Block, Mandi Mohalla, Mysuru 570001',
    phone: '0821-2521650',
    is24x7: 'Yes',
    type: 'Mission/Private',
    latitude: 12.3188,
    longitude: 76.6517
  },
  {
    id: 'BB005',
    name: 'Kamakshi Hospital Blood Bank',
    address: 'Bogadi 2nd Stage, Kuvempu Nagar, Mysuru 570009',
    phone: '0821-2545981',
    is24x7: 'Yes',
    type: 'Private',
    latitude: 12.2942,
    longitude: 76.6190
  },
  {
    id: 'BB006',
    name: 'Cauvery Hospital Blood Bank',
    address: 'Siddhartha Layout, Mysuru 570011',
    phone: '0821-2472424',
    is24x7: 'Yes',
    type: 'Private',
    latitude: 12.3060,
    longitude: 76.6850
  },
  {
    id: 'BB007',
    name: 'Rotary Mysore Chandrakala Hospital Blood Bank',
    address: 'Kalidasa Road, Jayalakshmipuram, Mysuru 570017',
    phone: '+91 97311 34312',
    is24x7: 'Yes',
    type: 'Charitable',
    latitude: 12.3245,
    longitude: 76.6340
  },
  {
    id: 'BB008',
    name: 'Lions Blood Centre Jeevadhara',
    address: 'Mysuru, Karnataka',
    phone: '0821-2444936',
    is24x7: 'Yes',
    type: 'Charitable',
    latitude: 12.3160,
    longitude: 76.6540
  },
  {
    id: 'BB009',
    name: 'CurePlus Blood Centre',
    address: 'Dakshina Murthy Towers, Devanooru, Udayagiri, Mysuru 570019',
    phone: '+91 89519 50914',
    is24x7: 'Yes',
    type: 'Blood Centre',
    latitude: 12.3250,
    longitude: 76.6780
  },
  {
    id: 'BB010',
    name: 'Sri Jayadeva Institute Blood Bank',
    address: 'KRS Road, Mysuru',
    phone: '0821-2336136',
    is24x7: 'Yes',
    type: 'Government',
    latitude: 12.3485,
    longitude: 76.6185
  },
  {
    id: 'BB011',
    name: 'Railway Hospital Blood Bank',
    address: 'Yadavagiri, Mysuru',
    phone: '0821-2517238',
    is24x7: 'Yes',
    type: 'Government/Railway',
    latitude: 12.3210,
    longitude: 76.6450
  },
  {
    id: 'BB012',
    name: 'ESI Hospital Blood Bank',
    address: 'KRS Road, Mysuru',
    phone: '0821-2512298',
    is24x7: 'Yes',
    type: 'Government',
    latitude: 12.3410,
    longitude: 76.6210
  }
];

export default function EmergencyPage() {
  const { currentPatient, patients } = usePatients();
  const [contacts, setContacts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // Blood Bank Directory State
  const [bloodSearch, setBloodSearch] = useState('');
  const [bloodFilter, setBloodFilter] = useState<string>('all');
  const [isBloodModalOpen, setIsBloodModalOpen] = useState(false);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('O+');
  const [bloodUnitsNeeded, setBloodUnitsNeeded] = useState(2);
  const [bloodHospitalName, setBloodHospitalName] = useState('Apollo BGS / KR Hospital Mysuru');
  const [bloodUrgency, setBloodUrgency] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('CRITICAL');
  const [dispatchingBloodSOS, setDispatchingBloodSOS] = useState(false);

  // Stored Blood Bank Inquiries & AI Conversation Results
  const [inquiryLogs, setInquiryLogs] = useState<BloodInquiryLog[]>(() => {
    try {
      const saved = localStorage.getItem('medcare_blood_inquiries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => item.inquiry_id !== 'inq-901' && item.inquiry_id !== 'inq-902');
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Emergency All-Family Broadcast Call State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastResults, setBroadcastResults] = useState<any | null>(null);

  const saveInquiryLogs = (logs: BloodInquiryLog[]) => {
    setInquiryLogs(logs);
    try {
      localStorage.setItem('medcare_blood_inquiries', JSON.stringify(logs));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateInquiryStatus = (id: string, newStatus: BloodInquiryLog['status']) => {
    const updated = inquiryLogs.map(item => item.inquiry_id === id ? { ...item, status: newStatus } : item);
    saveInquiryLogs(updated);
    toast.success(`Inquiry status updated to "${newStatus}"`);
  };

  const handleClearInquiryLogs = () => {
    saveInquiryLogs([]);
    toast.success('Inquiry logs cleared');
  };

  // AI Call Insights & Full Conversation Transcript Modal State
  const [selectedInsightsLog, setSelectedInsightsLog] = useState<BloodInquiryLog | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);
  const [activeInsightsData, setActiveInsightsData] = useState<any | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [insightsLanguage, setInsightsLanguage] = useState<'en' | 'kn' | 'hi'>('en');

  const handleOpenInsightsModal = async (log: BloodInquiryLog, lang: 'en' | 'kn' | 'hi' = 'en') => {
    setSelectedInsightsLog(log);
    setInsightsLanguage(lang);
    setIsLoadingInsights(true);
    setActiveInsightsData(null);
    const isEmergency = log.type === 'emergency_sos' || !log.blood_bank_name;
    try {
      const endpoint = isEmergency
        ? `/api/telephony/emergency-call-insights/${log.call_id || log.inquiry_id}`
        : `/api/telephony/blood-bank-call-insights/${log.call_id || log.inquiry_id}`;
      const params = isEmergency
        ? {
            patient_name: log.patient_name,
            emergency_type: log.emergency_type || 'Acute Medical Distress',
            location: log.location || locationStatus || 'Mysuru, Karnataka',
            symptoms: log.symptoms || 'Critical Vital Fluctuation / Emergency Alert',
            contact_name: log.contact_name || 'Family Emergency Contact',
            phone_number: log.phone_number,
            language_preference: lang
          }
        : {
            patient_name: log.patient_name,
            blood_bank_name: log.blood_bank_name,
            blood_group: log.blood_group,
            units_needed: log.units_needed,
            hospital_name: log.hospital_name,
            language_preference: lang
          };

      const res = await apiClient.get(endpoint, { params });
      if (res.data.status === 'success' && res.data.insights) {
        const insights = res.data.insights;
        setActiveInsightsData(insights);
        
        // Dynamically update inquiry status based on verified call outcome
        if (isEmergency) {
          if (insights.triage_status?.toLowerCase().includes('acknowledged') || insights.triage_status?.toLowerCase().includes('responding')) {
            handleUpdateInquiryStatus(log.inquiry_id, 'Emergency Acknowledged');
          } else if (insights.triage_status?.toLowerCase().includes('dispatched') || insights.triage_status?.toLowerCase().includes('ambulance')) {
            handleUpdateInquiryStatus(log.inquiry_id, 'Ambulance Dispatched');
          } else if (insights.is_unanswered || insights.status === 'Call Unanswered' || insights.triage_status?.toLowerCase().includes('unanswered')) {
            handleUpdateInquiryStatus(log.inquiry_id, 'Call Unanswered');
          }
        } else {
          if (insights.stock_status?.toLowerCase().includes('reserved') || (insights.reference_number && insights.duty_officer)) {
            handleUpdateInquiryStatus(log.inquiry_id, 'Units Reserved');
          } else if (insights.stock_status?.toLowerCase().includes('out of stock') || insights.stock_status?.toLowerCase().includes('unavailable')) {
            handleUpdateInquiryStatus(log.inquiry_id, 'Out of Stock');
          } else if (insights.is_unanswered || insights.status === 'Call Unanswered' || insights.stock_status?.toLowerCase().includes('unanswered') || insights.stock_status?.toLowerCase().includes('no response')) {
            handleUpdateInquiryStatus(log.inquiry_id, 'Call Unanswered');
          }
        }
      }
    } catch (e: any) {
      console.warn('Fallback loading conversation insights:', e);
      const isEnglish = lang === 'en';
      const isHindi = lang === 'hi';

      if (isEmergency) {
        setActiveInsightsData({
          call_id: log.call_id || log.inquiry_id,
          status: log.status || 'Call Dispatched',
          patient_name: log.patient_name,
          emergency_type: log.emergency_type || 'Acute Medical Distress',
          location: log.location || locationStatus || 'Mysuru, Karnataka',
          symptoms: log.symptoms || 'Severe distress',
          responder_name: log.contact_name || 'Family Contact',
          contact_name: log.contact_name || 'Family Contact',
          phone_number: log.phone_number,
          detected_language: isEnglish ? 'English (en-IN)' : isHindi ? 'Hindi (हिन्दी)' : 'Kannada (ಕನ್ನಡ)',
          call_duration_seconds: 45,
          triage_status: 'Emergency Voice Call Dispatched',
          call_summary: `MedCare AI Emergency Voice Dispatch dialed ${log.contact_name || log.phone_number} regarding patient ${log.patient_name}'s acute medical condition. Case dossier transmitted.`,
          has_live_transcript: false,
          action_items: [
            `Keep patient ${log.patient_name} resting comfortably and monitor pulse & breathing.`,
            `Ensure building entryway is unlocked for incoming caregivers/responders at ${log.location || 'Mysuru'}.`,
            `Keep recent clinical health dossiers and medication history ready.`
          ],
          dialogue_turns: []
        });
      } else {
        setActiveInsightsData({
          call_id: log.call_id || log.inquiry_id,
          status: log.status || 'Call Dispatched',
          blood_bank_name: log.blood_bank_name,
          patient_name: log.patient_name,
          blood_group: log.blood_group,
          units_needed: log.units_needed,
          hospital_name: log.hospital_name,
          detected_language: isEnglish ? 'English (en-IN)' : isHindi ? 'Hindi (हिन्दी)' : 'Kannada (ಕನ್ನಡ)',
          call_duration_seconds: 45,
          stock_status: 'Outbound Voice Call Dispatched',
          stock_availability_summary: `MedCare AI Emergency Blood Dispatch contacted ${log.blood_bank_name} to reserve ${log.units_needed} of ${log.blood_group} blood for patient ${log.patient_name} at ${log.hospital_name}.`,
          reservation_token: null,
          has_live_transcript: false,
          action_items: [
            `Send patient ${log.patient_name}'s EDTA blood sample tube to ${log.blood_bank_name} counter for cross-matching.`,
            `Carry Form 45 Requisition signed by ${log.hospital_name} attending physician.`,
            `Verify real-time stock allocation directly with ${log.blood_bank_name} staff.`
          ],
          dialogue_turns: []
        });
      }
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Real-time live synchronization for active calls and open insights modal
  useEffect(() => {
    const activeDispatches = inquiryLogs.filter(l => l.status === 'Call Dispatched');
    if (activeDispatches.length === 0 && !selectedInsightsLog) return;

    const interval = setInterval(async () => {
      // 1. If modal is open, auto-refresh insights in real time
      if (selectedInsightsLog) {
        const isEmergency = selectedInsightsLog.type === 'emergency_sos' || !selectedInsightsLog.blood_bank_name;
        try {
          const endpoint = isEmergency
            ? `/api/telephony/emergency-call-insights/${selectedInsightsLog.call_id || selectedInsightsLog.inquiry_id}`
            : `/api/telephony/blood-bank-call-insights/${selectedInsightsLog.call_id || selectedInsightsLog.inquiry_id}`;
          const params = isEmergency
            ? {
                patient_name: selectedInsightsLog.patient_name,
                emergency_type: selectedInsightsLog.emergency_type || 'Acute Medical Distress',
                location: selectedInsightsLog.location || locationStatus || 'Mysuru, Karnataka',
                symptoms: selectedInsightsLog.symptoms || 'Severe distress',
                contact_name: selectedInsightsLog.contact_name || 'Family Contact',
                phone_number: selectedInsightsLog.phone_number,
                language_preference: insightsLanguage
              }
            : {
                patient_name: selectedInsightsLog.patient_name,
                blood_bank_name: selectedInsightsLog.blood_bank_name,
                blood_group: selectedInsightsLog.blood_group,
                units_needed: selectedInsightsLog.units_needed,
                hospital_name: selectedInsightsLog.hospital_name,
                language_preference: insightsLanguage
              };

          const res = await apiClient.get(endpoint, { params });
          if (res.data.status === 'success' && res.data.insights) {
            const insights = res.data.insights;
            setActiveInsightsData(insights);
            if (isEmergency) {
              if (insights.triage_status?.toLowerCase().includes('acknowledged') || insights.triage_status?.toLowerCase().includes('responding')) {
                handleUpdateInquiryStatus(selectedInsightsLog.inquiry_id, 'Emergency Acknowledged');
              } else if (insights.triage_status?.toLowerCase().includes('dispatched') || insights.triage_status?.toLowerCase().includes('ambulance')) {
                handleUpdateInquiryStatus(selectedInsightsLog.inquiry_id, 'Ambulance Dispatched');
              } else if (insights.is_unanswered || insights.status === 'Call Unanswered' || insights.triage_status?.toLowerCase().includes('unanswered')) {
                handleUpdateInquiryStatus(selectedInsightsLog.inquiry_id, 'Call Unanswered');
              }
            } else {
              if (insights.stock_status?.toLowerCase().includes('reserved') || (insights.reference_number && insights.duty_officer)) {
                handleUpdateInquiryStatus(selectedInsightsLog.inquiry_id, 'Units Reserved');
              } else if (insights.stock_status?.toLowerCase().includes('out of stock') || insights.stock_status?.toLowerCase().includes('unavailable')) {
                handleUpdateInquiryStatus(selectedInsightsLog.inquiry_id, 'Out of Stock');
              } else if (insights.is_unanswered || insights.status === 'Call Unanswered' || insights.stock_status?.toLowerCase().includes('unanswered')) {
                handleUpdateInquiryStatus(selectedInsightsLog.inquiry_id, 'Call Unanswered');
              }
            }
          }
        } catch {
          // ignore background polling errors
        }
      }

      // 2. Auto-sync any active inquiries displayed on the board
      for (const inq of activeDispatches) {
        const isEmergency = inq.type === 'emergency_sos' || !inq.blood_bank_name;
        try {
          const endpoint = isEmergency
            ? `/api/telephony/emergency-call-insights/${inq.call_id || inq.inquiry_id}`
            : `/api/telephony/blood-bank-call-insights/${inq.call_id || inq.inquiry_id}`;
          const params = isEmergency
            ? {
                patient_name: inq.patient_name,
                emergency_type: inq.emergency_type || 'Acute Medical Distress',
                location: inq.location || locationStatus || 'Mysuru, Karnataka',
                symptoms: inq.symptoms || 'Severe distress',
                contact_name: inq.contact_name || 'Family Contact',
                phone_number: inq.phone_number
              }
            : {
                patient_name: inq.patient_name,
                blood_bank_name: inq.blood_bank_name,
                blood_group: inq.blood_group,
                units_needed: inq.units_needed,
                hospital_name: inq.hospital_name
              };

          const res = await apiClient.get(endpoint, { params });
          if (res.data.status === 'success' && res.data.insights) {
            const insights = res.data.insights;
            if (insights.has_live_transcript || insights.duty_officer || insights.responder_name || insights.reference_number || insights.is_unanswered) {
              if (isEmergency) {
                if (insights.triage_status?.toLowerCase().includes('acknowledged') || insights.triage_status?.toLowerCase().includes('responding')) {
                  handleUpdateInquiryStatus(inq.inquiry_id, 'Emergency Acknowledged');
                } else if (insights.triage_status?.toLowerCase().includes('dispatched') || insights.triage_status?.toLowerCase().includes('ambulance')) {
                  handleUpdateInquiryStatus(inq.inquiry_id, 'Ambulance Dispatched');
                } else if (insights.is_unanswered || insights.status === 'Call Unanswered') {
                  handleUpdateInquiryStatus(inq.inquiry_id, 'Call Unanswered');
                }
              } else {
                if (insights.stock_status?.toLowerCase().includes('reserved') || (insights.reference_number && insights.duty_officer)) {
                  handleUpdateInquiryStatus(inq.inquiry_id, 'Units Reserved');
                } else if (insights.stock_status?.toLowerCase().includes('out of stock') || insights.stock_status?.toLowerCase().includes('unavailable')) {
                  handleUpdateInquiryStatus(inq.inquiry_id, 'Out of Stock');
                } else if (insights.is_unanswered || insights.status === 'Call Unanswered') {
                  handleUpdateInquiryStatus(inq.inquiry_id, 'Call Unanswered');
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [inquiryLogs, selectedInsightsLog, insightsLanguage]);

  // Dedicated Blood Bank Facility Call & Requirements Modal State
  const [callFacilityModal, setCallFacilityModal] = useState<BloodBankFacility | null>(null);
  const [callPatientId, setCallPatientId] = useState<string>('');
  const [callCustomName, setCallCustomName] = useState<string>('');
  const [callRequirementMode, setCallRequirementMode] = useState<'specific' | 'general'>('specific');
  const [callBloodGroup, setCallBloodGroup] = useState<string>('O+');
  const [callUnits, setCallUnits] = useState<number>(2);
  const [callHospitalLocation, setCallHospitalLocation] = useState<string>('Apollo BGS / KR Hospital Mysuru');
  const [isCallingFacility, setIsCallingFacility] = useState<boolean>(false);

  // Real-time Map & Location State
  const [userLocation, setUserLocation] = useState<[number, number]>([12.3050, 76.6400]); // Default Mysuru Center
  const [locationStatus, setLocationStatus] = useState<string>('Mysuru Center (Default)');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [bloodViewMode, setBloodViewMode] = useState<'both' | 'map' | 'list'>('both');
  const [selectedFacility, setSelectedFacility] = useState<BloodBankFacility | null>(null);

  const [callingAiFacilityId, setCallingAiFacilityId] = useState<string | null>(null);
  const [isCallingEmergencyAi, setIsCallingEmergencyAi] = useState<boolean>(false);

  const handleOpenBloodCallModal = (bb: BloodBankFacility) => {
    setCallFacilityModal(bb);
    const patObj = currentPatient || (patients.length > 0 ? patients[0] : null);
    const activePatId = patObj?.id || '';
    const activePatName = patObj
      ? `${patObj.first_name} ${patObj.last_name}`
      : 'Dhana Lakshmi';
    const activeBlood = patObj?.blood_type || 'B+';

    setCallPatientId(activePatId);
    setCallCustomName(activePatName);
    setCallRequirementMode('specific');
    setCallBloodGroup(activeBlood);
    setCallUnits(2);
    setCallHospitalLocation('Apollo BGS / KR Hospital Mysuru');
  };

  const handleConfirmBloodBankCall = async () => {
    if (!callFacilityModal) return;
    setIsCallingFacility(true);
    const toastId = toast.loading(`Connecting AI Voice Dispatch to ${callFacilityModal.name}...`);

    let finalPatientName = callCustomName;
    if (callPatientId && callPatientId !== 'CUSTOM') {
      const p = patients.find(x => x.id === callPatientId);
      if (p) finalPatientName = `${p.first_name} ${p.last_name}`;
    }
    if (!finalPatientName || finalPatientName.trim() === 'Patient') {
      if (currentPatient) finalPatientName = `${currentPatient.first_name} ${currentPatient.last_name}`;
      else if (patients.length > 0) finalPatientName = `${patients[0].first_name} ${patients[0].last_name}`;
      else finalPatientName = 'Kothanda Raman S';
    }

    const isGeneral = callRequirementMode === 'general';

    try {
      const res = await apiClient.post('/api/telephony/blood-bank-call', {
        blood_bank_id: callFacilityModal.id,
        blood_bank_name: callFacilityModal.name,
        phone_number: callFacilityModal.phone,
        blood_group: isGeneral ? 'GENERAL' : callBloodGroup,
        units_needed: isGeneral ? 0 : callUnits,
        patient_name: finalPatientName,
        hospital_name: callHospitalLocation || 'Apollo BGS / KR Hospital Mysuru',
        is_general_inquiry: isGeneral
      });

      if (res.data.status === 'success') {
        const record: BloodInquiryLog = res.data.inquiry_record || {
          inquiry_id: `inq-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toISOString(),
          blood_bank_id: callFacilityModal.id,
          blood_bank_name: callFacilityModal.name,
          phone_number: callFacilityModal.phone,
          patient_name: finalPatientName || 'Emergency Patient',
          blood_group: isGeneral ? 'All Groups (General)' : callBloodGroup,
          units_needed: isGeneral ? 'General Stock Check' : `${callUnits} Units`,
          hospital_name: callHospitalLocation || 'Mysuru Emergency Center',
          status: 'Call Dispatched',
          call_id: res.data.result?.call_id,
          ai_notes: `AI caller placed outbound call. Prompted in English for language selection. Inquiring ${isGeneral ? 'general stock' : `${callUnits} Units of ${callBloodGroup}`} for ${finalPatientName}.`
        };

        saveInquiryLogs([record, ...inquiryLogs]);

        toast.success(
          `Automated AI Voice Call placed to ${callFacilityModal.name} (${callFacilityModal.phone})! Inquiring ${
            isGeneral ? 'general blood stock availability' : `${callUnits} units of ${callBloodGroup} for ${finalPatientName}`
          }.`,
          { id: toastId, duration: 6000 }
        );
        setCallFacilityModal(null);
      } else {
        toast.error(`Voice Dispatch: ${res.data.message || 'Call failed'}`, { id: toastId, duration: 5000 });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to connect automated voice call', { id: toastId });
    } finally {
      setIsCallingFacility(false);
    }
  };

  const handleTriggerSarvamAiCall = async (bb: BloodBankFacility) => {
    handleOpenBloodCallModal(bb);
  };

  const handleBroadcastCallAllFamily = async () => {
    if (!currentPatient?.id) {
      toast.error('Please select an active patient profile first');
      return;
    }
    setIsCallingEmergencyAi(true);
    const toastId = toast.loading('Dialing all registered family members & emergency contacts simultaneously...');
    try {
      const contactPhones = contacts.map(c => c.phone).filter(Boolean);
      const res = await apiClient.post('/api/telephony/emergency-call', {
        patient_id: currentPatient.id,
        phone_numbers: contactPhones.length > 0 ? contactPhones : undefined,
        patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
        emergency_type: 'Acute Medical Distress',
        location: locationStatus || 'Mysuru, Karnataka',
        symptoms: 'Critical Vital Fluctuation / Emergency Alert',
        include_doctor: false
      });
      if (res.data.status === 'success' || res.data.success) {
        setBroadcastResults(res.data);
        setIsBroadcastModalOpen(true);
        const count = res.data.total_contacts_dialed || res.data.recipients?.length || 1;
        
        const bcastRecord: BloodInquiryLog = {
          inquiry_id: `sos-bcast-${Date.now().toString().slice(-4)}`,
          type: 'emergency_sos',
          timestamp: new Date().toISOString(),
          phone_number: `${count} Family Numbers`,
          patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
          emergency_type: 'Acute Medical Distress',
          location: locationStatus || 'Mysuru, Karnataka',
          symptoms: 'Critical Vital Fluctuation / Emergency Alert',
          contact_name: 'All Registered Family Contacts',
          status: 'Call Dispatched',
          call_id: res.data.recipients?.[0]?.call_id || res.data.result?.call_id,
          ai_notes: `Emergency multi-number voice broadcast dispatched to ${count} family numbers simultaneously with patient vitals & live GPS.`
        };
        saveInquiryLogs([bcastRecord, ...inquiryLogs]);

        toast.success(`🚨 Emergency Voice Calls Dispatched to ${count} family numbers simultaneously!`, { id: toastId, duration: 6000 });
      } else {
        toast.error(`Emergency Voice Dispatch: ${res.data.message || 'Call dispatch failed'}`, { id: toastId, duration: 5000 });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to dispatch emergency voice calls to family members', { id: toastId });
    } finally {
      setIsCallingEmergencyAi(false);
    }
  };

  const handleTriggerEmergencyAiCall = async (phone: string = '+91 8310341645', recipientName?: string) => {
    setIsCallingEmergencyAi(true);
    const toastId = toast.loading(`Initiating AI Voice Call to ${recipientName || phone}...`);
    const pName = currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Patient';
    try {
      const res = await apiClient.post('/api/telephony/emergency-call', {
        phone_number: phone,
        patient_name: pName,
        emergency_type: 'Acute Medical Distress',
        location: locationStatus || 'Mysuru, Karnataka',
        symptoms: 'Critical Vital Fluctuation / Emergency Alert'
      });
      if (res.data.status === 'success' || res.data.success) {
        const record: BloodInquiryLog = res.data.inquiry_record || {
          inquiry_id: `sos-${Date.now().toString().slice(-4)}`,
          type: 'emergency_sos',
          timestamp: new Date().toISOString(),
          phone_number: phone,
          patient_name: pName,
          emergency_type: 'Acute Medical Distress',
          location: locationStatus || 'Mysuru, Karnataka',
          symptoms: 'Critical Vital Fluctuation / Emergency Alert',
          contact_name: recipientName || 'Emergency Contact',
          status: 'Call Dispatched',
          call_id: res.data.result?.call_id,
          ai_notes: `AI voice emergency call placed to ${recipientName || phone}. Transmitting case dossier & live GPS.`
        };
        saveInquiryLogs([record, ...inquiryLogs]);

        toast.success(`Automated Emergency Dispatch call dialed (${phone})! Transmitting case details.`, { id: toastId, duration: 6000 });
      } else {
        toast.error(`Emergency Voice Dispatch: ${res.data.message || 'Emergency call failed'}`, { id: toastId, duration: 5000 });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to dispatch emergency voice call', { id: toastId });
    } finally {
      setIsCallingEmergencyAi(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    relationship_label: '',
    phone: '',
    email: '',
    priority: 1,
  });

  const [docFormData, setDocFormData] = useState({
    name: '',
    specialty: '',
    hospital: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    is_primary: true,
  });

  const detectUserLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setLocationStatus(`Live GPS: ${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`);
          setIsLocating(false);
          toast.success('Live GPS location synchronized');
        },
        (err) => {
          console.warn('Geolocation denied / error:', err);
          setUserLocation([12.3050, 76.6400]);
          setLocationStatus('Mysuru Center (Default GPS)');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocationStatus('Mysuru Center (Default GPS)');
    }
  };

  const fetchContacts = async () => {
    if (!currentPatient?.id) return;
    try {
      const res = await apiClient.get(`/api/emergency-contacts/${currentPatient.id}`);
      setContacts(res.data);
    } catch (err) {
      console.error('Failed to fetch emergency contacts', err);
    }
  };

  const fetchDoctors = async () => {
    if (!currentPatient?.id) return;
    try {
      const res = await apiClient.get(`/api/doctors/${currentPatient.id}`);
      setDoctors(res.data);
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchDoctors();
    detectUserLocation();
  }, [currentPatient?.id]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient?.id) return;
    try {
      await apiClient.post('/api/emergency-contacts', {
        ...formData,
        patient_id: currentPatient.id,
      });
      setIsModalOpen(false);
      setFormData({ name: '', relationship_label: '', phone: '', email: '', priority: 1 });
      fetchContacts();
    } catch (err) {
      console.error('Failed to add contact', err);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Remove this emergency contact?')) return;
    try {
      await apiClient.delete(`/api/emergency-contacts/${contactId}`);
      fetchContacts();
    } catch (err) {
      console.error('Failed to delete contact', err);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient?.id) return;
    try {
      await apiClient.post('/api/doctors', {
        ...docFormData,
        patient_id: currentPatient.id,
      });
      setIsDocModalOpen(false);
      setDocFormData({
        name: '',
        specialty: '',
        hospital: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        is_primary: false,
      });
      fetchDoctors();
    } catch (err) {
      console.error('Failed to add doctor', err);
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm('Remove this doctor?')) return;
    try {
      await apiClient.delete(`/api/doctors/${doctorId}`);
      fetchDoctors();
    } catch (err) {
      console.error('Failed to delete doctor', err);
    }
  };

  const handleSendAutomatedEmailToContact = async (c: any) => {
    if (!currentPatient?.id || !c.email) return;
    setSendingEmailId(c.id);
    try {
      const res = await apiClient.post('/api/safety/dispatch-email', {
        patient_id: currentPatient.id,
        presenting_symptom: 'Emergency Safety Alert & Family Notification',
        recipient_email: c.email,
        custom_message: `Emergency safety notification dispatched directly to authorized contact ${c.name} (${c.relationship_label || c.relationship || 'Emergency Contact'}).`
      });
      if (res.data?.success) {
        toast.success(`📧 Automated emergency alert emailed directly to ${c.name} (${c.email})`);
      } else {
        toast.error(res.data?.error || 'Failed to dispatch email');
      }
    } catch (err: any) {
      console.error('Email contact error:', err);
      toast.error(err?.response?.data?.detail || 'Failed to send automated email');
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleSendAutomatedEmailToDoctor = async (d: any) => {
    if (!currentPatient?.id || !d.email) return;
    setSendingEmailId(d.id);
    try {
      const res = await apiClient.post('/api/safety/dispatch-email', {
        patient_id: currentPatient.id,
        presenting_symptom: 'Clinical Emergency Consultation Request',
        recipient_email: d.email,
        custom_message: `Clinical case dossier transmitted for consultation with Dr. ${d.name} (${d.specialty || 'Physician'}) at ${d.hospital || 'Hospital'}.`
      });
      if (res.data?.success) {
        toast.success(`📧 Automated case dossier emailed directly to Dr. ${d.name} (${d.email})`);
      } else {
        toast.error(res.data?.error || 'Failed to dispatch email');
      }
    } catch (err: any) {
      console.error('Email doctor error:', err);
      toast.error(err?.response?.data?.detail || 'Failed to send automated email');
    } finally {
      setSendingEmailId(null);
    }
  };

  const triggerSafetyTest = async () => {
    if (!confirm('Send a test safety notification to all emergency contacts?')) return;
    try {
      if (currentPatient?.id) {
        const res = await apiClient.post('/api/monitoring/test-alert', {
          patient_id: currentPatient.id,
          severity: 'HIGH',
          metric_type: 'blood_pressure',
          custom_message: 'Emergency Safety Test Alert dispatched to authorized emergency contacts and caregivers.'
        });
        if (res.data?.results && Array.isArray(res.data.results)) {
          const waLinks = res.data.results.filter((r: any) => r.whatsapp_link).map((r: any) => r.whatsapp_link);
          if (waLinks.length > 0) {
            window.open(waLinks[0], '_blank');
          }
        }
      } else {
        await apiClient.post('/api/safety/assess', {
          message: 'Patient test safety check alert triggered by family caregiver.'
        });
      }
      setAlertSent(true);
      setTimeout(() => setAlertSent(false), 5000);
    } catch (err) {
      console.error('Safety alert test error', err);
    }
  };

  const handleDispatchBloodSOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient?.id) return;
    setDispatchingBloodSOS(true);
    try {
      await apiClient.post('/api/monitoring/test-alert', {
        patient_id: currentPatient.id,
        severity: bloodUrgency,
        metric_type: 'emergency_blood_request',
        custom_message: `🚨 URGENT BLOOD SOS: ${bloodUnitsNeeded} Unit(s) of ${selectedBloodGroup} required immediately for ${currentPatient.first_name} ${currentPatient.last_name} at ${bloodHospitalName}. Emergency facility contact broadcasted.`
      });
      toast.success(`🩸 Emergency Blood SOS Broadcast sent for ${bloodUnitsNeeded} Units of ${selectedBloodGroup}!`);
      setIsBloodModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to dispatch blood SOS');
    } finally {
      setDispatchingBloodSOS(false);
    }
  };

  const filteredBloodBanks = MYSURU_BLOOD_BANKS.filter((bb) => {
    const q = bloodSearch.toLowerCase();
    const matchesQuery =
      bb.name.toLowerCase().includes(q) ||
      bb.address.toLowerCase().includes(q) ||
      bb.type.toLowerCase().includes(q) ||
      bb.phone.includes(q);

    if (!matchesQuery) return false;
    if (bloodFilter === 'all') return true;
    if (bloodFilter === '24x7') return bb.is24x7.toLowerCase().includes('yes');
    if (bloodFilter === 'Government') return bb.type.toLowerCase().includes('government');
    if (bloodFilter === 'Private') return bb.type.toLowerCase().includes('private');
    if (bloodFilter === 'Charitable') return bb.type.toLowerCase().includes('charitable') || bb.type.toLowerCase().includes('centre');
    return true;
  }).map((bb) => {
    const distance = calculateDistance(userLocation[0], userLocation[1], bb.latitude, bb.longitude);
    return { ...bb, distance };
  }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Indian National Emergency Services Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-red-800/80 rounded-full flex-shrink-0">
            <ShieldAlert size={32} />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-red-900 text-xs font-bold rounded uppercase tracking-wider">India Emergency Protocol</span>
              <h2 className="text-xl font-bold">EMERGENCY MEDICAL HELPLINES</h2>
            </div>
            <p className="text-red-100 text-sm mt-1">
              In a life-threatening crisis, sudden cardiac symptoms, breathing failure, or trauma, directly connect to Indian emergency response services immediately.
            </p>
          </div>
        </div>

        {/* Quick Indian Emergency Hotlines Grid (112, 108, 1066, 14567) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <a
            href="tel:112"
            className="flex flex-col items-center justify-center p-3 bg-white text-red-700 hover:bg-red-50 rounded-xl font-bold text-center shadow transition-transform transform active:scale-95"
          >
            <Phone size={18} className="mb-1 text-red-600" />
            <span className="text-base font-extrabold">112</span>
            <span className="text-[11px] text-gray-600 font-medium">National Emergency</span>
          </a>

          <a
            href="tel:108"
            className="flex flex-col items-center justify-center p-3 bg-white text-red-700 hover:bg-red-50 rounded-xl font-bold text-center shadow transition-transform transform active:scale-95"
          >
            <Phone size={18} className="mb-1 text-red-600" />
            <span className="text-base font-extrabold">108</span>
            <span className="text-[11px] text-gray-600 font-medium">Ambulance / Trauma</span>
          </a>

          <a
            href="tel:1066"
            className="flex flex-col items-center justify-center p-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-bold text-center shadow transition-transform transform active:scale-95"
          >
            <Phone size={18} className="mb-1 text-blue-600" />
            <span className="text-base font-extrabold">1066</span>
            <span className="text-[11px] text-gray-600 font-medium">Apollo Emergency</span>
          </a>

          <a
            href="tel:14567"
            className="flex flex-col items-center justify-center p-3 bg-white text-gray-800 hover:bg-gray-50 rounded-xl font-bold text-center shadow transition-transform transform active:scale-95"
          >
            <Phone size={18} className="mb-1 text-gray-700" />
            <span className="text-base font-extrabold">14567</span>
            <span className="text-[11px] text-gray-600 font-medium">Elder Helpline</span>
          </a>
        </div>

        {/* Multi-Number Voice SOS Broadcast to All Family Members */}
        <div className="pt-3 border-t border-red-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-red-800/60 p-3.5 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-900/90 rounded-lg text-red-200 shrink-0">
              <Radio size={20} className="animate-pulse text-rose-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-white text-sm">Automated Voice SOS to ALL Registered Family Members</h4>
                <Badge variant="danger" size="sm" className="bg-red-950 text-rose-200 border-red-800">
                  Multiple Numbers
                </Badge>
              </div>
              <p className="text-xs text-red-200 mt-0.5">
                Simultaneously rings every family contact and caregiver phone number via Sarvam AI Voice Dispatch with patient vitals and live GPS.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBroadcastCallAllFamily}
            disabled={isCallingEmergencyAi}
            className="w-full sm:w-auto bg-white hover:bg-red-50 text-red-700 font-extrabold shadow-md active:scale-95 transition-all text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shrink-0 border border-red-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isCallingEmergencyAi ? (
              <LoaderCircle size={15} className="animate-spin text-red-600" />
            ) : (
              <PhoneCall size={15} className="text-red-600" />
            )}
            <span className="text-red-700 font-extrabold">🚨 Broadcast Voice Call to All Family ({contacts.length || 'All'})</span>
          </button>
        </div>
      </div>

      {/* SECTION: Mysuru Blood Bank Directory & Real-Time Emergency Map */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <Droplets size={16} className="fill-red-600" />
              </span>
              <h2 className="text-xl font-bold text-gray-900">Mysuru Blood Bank Directory & Live Map</h2>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                12 Centers
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-2">
              <span>Verified 24×7 blood banks with live distance estimation from your current position.</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={detectUserLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
              title="Recalculate distance using live GPS"
            >
              <Navigation size={13} className={isLocating ? 'animate-spin text-blue-600' : 'text-blue-600'} />
              <span>{isLocating ? 'Locating...' : 'Sync GPS'}</span>
            </button>

            <button
              onClick={() => {
                if (currentPatient?.blood_type) setSelectedBloodGroup(currentPatient.blood_type);
                setIsBloodModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <Droplets size={15} />
              Broadcast Blood SOS
            </button>
          </div>
        </div>

        {/* Live Location Banner & View Mode Toggles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-red-50/70 via-white to-gray-50 p-3 rounded-2xl border border-red-100">
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-gray-900">Your Location:</span>
            <span className="text-gray-600 font-mono text-[11px]">{locationStatus}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            {(
              [
                { mode: 'both', label: 'Map + List' },
                { mode: 'map', label: 'Map Only' },
                { mode: 'list', label: 'List Only' },
              ] as const
            ).map((vm) => (
              <button
                key={vm.mode}
                onClick={() => setBloodViewMode(vm.mode)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  bloodViewMode === vm.mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {vm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Real-Time Map */}
        {(bloodViewMode === 'both' || bloodViewMode === 'map') && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <BloodBankMapView
              bloodBanks={filteredBloodBanks}
              userLocation={userLocation}
              selectedId={selectedFacility?.id}
              onSelect={(fac: BloodBankFacility) => setSelectedFacility(fac)}
              onCall={(fac: BloodBankFacility) => handleOpenBloodCallModal(fac)}
            />
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by center name, locality (e.g. Kuvempunagar, Ramanuja Rd), phone..."
              value={bloodSearch}
              onChange={(e) => setBloodSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all', label: `All (${MYSURU_BLOOD_BANKS.length})` },
              { key: '24x7', label: '24×7 Active' },
              { key: 'Government', label: 'Government' },
              { key: 'Private', label: 'Private' },
              { key: 'Charitable', label: 'Charitable' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setBloodFilter(f.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  bloodFilter === f.key
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blood Bank Cards Grid */}
        {(bloodViewMode === 'both' || bloodViewMode === 'list') && (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBloodBanks.map((bb) => {
              const is24x7Active = bb.is24x7.toLowerCase().includes('yes');
              const isSelected = selectedFacility?.id === bb.id;

              return (
                <Card
                  key={bb.id}
                  className={`p-4 border flex flex-col justify-between transition-all bg-white cursor-pointer ${
                    isSelected
                      ? 'border-red-500 shadow-md ring-2 ring-red-200'
                      : 'border-gray-200 hover:shadow-md hover:border-red-200'
                  }`}
                  onClick={() => setSelectedFacility(bb)}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">
                        {bb.name}
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">
                        {bb.id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          is24x7Active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <Clock size={11} />
                        {bb.is24x7 === 'Yes*' ? '24×7 (Govt)' : '24×7 Available'}
                      </span>

                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                        {bb.type}
                      </span>

                      {bb.distance !== undefined && (
                        <span className="rounded-md bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 text-[10px] font-bold">
                          📍 {bb.distance} km away
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 flex items-start gap-1.5 leading-relaxed">
                      <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <span>{bb.address}</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerSarvamAiCall(bb);
                      }}
                      disabled={callingAiFacilityId === bb.id}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all shadow-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                      title={`AI Voice Agent will call ${bb.phone} and inquire real-time stock availability`}
                    >
                      {callingAiFacilityId === bb.id ? (
                        <LoaderCircle size={13} className="animate-spin" />
                      ) : (
                        <Bot size={13} />
                      )}
                      <span>
                        {callingAiFacilityId === bb.id
                          ? 'Dialing Blood Bank...'
                          : '🤖 AI Enquire & Voice Call'}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${bb.phone.replace(/[^0-9+]/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 py-1.5 text-xs font-bold transition-colors shadow-xs"
                      >
                        <Phone size={12} />
                        <span>Direct Call</span>
                      </a>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${bb.latitude},${bb.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 py-1.5 text-xs font-semibold transition-colors"
                      >
                        <Navigation size={12} className="text-blue-600" />
                        <span>Directions</span>
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {filteredBloodBanks.length === 0 && (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-500 text-xs">
            No blood banks matched your search query "{bloodSearch}". Try searching by hospital name or locality.
          </div>
        )}
      </div>

      {/* ── Recent AI Blood Inquiries & Live Availability Status Log ── */}
      <div className="rounded-3xl border border-red-200/80 bg-white/90 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <History size={17} />
              </span>
              <h3 className="text-base font-bold text-gray-900">
                Live Blood Bank Inquiries & AI Conversation Results
              </h3>
              <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {inquiryLogs.length} Logged
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Real-time audit log of automated voice dispatch calls, patient blood unit requirements, and recorded facility stock availability.
            </p>
          </div>

          {inquiryLogs.length > 0 && (
            <button
              type="button"
              onClick={handleClearInquiryLogs}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {inquiryLogs.length === 0 ? (
          <div className="text-center py-6 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-xs space-y-1">
            <p className="font-semibold text-gray-700">No AI Calls or Inquiries Placed Yet</p>
            <p className="text-[11px] text-gray-500">
              Trigger <strong>"🤖 AI Enquire & Voice Call"</strong> for blood banks or <strong>"🚨 AI Voice SOS"</strong> on any contact to initiate automated voice calls and view real-time summaries here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {inquiryLogs.map((log) => {
              const isEmergency = log.type === 'emergency_sos' || !log.blood_bank_name;
              const statusColor =
                log.status === 'Units Reserved' || log.status === 'Emergency Acknowledged'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : log.status === 'Stock Available' || log.status === 'Ambulance Dispatched'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : log.status === 'Out of Stock'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : log.status === 'Call Unanswered'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : log.status === 'Call Failed'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

              return (
                <div
                  key={log.inquiry_id}
                  className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-2xs space-y-3 hover:border-red-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isEmergency ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {isEmergency ? '🚨 Emergency SOS' : '🩸 Blood Bank'}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 leading-tight">
                          {log.blood_bank_name || log.contact_name || 'Emergency Contact'}
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                        <span>📞 {log.phone_number}</span>
                        <span>•</span>
                        <span>
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColor} shrink-0`}
                    >
                      {log.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">
                        {isEmergency ? 'Patient & Condition' : 'Patient & Requirement'}
                      </span>
                      <p className="font-bold text-gray-800 truncate mt-0.5">
                        👤 {log.patient_name}
                      </p>
                      {isEmergency ? (
                        <span className="inline-block mt-0.5 font-bold text-red-700 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded text-[11px] truncate max-w-full">
                          ⚠️ {log.symptoms || log.emergency_type || 'Acute Medical Distress'}
                        </span>
                      ) : (
                        <span className="inline-block mt-0.5 font-extrabold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded text-[11px]">
                          🩸 {log.blood_group} ({log.units_needed})
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">
                        {isEmergency ? 'Live Location' : 'Admitted Hospital'}
                      </span>
                      <p className="font-medium text-gray-700 leading-tight mt-0.5">
                        {isEmergency ? `📍 ${log.location || 'Mysuru, Karnataka'}` : `🏥 ${log.hospital_name}`}
                      </p>
                    </div>
                  </div>

                  {log.ai_notes && (
                    <div className="p-2.5 bg-gradient-to-r from-red-50/40 to-orange-50/30 rounded-xl border border-red-100 text-[11px] text-gray-700 space-y-0.5">
                      <span className="font-bold text-red-900 flex items-center gap-1 text-[10px]">
                        <Bot size={12} className="text-red-600" /> AI Conversation Summary & Status:
                      </span>
                      <p className="leading-relaxed text-gray-600">{log.ai_notes}</p>
                    </div>
                  )}

                  {/* Open Full Insights Modal Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenInsightsModal(log)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 border border-red-200/80 text-red-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
                  >
                    <Sparkles size={13} className="text-red-600" />
                    <span>{isEmergency ? '📊 View AI Emergency Triage & Call Summary' : '📊 View AI Conversation & Stock Insights'}</span>
                  </button>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Status:</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${statusColor}`}>
                        {log.status === 'Units Reserved' ? '🩸 Units Reserved' :
                         log.status === 'Emergency Acknowledged' ? '✅ Acknowledged' :
                         log.status === 'Ambulance Dispatched' ? '🚑 Ambulance Dispatched' :
                         log.status === 'Stock Available' ? '✅ Stock Available' :
                         log.status === 'Out of Stock' ? '❌ Out of Stock' :
                         log.status === 'Call Unanswered' ? '📞 Call Unanswered' :
                         log.status === 'Call Failed' ? '⚠️ Call Failed' : '⏳ Call Dispatched'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenInsightsModal(log)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Sync latest live call status"
                      >
                        <RefreshCw size={11} /> Sync
                      </button>
                      <a
                        href={`tel:${log.phone_number.replace(/[^0-9+]/g, '')}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Phone size={11} /> Re-dial
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {alertSent && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center">
          <UserCheck size={18} className="mr-2 text-green-600" />
          Test safety alert dispatched to authorized family emergency contacts.
        </div>
      )}

      {/* SECTION 1: Family Doctors & Specialists */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Stethoscope size={22} className="mr-2 text-blue-600" /> Family Doctors & Specialists
            </h2>
            <p className="text-gray-500 text-xs">Attending physicians, consultants, and family doctors</p>
          </div>
          <Button onClick={() => setIsDocModalOpen(true)} size="sm">
            <Plus size={15} className="mr-1" /> Add Doctor
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {doctors.map(d => (
            <Card key={d.id} className="p-5 border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-gray-900 text-base">{d.name}</h3>
                      {d.is_primary && (
                        <Badge variant="success" size="sm">
                          Primary Doctor
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">{d.specialty || 'General Physician'}</p>
                    {d.hospital && (
                      <p className="text-xs text-gray-600 flex items-center mt-1">
                        <Building size={12} className="mr-1 text-gray-400" /> {d.hospital}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteDoctor(d.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="Remove Doctor"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-gray-600">
                  {d.phone && (
                    <div className="flex items-center text-gray-800 font-medium">
                      <Phone size={13} className="mr-2 text-blue-600" /> {d.phone}
                    </div>
                  )}
                  {d.email && (
                    <div className="flex items-center text-gray-600">
                      <Mail size={13} className="mr-2 text-gray-400" /> {d.email}
                    </div>
                  )}
                  {d.address && (
                    <div className="flex items-start text-gray-500">
                      <MapPin size={13} className="mr-2 text-gray-400 flex-shrink-0 mt-0.5" /> {d.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                {d.phone && (
                  <a
                    href={`tel:${d.phone}`}
                    className="flex-1 text-center py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs flex items-center justify-center transition-colors"
                  >
                    <Phone size={14} className="mr-1.5" /> Call Doctor
                  </a>
                )}
                {d.email && (
                  <button
                    onClick={() => handleSendAutomatedEmailToDoctor(d)}
                    disabled={sendingEmailId === d.id}
                    className="flex-1 text-center py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 font-semibold rounded-lg text-xs flex items-center justify-center transition-colors"
                    title="Dispatch automated clinical case dossier to doctor"
                  >
                    {sendingEmailId === d.id ? (
                      <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <Mail size={14} className="mr-1.5" />
                    )}
                    {sendingEmailId === d.id ? 'Sending…' : 'Email Doctor'}
                  </button>
                )}
                {!d.phone && !d.email && (
                  <span className="text-xs text-gray-400 block text-center w-full py-2">No phone or email on file</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* SECTION 2: Emergency Contacts Directory */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-red-600" />
              Emergency Contacts Directory
            </h2>
            <p className="text-gray-500 text-xs">Prioritized emergency contacts and family numbers dialed during critical SOS alerts</p>
          </div>
          <div className="flex items-center space-x-2 flex-wrap">
            {contacts.length > 0 && (
              <Button
                onClick={handleBroadcastCallAllFamily}
                disabled={isCallingEmergencyAi}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5"
                title="Simultaneously dial all emergency contacts via AI Voice"
              >
                {isCallingEmergencyAi ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <PhoneCall size={14} />
                )}
                <span>Call All Family ({contacts.length})</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={triggerSafetyTest}>
              <AlertTriangle size={14} className="mr-1.5 text-orange-500" /> Test Alert
            </Button>
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              <Plus size={15} className="mr-1" /> Add Contact
            </Button>
          </div>
        </div>

        {/* Contacts List */}
        <div className="grid gap-4 md:grid-cols-2">
          {contacts.map(c => (
            <Card key={c.id} className="p-5 border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-gray-900 text-base">{c.name}</h3>
                      <Badge variant={c.priority === 1 ? 'danger' : 'info'} size="sm">
                        Priority {c.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{c.relationship_label || c.relationship}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteContact(c.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="Remove Contact"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center text-gray-800 font-medium">
                    <Phone size={14} className="mr-2 text-blue-600" /> {c.phone}
                  </div>
                  {c.email && (
                    <div className="flex items-center text-gray-600">
                      <Mail size={14} className="mr-2 text-indigo-500" /> {c.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                {c.phone && (
                  <button
                    type="button"
                    onClick={() => handleTriggerEmergencyAiCall(c.phone, c.name)}
                    disabled={isCallingEmergencyAi}
                    className="flex-1 text-center py-2 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-700 font-semibold rounded-lg text-xs flex items-center justify-center transition-colors border border-red-200"
                    title={`Trigger Automated AI Voice Emergency Call to ${c.name}`}
                  >
                    {isCallingEmergencyAi ? (
                      <LoaderCircle size={13} className="mr-1 animate-spin text-red-600" />
                    ) : (
                      <PhoneCall size={13} className="mr-1 text-red-600" />
                    )}
                    AI Voice SOS
                  </button>
                )}
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center transition-colors shadow-sm"
                  >
                    <Phone size={13} className="mr-1" /> Quick Call
                  </a>
                )}
                {c.email && (
                  <button
                    onClick={() => handleSendAutomatedEmailToContact(c)}
                    disabled={sendingEmailId === c.id}
                    className="flex-1 text-center py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 font-semibold rounded-lg text-xs flex items-center justify-center transition-colors"
                    title="Dispatch automated emergency alert email to contact"
                  >
                    {sendingEmailId === c.id ? (
                      <LoaderCircle size={13} className="mr-1 animate-spin" />
                    ) : (
                      <Mail size={13} className="mr-1" />
                    )}
                    {sendingEmailId === c.id ? 'Sending…' : 'Email Alert'}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Emergency Contact Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Emergency Contact">
        <form onSubmit={handleAddContact} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
            <Input required placeholder="e.g. Sunita Srivastava" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship *</label>
              <Input required placeholder="e.g. Mother, Father, Spouse" value={formData.relationship_label} onChange={e => setFormData({ ...formData, relationship_label: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority Order</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              >
                <option value={1}>Priority 1 (First Contacted)</option>
                <option value={2}>Priority 2 (Secondary)</option>
                <option value={3}>Priority 3 (Tertiary)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
              <Input required placeholder="e.g. +91 98765-43210" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <Input type="email" placeholder="family@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Contact</Button>
          </div>
        </form>
      </Modal>

      {/* Add Doctor Modal */}
      <Modal isOpen={isDocModalOpen} onClose={() => setIsDocModalOpen(false)} title="Add Family Doctor / Specialist">
        <form onSubmit={handleAddDoctor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Doctor's Full Name *</label>
            <Input required placeholder="e.g. Dr. Niraj Patil" value={docFormData.name} onChange={e => setDocFormData({ ...docFormData, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Specialty</label>
              <Input placeholder="e.g. Cardiologist, General Physician" value={docFormData.specialty} onChange={e => setDocFormData({ ...docFormData, specialty: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Hospital / Clinic</label>
              <Input placeholder="e.g. Apollo Hospitals Mysuru" value={docFormData.hospital} onChange={e => setDocFormData({ ...docFormData, hospital: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <Input placeholder="e.g. +91 1860-500-1066" value={docFormData.phone} onChange={e => setDocFormData({ ...docFormData, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <Input type="email" placeholder="doctor@hospital.com" value={docFormData.email} onChange={e => setDocFormData({ ...docFormData, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Clinic Address / Location</label>
            <Input placeholder="e.g. Kuvempu Nagara, Mysuru" value={docFormData.address} onChange={e => setDocFormData({ ...docFormData, address: e.target.value })} />
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="is_primary"
              checked={docFormData.is_primary}
              onChange={e => setDocFormData({ ...docFormData, is_primary: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_primary" className="text-xs text-gray-700 font-medium cursor-pointer">
              Set as Primary Family Physician
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsDocModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Doctor</Button>
          </div>
        </form>
      </Modal>

      {/* Emergency Blood SOS Modal */}
      <Modal
        isOpen={isBloodModalOpen}
        onClose={() => setIsBloodModalOpen(false)}
        title="🩸 Broadcast Urgent Blood SOS Request"
      >
        <form onSubmit={handleDispatchBloodSOS} className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <span>
              This will broadcast an urgent emergency blood requirement alert with patient clinical details to all registered emergency contacts, family caregivers, and attending physicians.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Required Blood Group *
              </label>
              <select
                value={selectedBloodGroup}
                onChange={(e) => setSelectedBloodGroup(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-sm font-bold bg-white focus:border-red-500 outline-none"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Units Required (Bags) *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={bloodUnitsNeeded}
                onChange={(e) => setBloodUnitsNeeded(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 p-2 text-sm focus:border-red-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Admitted Hospital / Delivery Location *
            </label>
            <input
              type="text"
              required
              value={bloodHospitalName}
              onChange={(e) => setBloodHospitalName(e.target.value)}
              placeholder="e.g. KR Hospital / JSS Hospital Mysuru"
              className="w-full rounded-xl border border-gray-300 p-2 text-sm focus:border-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Urgency Severity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'CRITICAL', label: '🚨 Immediate' },
                { key: 'HIGH', label: '⚠️ Today' },
                { key: 'MEDIUM', label: '📋 Routine' },
              ].map((u) => (
                <button
                  type="button"
                  key={u.key}
                  onClick={() => setBloodUrgency(u.key as any)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                    bloodUrgency === u.key
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsBloodModalOpen(false)}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={dispatchingBloodSOS}
              className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {dispatchingBloodSOS ? <LoaderCircle size={14} className="animate-spin" /> : <Droplets size={14} />}
              {dispatchingBloodSOS ? 'Broadcasting...' : 'Broadcast SOS Now'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Blood Bank Requirements & Automated AI Voice Call Modal ── */}
      <Modal
        isOpen={Boolean(callFacilityModal)}
        onClose={() => setCallFacilityModal(null)}
        title={callFacilityModal ? `🩸 ${callFacilityModal.name} - Blood Inquire & Call` : 'Blood Bank Call'}
      >
        {callFacilityModal && (
          <div className="space-y-4">
            {/* Facility Quick Overview */}
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-900 text-sm">{callFacilityModal.name}</span>
                <span className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                  {callFacilityModal.is24x7 === 'Yes*' ? '24×7 (Govt)' : '24×7 Active'}
                </span>
              </div>
              <p className="text-gray-600 leading-snug">{callFacilityModal.address}</p>
              <div className="flex items-center gap-3 pt-1 text-gray-700 font-semibold text-[11px]">
                <span>📞 Phone: {callFacilityModal.phone}</span>
                {((callFacilityModal as any).distance !== undefined || callFacilityModal.distance_km !== undefined) && (
                  <span>📍 {(callFacilityModal as any).distance ?? callFacilityModal.distance_km} km from you</span>
                )}
              </div>
            </div>

            {/* 1. Target Patient Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Patient Requiring Blood (Active Patient) *
              </label>
              <select
                value={callPatientId}
                onChange={(e) => {
                  setCallPatientId(e.target.value);
                  if (e.target.value !== 'CUSTOM') {
                    const p = patients.find(x => x.id === e.target.value);
                    if (p) {
                      setCallCustomName(`${p.first_name} ${p.last_name}`);
                      if (p.blood_type) setCallBloodGroup(p.blood_type);
                    }
                  }
                }}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-bold bg-white focus:border-red-500 outline-none"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    👤 {p.first_name} {p.last_name} {p.id === currentPatient?.id ? '(Current Active Patient)' : ''}
                  </option>
                ))}
                <option value="CUSTOM">✏️ Specify Custom Patient Name...</option>
              </select>

              {callPatientId === 'CUSTOM' && (
                <input
                  type="text"
                  value={callCustomName}
                  onChange={(e) => setCallCustomName(e.target.value)}
                  placeholder="Enter full patient name"
                  className="mt-2 w-full rounded-xl border border-gray-300 p-2 text-xs focus:border-red-500 outline-none"
                />
              )}
            </div>

            {/* 2. Requirement Type: Specific vs General Stock */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Requirement Specification *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCallRequirementMode('specific')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    callRequirementMode === 'specific'
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-2xs'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>🩸 Specific Blood Group</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCallRequirementMode('general')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    callRequirementMode === 'general'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>📋 General Stock Check</span>
                </button>
              </div>
            </div>

            {/* 3. If Specific: Blood Group & Units */}
            {callRequirementMode === 'specific' ? (
              <div className="space-y-3 p-3 bg-gray-50/80 rounded-xl border border-gray-200/80">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Select Blood Group Needed *
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                      <button
                        type="button"
                        key={bg}
                        onClick={() => setCallBloodGroup(bg)}
                        className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                          callBloodGroup === bg
                            ? 'bg-red-600 text-white shadow-xs scale-105'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-red-300'
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">Units Required (Bags) *</label>
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                      {callUnits} {callUnits === 1 ? 'Bag' : 'Bags'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((u) => (
                      <button
                        type="button"
                        key={u}
                        onClick={() => setCallUnits(u)}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                          callUnits === u
                            ? 'bg-gray-900 text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Info size={14} className="text-blue-600 shrink-0" />
                  Default General Availability Mode
                </p>
                <p className="text-blue-700 text-[11px] leading-relaxed">
                  The AI voice assistant will ask the blood bank staff for the real-time reserve count of all major blood groups (O, A, B, AB positive and negative) without requiring a single specific type.
                </p>
              </div>
            )}

            {/* 4. Hospital Location */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Admitted Hospital / Delivery Location *
              </label>
              <input
                type="text"
                value={callHospitalLocation}
                onChange={(e) => setCallHospitalLocation(e.target.value)}
                placeholder="e.g. Apollo BGS / KR Hospital Mysuru"
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-medium focus:border-red-500 outline-none"
              />
            </div>

            {/* Dynamic Multilingual Voice Notice */}
            <div className="p-3 bg-gradient-to-r from-red-50/70 to-orange-50/60 border border-red-200/80 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-950">
                <Volume2 size={14} className="text-red-600" />
                <span>Automated Dynamic Multilingual Voice Agent</span>
              </div>
              <p className="text-[11px] text-gray-700 leading-relaxed">
                The AI caller automatically initiates in English: <strong className="text-red-900">"Hello, I am calling from MedCare AI. Which language would you prefer: Kannada, English, or Hindi?"</strong> and seamlessly continues the entire conversation in the staff's chosen language.
              </p>
            </div>

            {/* Actions: AI Voice Call vs Direct Dial vs WhatsApp */}
            <div className="pt-3 border-t space-y-2">
              <button
                type="button"
                onClick={handleConfirmBloodBankCall}
                disabled={isCallingFacility}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                {isCallingFacility ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Bot size={15} />
                )}
                <span>
                  {isCallingFacility
                    ? 'Dialing Blood Bank via AI...'
                    : `🤖 Start AI Voice Call to ${callFacilityModal.name}`}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${callFacilityModal.phone.replace(/[^0-9+]/g, '')}`}
                  className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
                >
                  <Phone size={13} className="text-red-600" />
                  <span>Direct Phone Dial</span>
                </a>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `🚨 URGENT BLOOD REQUIREMENT 🚨\nPatient: ${callCustomName || 'Patient'}\nBlood Group: ${
                      callRequirementMode === 'specific' ? `${callBloodGroup} (${callUnits} Units)` : 'General Availability'
                    }\nHospital: ${callHospitalLocation}\nTarget Blood Bank: ${callFacilityModal.name} (${callFacilityModal.phone})`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center border border-emerald-200"
                >
                  <span>💬 WhatsApp SOS</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── AI Conversation & Stock Insights Modal ── */}
      <Modal
        isOpen={Boolean(selectedInsightsLog)}
        onClose={() => setSelectedInsightsLog(null)}
        title={
          selectedInsightsLog
            ? selectedInsightsLog.type === 'emergency_sos'
              ? `🚨 AI Emergency Voice SOS Insights: ${selectedInsightsLog.contact_name || selectedInsightsLog.patient_name}`
              : `📊 AI Conversation & Stock Insights: ${selectedInsightsLog.blood_bank_name || 'Blood Bank'}`
            : 'Call Insights'
        }
      >
        {selectedInsightsLog && (
          <div className="space-y-4">
            {isLoadingInsights ? (
              <div className="py-12 text-center space-y-3">
                <LoaderCircle size={28} className="animate-spin text-red-600 mx-auto" />
                <p className="text-xs font-bold text-gray-800">
                  Retrieving Real-Time Voice Interaction & Clinical Insights...
                </p>
                <p className="text-[11px] text-gray-500">
                  Connecting to telephony gateway, dialogue transcripts, and triage records.
                </p>
              </div>
            ) : activeInsightsData ? (
              <div className="space-y-4">
                {/* Check if Emergency SOS or Blood Bank */}
                {(selectedInsightsLog.type === 'emergency_sos' || activeInsightsData.emergency_type) ? (
                  /* 🚨 Emergency Voice SOS Summary Card */
                  <div className="p-4 bg-gradient-to-br from-red-50/90 via-rose-50/70 to-red-50/90 border border-red-200 rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-xs">
                          <Radio size={15} className="animate-pulse" />
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-red-950 uppercase tracking-wide">
                            Sarvam AI Emergency Voice SOS Summary
                          </h4>
                          <span className="text-[10px] font-bold text-red-700">
                            {activeInsightsData.triage_status || 'Emergency Alert Dispatched'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeInsightsData.responder_name && (
                          <span className="bg-red-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1">
                            <span>👤</span>
                            <span>{activeInsightsData.responder_name}</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => selectedInsightsLog && handleOpenInsightsModal(selectedInsightsLog, insightsLanguage)}
                          disabled={isLoadingInsights}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-red-800 hover:text-red-950 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-red-300 shadow-2xs"
                          title="Sync latest call transcript and variables from Sarvam"
                        >
                          <RefreshCw size={11} className={isLoadingInsights ? "animate-spin" : ""} />
                          <span>Sync Telephony</span>
                        </button>
                      </div>
                    </div>

                    {/* High-fidelity Narrative Emergency Summary */}
                    <div className="p-3 bg-white/95 rounded-xl border border-red-200/90 shadow-2xs">
                      <p className="text-xs text-gray-900 font-medium leading-relaxed">
                        "{activeInsightsData.call_summary || activeInsightsData.stock_availability_summary}"
                      </p>
                    </div>

                    {/* Summary Metric Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-red-100/70 p-2 rounded-xl border border-red-200/70 text-center">
                        <span className="text-[10px] font-bold text-red-800 uppercase block">Emergency</span>
                        <span className="text-xs font-black text-red-950 truncate block">{activeInsightsData.emergency_type || 'Acute Medical Distress'}</span>
                      </div>
                      <div className="bg-red-100/70 p-2 rounded-xl border border-red-200/70 text-center">
                        <span className="text-[10px] font-bold text-red-800 uppercase block">Location</span>
                        <span className="text-xs font-black text-red-950 truncate block">{activeInsightsData.location || 'Mysuru, KA'}</span>
                      </div>
                      <div className="bg-red-100/70 p-2 rounded-xl border border-red-200/70 text-center">
                        <span className="text-[10px] font-bold text-red-800 uppercase block">Contact / Dialed</span>
                        <span className="text-xs font-black text-red-950 truncate block">{activeInsightsData.contact_name || selectedInsightsLog.phone_number}</span>
                      </div>
                      <div className="bg-red-100/70 p-2 rounded-xl border border-red-200/70 text-center">
                        <span className="text-[10px] font-bold text-red-800 uppercase block">Helplines</span>
                        <span className="text-xs font-black text-red-950">112 / 108 SOS</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 🩸 Blood Bank Reservation Summary Card */
                  <div className="p-4 bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-emerald-50/90 border border-emerald-200 rounded-2xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                          <Bot size={15} />
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                            Sarvam AI Blood Bank Summary
                          </h4>
                          <span className="text-[10px] font-bold text-emerald-700">
                            {activeInsightsData.stock_status || 'Stock Confirmed & Reserved'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeInsightsData.duty_officer && (
                          <span className="bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1">
                            <span>👨‍⚕️</span>
                            <span>{activeInsightsData.duty_officer}</span>
                          </span>
                        )}
                        {(activeInsightsData.reference_number || activeInsightsData.reservation_token) && (
                          <span className="bg-emerald-600 text-white font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1">
                            <span>🎫</span>
                            <span>Ref #{activeInsightsData.reference_number || activeInsightsData.reservation_token}</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => selectedInsightsLog && handleOpenInsightsModal(selectedInsightsLog, insightsLanguage)}
                          disabled={isLoadingInsights}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-emerald-300 shadow-2xs"
                          title="Sync latest call transcript and variables from Sarvam"
                        >
                          <RefreshCw size={11} className={isLoadingInsights ? "animate-spin" : ""} />
                          <span>Sync Sarvam</span>
                        </button>
                      </div>
                    </div>

                    {/* High-fidelity Narrative Summary */}
                    <div className="p-3 bg-white/95 rounded-xl border border-emerald-200/90 shadow-2xs">
                      <p className="text-xs text-gray-900 font-medium leading-relaxed">
                        "{activeInsightsData.stock_availability_summary || activeInsightsData.call_summary}"
                      </p>
                    </div>

                    {/* Summary Metric Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="bg-emerald-100/70 p-2 rounded-xl border border-emerald-200/70 text-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Units Needed</span>
                        <span className="text-xs font-black text-emerald-950">{activeInsightsData.units_needed} of {activeInsightsData.blood_group}</span>
                      </div>
                      <div className="bg-emerald-100/70 p-2 rounded-xl border border-emerald-200/70 text-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Hospital</span>
                        <span className="text-xs font-black text-emerald-950 truncate block">{activeInsightsData.hospital_name}</span>
                      </div>
                      <div className="bg-emerald-100/70 p-2 rounded-xl border border-emerald-200/70 text-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Hold Window</span>
                        <span className="text-xs font-black text-emerald-950">2 Hours Reserve</span>
                      </div>
                      <div className="bg-emerald-100/70 p-2 rounded-xl border border-emerald-200/70 text-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                          {activeInsightsData.duty_officer ? 'Attending Staff' : 'Voice Persona'}
                        </span>
                        <span className="text-xs font-black text-emerald-950 truncate block">
                          {activeInsightsData.duty_officer || 'Shubh (Bulbul:v3)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Patient & Case Quick Details */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Patient & Case</span>
                    <p className="font-bold text-gray-900">👤 {activeInsightsData.patient_name}</p>
                    {activeInsightsData.symptoms ? (
                      <p className="font-semibold text-red-600 truncate">⚠️ {activeInsightsData.symptoms}</p>
                    ) : (
                      <p className="font-extrabold text-red-600">🩸 {activeInsightsData.blood_group} ({activeInsightsData.units_needed})</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Destination / Facility</span>
                    <p className="font-medium text-gray-800 leading-snug">
                      🏥 {activeInsightsData.hospital_name || activeInsightsData.blood_bank_name || activeInsightsData.location || 'Mysuru'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">📞 Line: {selectedInsightsLog.phone_number}</p>
                  </div>
                </div>

                {/* Action Items / Caregiver Checklist */}
                {activeInsightsData.action_items && activeInsightsData.action_items.length > 0 && (
                  <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs space-y-2">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                      📋 Action Checklist & Protocols
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-blue-900">
                      {activeInsightsData.action_items.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-blue-100">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Turn-by-Turn Conversation Transcript */}
                {activeInsightsData.has_live_transcript && activeInsightsData.dialogue_turns && activeInsightsData.dialogue_turns.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        <MessageSquare size={13} className="text-red-600" />
                        Live Turn-by-Turn Voice Call Transcript
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const transcriptText = activeInsightsData.dialogue_turns
                              .map((t: any) => `${t.speaker}: ${t.text}`)
                              .join('\n\n');
                            navigator.clipboard.writeText(transcriptText);
                            setCopiedTranscript(true);
                            toast.success('Transcript copied to clipboard!');
                            setTimeout(() => setCopiedTranscript(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          {copiedTranscript ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          <span>{copiedTranscript ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeInsightsData.dialogue_turns.map((turn: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl text-xs space-y-0.5 ${
                            turn.role === 'ai'
                              ? 'bg-red-50/80 border border-red-100 mr-4 text-red-950'
                              : 'bg-gray-100 border border-gray-200 ml-4 text-gray-900'
                          }`}
                        >
                          <span className="font-bold text-[10px] text-gray-500 block">
                            {turn.speaker}
                          </span>
                          <p className="leading-relaxed">{turn.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Status:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {selectedInsightsLog.status}
                    </span>
                  </div>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      selectedInsightsLog.type === 'emergency_sos'
                        ? `🚨 *MEDCARE EMERGENCY VOICE SOS REPORT*\nPatient: ${selectedInsightsLog.patient_name}\nCondition: ${selectedInsightsLog.symptoms || selectedInsightsLog.emergency_type || 'Emergency Distress'}\nLocation: ${selectedInsightsLog.location || 'Mysuru'}\nStatus: ${activeInsightsData.triage_status || selectedInsightsLog.status}\nSummary: ${activeInsightsData.call_summary || activeInsightsData.stock_availability_summary}`
                        : `🩸 *MEDCARE AI BLOOD AVAILABILITY REPORT*\nFacility: ${selectedInsightsLog.blood_bank_name}\nPatient: ${selectedInsightsLog.patient_name}\nRequirement: ${selectedInsightsLog.blood_group} (${selectedInsightsLog.units_needed})\nStatus: ${activeInsightsData.stock_status}\nSummary: ${activeInsightsData.stock_availability_summary}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
                  >
                    <span>💬 WhatsApp Summary</span>
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Multi-Number Emergency Broadcast Voice Call Status Modal */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="🚨 Emergency Voice SOS - Multi-Number Family Broadcast"
        maxWidth="max-w-2xl"
      >
        {broadcastResults && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start space-x-3 text-red-950">
              <div className="p-2 bg-red-100 rounded-lg text-red-700 shrink-0">
                <Radio size={20} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-red-900">
                    {broadcastResults.message || 'Emergency Voice Broadcast Dispatched'}
                  </h4>
                  <Badge variant="danger" size="sm">
                    {broadcastResults.total_contacts_dialed || broadcastResults.recipients?.length || 1} Dialed Simultaneously
                  </Badge>
                </div>
                <p className="text-xs text-red-800 mt-1">
                  Automated AI voice agent is connecting simultaneously to all registered family members and caretakers with clinical vitals and live GPS coordinates.
                </p>
              </div>
            </div>

            {/* Recipient Details List */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Recipients & Telephony Status
              </h5>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {broadcastResults.recipients && broadcastResults.recipients.length > 0 ? (
                  broadcastResults.recipients.map((rec: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-gray-900 text-xs">{rec.name || 'Emergency Contact'}</span>
                            {rec.relationship && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                {rec.relationship}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 font-mono">{rec.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          rec.status === 'initiated' || rec.status === 'ringing' || rec.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.status || 'Initiated'}
                        </span>
                        {rec.call_id && (
                          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                            ID: {rec.call_id.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-white text-center text-xs text-gray-500">
                    Voice call dispatched to: {broadcastResults.phone_number || 'Registered Emergency Contacts'}
                  </div>
                )}
              </div>
            </div>

            {/* Provider and Telephony Details */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <Sparkles size={14} className="text-indigo-600" />
                <span>Voice Gateway: <strong>{broadcastResults.voice_provider || 'Sarvam AI Voice Agent'}</strong></span>
              </div>
              <div className="text-[11px] text-gray-400">
                Mode: Simultaneous Multi-Call Async
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsBroadcastModalOpen(false)} size="sm">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}