import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  PhoneCall,
  MessageCircle,
  AlertTriangle,
  MapPin,
  User,
  Stethoscope,
  ShieldAlert,
  Volume2,
  CheckCircle,
  Smartphone,
  Mail,
  LoaderCircle,
  Clock,
  ShieldCheck,
  Users,
  Radio,
  Sparkles,
  Phone
} from 'lucide-react';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';

interface EmergencyDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  symptom?: string;
  initialLang?: 'en' | 'kn' | 'hi';
}

export const EmergencyDispatchModal: React.FC<EmergencyDispatchModalProps> = ({
  isOpen,
  onClose,
  patientId,
  symptom = "Severe Chest Pain / Cardiac Emergency",
  initialLang = 'kn'
}) => {
  const [dossier, setDossier] = useState<any | null>(null);
  const [customPhone, setCustomPhone] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<'en' | 'kn' | 'hi'>(initialLang || 'kn');
  const [callingState, setCallingState] = useState<'idle' | 'calling' | 'connected'>('idle');
  const [activeCallNumber, setActiveCallNumber] = useState<string>('');
  const [broadcastResults, setBroadcastResults] = useState<any | null>(null);
  const [emailSending, setEmailSending] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  // 10-second auto-dispatch countdown
  const [countdown, setCountdown] = useState<number>(10);
  const [isAutoCountdownRunning, setIsAutoCountdownRunning] = useState<boolean>(true);
  const [hasAutoDispatched, setHasAutoDispatched] = useState<boolean>(false);

  useEffect(() => {
    if (initialLang) {
      setSelectedLang(initialLang);
    }
  }, [initialLang]);

  useEffect(() => {
    if (isOpen && patientId) {
      fetchDossier();
      // Reset countdown on modal open
      setCountdown(10);
      setIsAutoCountdownRunning(true);
      setHasAutoDispatched(false);
      setEmailStatus(null);
      setBroadcastResults(null);
      setCallingState('idle');
    } else {
      setIsAutoCountdownRunning(false);
    }
  }, [isOpen, patientId]);

  // 10-second countdown timer effect
  useEffect(() => {
    let timer: any = null;
    if (isOpen && isAutoCountdownRunning && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isOpen && isAutoCountdownRunning && countdown === 0 && !hasAutoDispatched) {
      setHasAutoDispatched(true);
      setIsAutoCountdownRunning(false);
      handleTriggerEmergencyEmail(true);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, isAutoCountdownRunning, countdown, hasAutoDispatched]);

  const fetchDossier = async () => {
    try {
      const res = await apiClient.post('/api/safety/emergency-dossier', {
        patient_id: patientId,
        presenting_symptom: symptom
      });
      setDossier(res.data);
      const initialPhone = res.data?.emergency_phone || res.data?.patient_phone || '';
      setCustomPhone(initialPhone);
    } catch (err) {
      console.error('Failed to fetch emergency dossier', err);
    }
  };

  const getActiveSpeechScript = () => {
    if (!dossier?.speech_scripts) return "Emergency dispatch";
    if (selectedLang === 'kn') return dossier.speech_scripts.kn || dossier.speech_scripts.en;
    if (selectedLang === 'hi') return dossier.speech_scripts.hi || dossier.speech_scripts.en;
    return dossier.speech_scripts.en || "Emergency dispatch";
  };

  const handleTriggerEmergencyEmail = async (isAuto: boolean = false) => {
    if (!patientId) {
      toast.error('No patient selected for emergency dispatch');
      return;
    }
    // Cancel active countdown since sending is now active
    setIsAutoCountdownRunning(false);
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const res = await apiClient.post('/api/safety/dispatch-email', {
        patient_id: patientId,
        presenting_symptom: symptom,
        custom_message: isAuto ? 'Automated 10-second emergency fail-safe alert triggered due to unresponsiveness.' : undefined
      });
      if (res.data?.success) {
        const count = res.data.sent_count || (res.data.recipients && res.data.recipients.length) || 1;
        const msg = isAuto
          ? `⏱️ Auto-Dispatched: Emergency dossier emailed to ${count} recipient(s) (${res.data.recipients?.join(', ') || 'Emergency Contacts & Doctor'})`
          : `Automated emergency email sent to ${count} recipient(s) (${res.data.recipients?.join(', ') || 'Emergency Network'})`;
        setEmailStatus(msg);
        toast.success(`📧 ${msg}`, { duration: 6000 });
      } else {
        toast.error(res.data?.error || 'Could not send automated email');
      }
    } catch (err: any) {
      console.error('Automated emergency email error:', err);
      toast.error(err?.response?.data?.detail || 'Failed to send automated email');
    } finally {
      setEmailSending(false);
    }
  };

  const playDispatchSpeech = async (scriptText: string) => {
    try {
      const res = await apiClient.post('/api/voice/tts', {
        text: scriptText,
        language: selectedLang === 'kn' ? 'kn-IN' : selectedLang === 'hi' ? 'hi-IN' : 'en-IN',
        speaker: selectedLang === 'kn' ? 'kavitha' : selectedLang === 'hi' ? 'shreya' : 'aditya'
      });
      if (res.data?.success && res.data?.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${res.data.audio_base64}`;
        const audio = new Audio(audioSrc);
        await audio.play();
        return;
      }
    } catch (e) {
      console.log('Voice fallback', e);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(scriptText);
      ut.lang = selectedLang === 'kn' ? 'kn-IN' : selectedLang === 'hi' ? 'hi-IN' : 'en-IN';
      ut.rate = 0.95;
      window.speechSynthesis.speak(ut);
    }
  };

  const handleBroadcastEmergencyCall = async () => {
    setIsAutoCountdownRunning(false);
    setCallingState('calling');
    const contactsCount = dossier?.all_contacts?.length || 'all';
    setActiveCallNumber(`All ${contactsCount} Family Members & Contacts`);
    const toastId = toast.loading(`🚨 Dialing all ${contactsCount} registered family members simultaneously...`);

    try {
      const res = await apiClient.post('/api/safety/dispatch-call', {
        broadcast: true,
        patient_id: patientId,
        speech_script: getActiveSpeechScript(),
        dossier_data: dossier,
        language: selectedLang
      });
      setCallingState('connected');
      if (res.data?.success || res.data?.status === 'success') {
        setBroadcastResults(res.data);
        const count = res.data.total_contacts_dialed || res.data.recipients?.length || dossier?.all_contacts?.length || 1;
        toast.success(`🚨 Emergency Voice Calls Dispatched to ${count} family numbers simultaneously!`, { id: toastId, duration: 6000 });
      } else {
        toast.error(`Emergency Voice Dispatch: ${res.data?.message || 'Call dispatch failed'}`, { id: toastId });
      }
    } catch (err: any) {
      console.error('Emergency call broadcast failed', err);
      setCallingState('connected');
      toast.error(err?.response?.data?.detail || err.message || 'Failed to dispatch broadcast voice calls', { id: toastId });
    }
  };

  const handleTriggerSingleCall = async (phone: string, name?: string) => {
    setIsAutoCountdownRunning(false);
    const targetPhone = phone || customPhone;
    const speechToPass = getActiveSpeechScript();
    setCallingState('calling');
    setActiveCallNumber(`${name || 'Contact'} (${targetPhone})`);
    const toastId = toast.loading(`Initiating AI Voice Call to ${name || targetPhone}...`);

    try {
      const res = await apiClient.post('/api/safety/dispatch-call', {
        phone_number: targetPhone,
        speech_script: speechToPass,
        patient_id: patientId,
        dossier_data: dossier,
        language: selectedLang
      });
      setCallingState('connected');
      toast.success(`Automated voice dispatch dialed (${targetPhone})!`, { id: toastId });
    } catch (err: any) {
      console.error('Emergency call dispatch failed', err);
      setCallingState('connected');
      toast.error(err?.response?.data?.detail || 'Call dispatch failed', { id: toastId });
    }
  };

  const openWhatsAppDispatch = async (targetPhone?: string) => {
    setIsAutoCountdownRunning(false);
    if (!dossier?.whatsapp_message) return;
    const phoneToUse = targetPhone || customPhone || (dossier?.all_contacts?.[0]?.phone);
    const cleanPhone = phoneToUse ? phoneToUse.replace(/\D/g, '') : '';

    // 1. Send automated backend WhatsApp message via Twilio API
    try {
      if (phoneToUse) {
        await apiClient.post('/api/safety/dispatch-whatsapp', {
          phone_number: phoneToUse,
          message: dossier.whatsapp_message
        });
      }
    } catch (err) {
      console.error('Twilio WhatsApp dispatch error', err);
    }

    // 2. Open WhatsApp Web / App directly
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(dossier.whatsapp_message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(dossier.whatsapp_message)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  const contactsList = dossier?.all_contacts || [];
  const totalContactsCount = contactsList.length || 1;

  return (
    <Modal isOpen={isOpen} onClose={() => {
      setIsAutoCountdownRunning(false);
      onClose();
    }} title="🚨 Emergency Case Dispatch & Automated Calling" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Top Critical Alert Banner */}
        <div className="bg-red-50 border-2 border-red-500/30 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-red-700 font-bold text-base">
            <AlertTriangle className="animate-pulse" size={20} />
            <span>CRITICAL CASE ALERT: {symptom}</span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            Immediate emergency triage protocol active. Paramedic dispatch dossier compiled for instant voice transmission and WhatsApp alert.
          </p>
        </div>

        {/* 10-Second Auto-Dispatch Countdown Banner */}
        {isAutoCountdownRunning && countdown > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                <span>AUTOMATIC EMERGENCY EMAIL DISPATCH IN {countdown}s</span>
              </div>
              <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 bg-amber-200 text-amber-900 rounded-full animate-pulse">
                {countdown}s remaining
              </span>
            </div>

            {/* Smooth animated progress bar */}
            <div className="w-full bg-amber-200/70 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 10) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1 gap-2">
              <p className="text-[11px] text-amber-800 leading-tight">
                If you do not respond, the complete clinical dossier will automatically be emailed to all emergency contacts & doctor.
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleTriggerEmergencyEmail(false)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Send Now
                </button>
                <button
                  onClick={() => {
                    setIsAutoCountdownRunning(false);
                    toast('Auto-dispatch countdown cancelled.');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  ✋ Cancel Auto-Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Patient Clinical Info Card */}
        {dossier && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-gray-200 pb-2">
              <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                <span className="font-semibold text-gray-700 flex items-center">
                  <User size={14} className="mr-1 text-blue-600" /> Patient:
                </span>
                <span className="font-bold text-gray-900">{dossier.patient_name}</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                <span className="font-semibold text-gray-700 flex items-center">
                  <MapPin size={14} className="mr-1 text-red-600" /> Location:
                </span>
                <span className="text-gray-900 font-medium truncate">{dossier.location}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-gray-200 pb-2">
              <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                <span className="font-semibold text-gray-700 flex items-center">
                  <ShieldAlert size={14} className="mr-1 text-amber-600" /> Allergies:
                </span>
                <Badge variant="danger" size="sm">
                  {dossier.allergies?.length > 0 ? dossier.allergies.join(', ') : 'No known drug allergies'}
                </Badge>
              </div>

              <div className="flex items-center justify-between sm:justify-start sm:gap-2">
                <span className="font-semibold text-gray-700 flex items-center">
                  <Stethoscope size={14} className="mr-1 text-emerald-600" /> Attending Doctor:
                </span>
                <span className="text-gray-800 font-medium truncate">{dossier.doctor_info}</span>
              </div>
            </div>

            {/* Emergency Network List (ALL Family Members & Contacts) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Users size={14} className="text-red-600" />
                  All Emergency Contacts & Family Members ({totalContactsCount}):
                </span>
                <Badge variant="danger" size="sm" className="bg-red-100 text-red-800">
                  Multiple Numbers
                </Badge>
              </div>

              {contactsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {contactsList.map((contact: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white rounded-lg border border-gray-200 flex items-center justify-between hover:border-red-300 transition-colors shadow-2xs"
                    >
                      <div className="truncate mr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-gray-900">{contact.name}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                            {contact.relationship || contact.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono flex items-center mt-0.5">
                          <Smartphone size={11} className="mr-1 text-gray-400" />
                          <span>{contact.phone}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTriggerSingleCall(contact.phone, contact.name)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md border border-red-200 transition-all shrink-0"
                        title={`Call ${contact.name} individually`}
                      >
                        <Phone size={13} className="text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-gray-600 flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-800">{customPhone || '+918310341645'}</span>
                  <span className="text-gray-400 text-[11px]">Primary Contact</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Language Selection for Voice Call Dispatch */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Volume2 size={15} className="text-blue-600" />
              Call Language / ಕರೆ ಭಾಷೆ / भाषा:
            </span>
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-blue-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedLang('kn')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  selectedLang === 'kn'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ಕನ್ನಡ (KN)
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang('en')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  selectedLang === 'en'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                English (EN)
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang('hi')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  selectedLang === 'hi'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                हिन्दी (HI)
              </button>
            </div>
          </div>
          <div className="bg-white/90 rounded-lg p-2.5 border border-blue-100 flex items-start justify-between gap-2">
            <p className="text-[11px] text-gray-700 italic line-clamp-2 leading-relaxed">
              "{getActiveSpeechScript()}"
            </p>
            <button
              type="button"
              onClick={() => playDispatchSpeech(getActiveSpeechScript())}
              className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 size={12} /> Test Voice
            </button>
          </div>
        </div>

        {/* 1-Tap Emergency Actions */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Radio size={14} className="text-red-600 animate-pulse" />
            1-Tap Emergency Dispatch to ALL Family Members
          </label>
          
          {/* Main Broadcast Button calling ALL family numbers simultaneously */}
          <button
            onClick={handleBroadcastEmergencyCall}
            disabled={callingState === 'calling'}
            className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center space-x-2 text-sm">
              {callingState === 'calling' ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <PhoneCall size={18} className="animate-bounce" />
              )}
              <span>
                🚨 Broadcast Voice Call to ALL Family & Contacts ({totalContactsCount})
              </span>
            </div>
            <span className="text-xs bg-red-950/40 px-2.5 py-1 rounded-full font-semibold border border-red-400/40">
              Instant Multi-Call ({selectedLang.toUpperCase()})
            </span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => openWhatsAppDispatch()}
              className="flex items-center justify-center space-x-1.5 p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Open WhatsApp emergency alert with clinical dossier"
            >
              <MessageCircle size={14} />
              <span>WhatsApp Alert</span>
            </button>

            <button
              onClick={() => handleTriggerEmergencyEmail(false)}
              disabled={emailSending}
              className="flex items-center justify-center space-x-1.5 p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Email clinical dossier to all emergency contacts"
            >
              {emailSending ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Mail size={14} />
              )}
              <span>{emailSending ? 'Sending…' : 'Email Dossier'}</span>
            </button>

            <button
              onClick={() => handleTriggerSingleCall("108", "Ambulance 108")}
              className="flex items-center justify-center space-x-1.5 p-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Direct call to National Ambulance Service"
            >
              <PhoneCall size={14} />
              <span>Call 108</span>
            </button>
          </div>
        </div>

        {/* Broadcast Call Status Feedback */}
        {broadcastResults && (
          <div className="bg-red-50/90 border border-red-200 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-red-950 font-bold">
              <span className="flex items-center gap-1.5">
                <Radio size={14} className="text-red-600 animate-pulse" />
                Broadcast Status: {broadcastResults.total_contacts_dialed || broadcastResults.recipients?.length} Numbers Dialed
              </span>
              <Badge variant="danger" size="sm">
                Simultaneous Async
              </Badge>
            </div>
            
            {broadcastResults.recipients && broadcastResults.recipients.length > 0 && (
              <div className="divide-y divide-red-100 bg-white rounded-lg border border-red-100 overflow-hidden max-h-36 overflow-y-auto">
                {broadcastResults.recipients.map((r: any, idx: number) => (
                  <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-gray-800">{r.name || 'Contact'}</span>
                      {r.relationship && <span className="text-[10px] text-gray-500">({r.relationship})</span>}
                    </div>
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="text-gray-600">{r.phone_number || r.phone}</span>
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold uppercase text-[10px]">
                        {r.status || 'Initiated'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {emailStatus && (
          <div className="bg-indigo-50 border border-indigo-300 rounded-xl p-3 flex items-center space-x-2 text-indigo-900 text-xs">
            <CheckCircle size={16} className="text-indigo-600 shrink-0" />
            <span>{emailStatus}</span>
          </div>
        )}

        {callingState !== 'idle' && !broadcastResults && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center space-x-2 text-emerald-800 text-xs">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>Emergency voice call dispatched. Ringing <strong>{activeCallNumber}</strong>.</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            onClose();
          }}>
            Close Dispatcher
          </Button>
        </div>
      </div>
    </Modal>
  );
};
