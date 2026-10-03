import { useState, useRef, useEffect } from 'react';
import { usePatients } from '../hooks/usePatients';
import { ChatMessage } from '../components/chat/ChatMessage';
import { EmergencyDispatchModal } from '../components/chat/EmergencyDispatchModal';
import {
  Sparkles,
  Volume2,
  VolumeX,
  PhoneCall,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  HeartPulse,
  Phone,
  X,
  Activity,
  Pill,
  UserCheck,
  ShieldAlert,
  Radio,
  Pause,
  PhoneOff,
  Bot,
  User
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { ChatMessage as MsgType } from '../types/conversation';

interface SuggestionCategory {
  category: string;
  icon: any;
  items: string[];
}

const CATEGORIZED_SUGGESTIONS: Record<string, SuggestionCategory[]> = {
  en: [
    {
      category: "Medications",
      icon: Pill,
      items: [
        "What medications are prescribed and what are their timings?",
        "Are there any food instructions or precautions for my medicines?",
      ]
    },
    {
      category: "Vitals & Lab Reports",
      icon: Activity,
      items: [
        "What are my latest vitals (Blood Sugar, BP, Hemoglobin)?",
        "Explain my recent diagnostic lab report results.",
      ]
    },
    {
      category: "Doctor & Treatment",
      icon: UserCheck,
      items: [
        "Who is my primary doctor and hospital?",
        "Give me a summary of the doctor's diagnosis and advice.",
      ]
    },
    {
      category: "Safety & Allergies",
      icon: ShieldAlert,
      items: [
        "Does the patient have any recorded drug allergies?",
        "What critical symptoms require immediate emergency care?",
      ]
    }
  ],
  kn: [
    {
      category: "ಔಷಧಿಗಳು",
      icon: Pill,
      items: [
        "ಪ್ರಸ್ತುತ ಯಾವ ಔಷಧಿಗಳನ್ನು ಸೂಚಿಸಲಾಗಿದೆ ಮತ್ತು ಅವುಗಳ ಸಮಯ?",
        "ಔಷಧಿಗಳಿಗೆ ಯಾವುದೇ ಆಹಾರ ಸೂಚನೆಗಳು ಇವೆಯೇ?",
      ]
    },
    {
      category: "ಆರೋಗ್ಯ ಅಂಕಿಅಂಶಗಳು",
      icon: Activity,
      items: [
        "ಇತ್ತೀಚಿನ ರಕ್ತದ ಸಕ್ಕರೆ (Blood Sugar) ಮತ್ತು ಬಿಪಿ ವಿವರಗಳು?",
        "ಡಯಾಗ್ನೋಸ್ಟಿಕ್ ಲ್ಯಾಬ್ ವರದಿಯ ಸಾರಾಂಶ ನೀಡಿ.",
      ]
    },
    {
      category: "ವೈದ್ಯರು",
      icon: UserCheck,
      items: [
        "ಮುಖ್ಯ ಸಲಹೆಗಾರ ವೈದ್ಯರು ಮತ್ತು ಆಸ್ಪತ್ರೆ ಯಾವುದು?",
        "ವೈದ್ಯರ ರೋಗನಿರ್ಣಯ ಮತ್ತು ಸಲಹೆಯನ್ನು ತಿಳಿಸಿ.",
      ]
    },
    {
      category: "ಸುರಕ್ಷತೆ",
      icon: ShieldAlert,
      items: [
        "ಅವರಿಗೆ ಯಾವುದೇ ಔಷಧಿ ಅಲರ್ಜಿಗಳು ಇವೆಯೇ?",
        "ತುರ್ತು ಪರಿಸ್ಥಿತಿಯ ಮುನ್ಸೂಚನೆ ಲಕ್ಷಣಗಳು ಯಾವುವು?",
      ]
    }
  ],
  hi: [
    {
      category: "दवाइयां",
      icon: Pill,
      items: [
        "वर्तमान में कौन सी दवाइयां निर्धारित हैं और उनका समय क्या है?",
        "दवाइयों के साथ क्या परहेज़ या भोजन के निर्देश हैं?",
      ]
    },
    {
      category: "स्वास्थ्य पैरामीटर",
      icon: Activity,
      items: [
        "नवीनतम ब्लड शुगर और रक्तचाप (BP) क्या है?",
        "हालिया लैब रिपोर्ट का सारांश दें।",
      ]
    },
    {
      category: "डॉक्टर व सलाह",
      icon: UserCheck,
      items: [
        "मुख्य डॉक्टर और अस्पताल का नाम क्या है?",
        "डॉक्टर का मुख्य निदान और सलाह क्या है?",
      ]
    },
    {
      category: "सुरक्षा",
      icon: ShieldAlert,
      items: [
        "क्या मरीज को कोई ज्ञात दवा एलर्जी है?",
        "किन गंभीर लक्षणों में आपातकालीन मदद लेनी चाहिए?",
      ]
    }
  ]
};

const SPEAKER_MAP: Record<string, string> = {
  en: 'shubh',
  kn: 'shubh',
  hi: 'shubh',
};

type ChatMode = 'text' | 'voice';

export default function ChatPage() {
  const { currentPatient } = usePatients();
  const [messages, setMessages] = useState<MsgType[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'en' | 'kn' | 'hi'>('en');
  const [currentlyPlayingText, setCurrentlyPlayingText] = useState<string | null>(null);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencySymptom, setEmergencySymptom] = useState<string>("Emergency Detected");
  const [activeAudioElement, setActiveAudioElement] = useState<HTMLAudioElement | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('text');
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentQueryText, setCurrentQueryText] = useState('');
  const [emergencyConfirmTimeout, setEmergencyConfirmTimeout] = useState<any>(null);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [emergencyCountdown, setEmergencyCountdown] = useState(10);
  const [voiceCallSeconds, setVoiceCallSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (chatMode === 'voice') {
      interval = setInterval(() => {
        setVoiceCallSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setVoiceCallSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [chatMode]);

  const formatVoiceTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDynamicLoadingState = (query: string, lang: 'en' | 'kn' | 'hi') => {
    const q = query.toLowerCase().trim();
    
    if (q.includes('med') || q.includes('drug') || q.includes('pill') || q.includes('tablet') || q.includes('dose') || q.includes('schedule') || q.includes('prescription') || q.includes('ಔಷಧ') || q.includes('ದವಾ') || q.includes('दवा')) {
      return {
        text: lang === 'kn' ? 'ಔಷಧಿಗಳ ವಿವರ ಮತ್ತು ವೇಳಾಪಟ್ಟಿ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...' : lang === 'hi' ? 'दवाइयों और खुराक का विश्लेषण किया जा रहा है...' : 'Analyzing medications & dosage schedule...',
        icon: '💊'
      };
    }
    
    if (q.includes('diagno') || q.includes('summary') || q.includes('condition') || q.includes('disease') || q.includes('report') || q.includes('discharge') || q.includes('problem') || q.includes('issue') || q.includes('ರೋಗನಿರ್ಣಯ') || q.includes('ವಿವರ') || q.includes('निदान') || q.includes('रिपोर्ट')) {
      return {
        text: lang === 'kn' ? 'ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯ ಮತ್ತು ವರದಿ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...' : lang === 'hi' ? 'चिकित्सीय निदान और रिपोर्ट का विश्लेषण जारी है...' : 'Analyzing diagnosis & clinical records...',
        icon: '🩺'
      };
    }
    
    if (q.includes('vital') || q.includes('bp') || q.includes('blood') || q.includes('pressure') || q.includes('glucose') || q.includes('sugar') || q.includes('temp') || q.includes('pulse') || q.includes('heart') || q.includes('ಲ್ಯಾಬ್') || q.includes('ಶುಗರ್') || q.includes('वाइटल्स')) {
      return {
        text: lang === 'kn' ? 'ಇತ್ತೀಚಿನ ಲ್ಯಾಬ್ ವರದಿಗಳು ಮತ್ತು Vitals ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : lang === 'hi' ? 'हालिया लैब टेस्ट और वाइटल्स की जांच हो रही है...' : 'Analyzing lab results & vital signs...',
        icon: '📊'
      };
    }
    
    if (q.includes('allerg') || q.includes('reaction') || q.includes('ಅಲರ್ಜಿ') || q.includes('एलर्जी')) {
      return {
        text: lang === 'kn' ? 'ಔಷಧಿ ಅಲರ್ಜಿಗಳು ಮತ್ತು ಮುನ್ನೆಚ್ಚರಿಕೆ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : lang === 'hi' ? 'दवा एलर्जी और सावधानियों की जांच हो रही है...' : 'Checking allergy contraindications & safety...',
        icon: '⚠️'
      };
    }
    
    if (q.includes('doctor') || q.includes('physician') || q.includes('specialist') || q.includes('dr') || q.includes('hospital') || q.includes('ವೈದ್ಯ') || q.includes('ಆಸ್ಪತ್ರೆ') || q.includes('डॉक्टर')) {
      return {
        text: lang === 'kn' ? 'ಸಲಹೆಗಾರ ವೈದ್ಯರ ದಾಖಲೆಗಳನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ...' : lang === 'hi' ? 'परामर्शदाता डॉक्टर का विवरण प्राप्त किया जा रहा है...' : 'Retrieving attending physician records...',
        icon: '👨‍⚕️'
      };
    }
    
    if (q === 'hi' || q === 'hello' || q === 'hey' || q.startsWith('hi ') || q.startsWith('hello ') || q === 'namaste' || q === 'namaskara' || q === 'ನಮಸ್ಕಾರ' || q === 'नमस्ते') {
      return {
        text: lang === 'kn' ? 'MedCare ವೈದ್ಯಕೀಯ ಸಹಾಯಕ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...' : lang === 'hi' ? 'MedCare मेडिकल असिस्टेंट तैयार हो रहा है...' : 'Connecting to clinical assistant...',
        icon: '✨'
      };
    }

    return {
      text: lang === 'kn' ? 'ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...' : lang === 'hi' ? 'मेडिकल डेटा का विश्लेषण जारी है...' : 'Analyzing clinical data & patient records...',
      icon: '⚡'
    };
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceTranscriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    voiceTranscriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    setMessages([]);
    stopAudio();
  }, [currentPatient?.id]);

  useEffect(() => {
    return () => {
      stopAudio();
      stopListening();
      if (emergencyConfirmTimeout) {
        clearTimeout(emergencyConfirmTimeout);
      }
    };
  }, []);

  // Emergency countdown timer
  useEffect(() => {
    if (showEmergencyConfirm && emergencyCountdown > 0) {
      const timer = setTimeout(() => {
        setEmergencyCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showEmergencyConfirm && emergencyCountdown === 0) {
      handleEmergencyCall();
    }
  }, [showEmergencyConfirm, emergencyCountdown]);

  const stopAudio = () => {
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      setActiveAudioElement(null);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentlyPlayingText(null);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsListening(false);
  };

  const playNaturalAudio = async (text: string, forcePlay: boolean = false) => {
    // If not forced and auto voice is disabled in text mode, do not play
    if (!forcePlay && chatMode !== 'voice' && !autoVoiceEnabled) return;

    stopAudio();
    setCurrentlyPlayingText(text);

    const speaker = SPEAKER_MAP[selectedLang] || 'priya';
    const langCode = selectedLang === 'kn' ? 'kn-IN' : selectedLang === 'hi' ? 'hi-IN' : 'en-IN';

    try {
      // 1. Try High-Fidelity Sarvam Natural Voice
      const res = await apiClient.post('/api/voice/tts', {
        text: text.slice(0, 500),
        speaker,
        language_code: langCode,
      });

      if (res.data?.audio_url) {
        const audio = new Audio(res.data.audio_url);
        setActiveAudioElement(audio);
        audio.onended = () => {
          setCurrentlyPlayingText(null);
          setActiveAudioElement(null);
        };
        audio.onerror = () => {
          fallbackBrowserSpeech(text, langCode);
        };
        await audio.play();
        return;
      }
    } catch (err) {
      console.log('Natural AI voice API fallback to browser synthesis', err);
    }

    // 2. Browser Web Speech fallback with natural pitch
    fallbackBrowserSpeech(text, langCode);
  };

  const fallbackBrowserSpeech = (text: string, langCode: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Clean emojis, markdown symbols, and bullets for natural fluid reading
      const cleanText = text
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{FE0F}\u{200D}]/gu, '')
        .replace(/[*_#`•-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = langCode;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.onend = () => setCurrentlyPlayingText(null);
      utterance.onerror = () => setCurrentlyPlayingText(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setCurrentlyPlayingText(null);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is supported in Chrome, Edge, Safari, and modern mobile browsers.');
      return;
    }

    stopAudio();
    stopListening();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = selectedLang === 'kn' ? 'kn-IN' : selectedLang === 'hi' ? 'hi-IN' : 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
      // If in voice agent mode, auto-send spoken question
      if (chatMode === 'voice') {
        sendMessage(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const isMenstrualOrRoutineQuery = (text: string): boolean => {
    const t = text.toLowerCase().trim();
    const routineTerms = [
      'period', 'menstrua', 'menses', 'menstrual cycle',
      'bleeding in periods', 'periods bleeding', 'period bleeding', 'heavy period', 'heavy periods',
      'menstrual bleeding', 'cramp', 'spotting', 'vaginal spotting', 'pcos', 'pcod', 'ovary', 'ovulation', 'pregnancy', 'pregnant',
      'ಮುಟ್ಟ', 'ಋತು', 'ತಿಂಗಳ', 'ಪೀರಿಯಡ್',
      'पीरियड', 'मासिक', 'माहवारी'
    ];
    return routineTerms.some(term => t.includes(term));
  };

  const checkForEmergency = (text: string): boolean => {
    const t = text.toLowerCase().trim();
    if (isMenstrualOrRoutineQuery(t)) {
      // Menstrual/period queries are NOT acute emergencies unless accompanied by collapse
      const hasCollapse = /\b(unconscious|collapsed|fainted|coma|died|dying|ಬಿದ್ದಿ|ಪ್ರಜ್ಞೆ ತಪ್ಪಿ|बेहोश)\b/i.test(t);
      if (!hasCollapse) {
        return false;
      }
    }
    const patterns = [
      // English
      /\b(emergency|call (911|112|108|1066|ambulance|police)|chest\s*(pain|tightness|pressure)|heart attack|stroke|severe bleeding|heavy blood loss|arterial bleeding|coughing blood|vomiting blood|unconscious|fainted|can'?t breathe|cannot breathe|difficulty breathing|severe chest pain|collapsed|overdose|poison)\b/i,
      // Kannada (ಕನ್ನಡ - flexible morphological matching)
      /(ತುರ್ತು|ಎದೆ[ಯಾ\s]*ನೋವು|ಹಾರ್ಟ್\s*ಅಟ್ಯಾಕ್|ಉಸಿರಾಟ|ಉಸಿರಾಡಲು|ಪ್ರಜ್ಞೆ ತಪ್ಪಿ|ಬಿದ್ದಿ|ಸಾಯುತ್ತಿ|ಕಾಪಾಡಿ|ತೀವ್ರ\s*ರಕ್ತಸ್ರಾವ|ಆಘಾತ|ವಿಷ)/i,
      // Hindi (हिन्दी - flexible morphological matching)
      /(आपातकाल|छाती\s*(में)?\s*दर्द|सीने\s*(में)?\s*दर्द|दिल\s*का\s*दौरा|हार्ट\s*अटैक|सांस\s*(लेने\s*में)?\s*(तकलीफ|दिक्कत)|बेहोश|खून\s*(की उल्टी|बहना बंद नहीं)|मदद\s*करो|बचाओ)/i,
    ];
    return patterns.some(p => p.test(t));
  };

  const handleEmergencyCall = () => {
    setShowEmergencyConfirm(false);
    setEmergencyCountdown(10);
    setIsEmergencyModalOpen(true);
    if (emergencyConfirmTimeout) {
      clearTimeout(emergencyConfirmTimeout);
      setEmergencyConfirmTimeout(null);
    }
  };

  const handleEmergencyCancel = () => {
    setShowEmergencyConfirm(false);
    setEmergencyCountdown(10);
    if (emergencyConfirmTimeout) {
      clearTimeout(emergencyConfirmTimeout);
      setEmergencyConfirmTimeout(null);
    }
    const cancelMsg = selectedLang === 'kn' ? 'ತುರ್ತು ಕರೆ ರದ್ದು ಮಾಡಲಾಗಿದೆ.' : selectedLang === 'hi' ? 'आपातकालीन कॉल रद्द।' : 'Emergency call cancelled.';
    playNaturalAudio(cancelMsg, true);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentPatient?.id) return;

    const userMessage: MsgType = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setCurrentQueryText(text);

    setIsTyping(true);

    try {
      const res = await apiClient.post('/api/conversations', {
        message: text,
        patient_id: currentPatient.id,
        conversation_history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      });

      const assistantMessage: MsgType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.answer || 'I am reviewing the patient records to assist you.',
        timestamp: new Date(),
        intent: res.data.intent,
        isSafetyResponse: res.data.is_safety_response,
        sources: res.data.sources,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (res.data.is_safety_response && res.data.should_suggest_911) {
        setEmergencySymptom(text);
        setShowEmergencyConfirm(false);
        setIsEmergencyModalOpen(true);
        
        // Speak the natural clinical emergency response directly
        playNaturalAudio(assistantMessage.content, true);
      } else {
        // Speak response if voice mode or autoVoice is active
        if (chatMode === 'voice' || autoVoiceEnabled) {
          await playNaturalAudio(assistantMessage.content, false);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: MsgType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, I encountered a temporary connection issue. Please try your question again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    sendMessage(suggestion);
  };

  const handleSendClick = () => {
    sendMessage(inputText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const currentCategories = CATEGORIZED_SUGGESTIONS[selectedLang] || CATEGORIZED_SUGGESTIONS['en'];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      
      {/* Modern Top Header */}
      <div className="bg-white border-b border-gray-200/80 shadow-xs px-6 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900">
                  MedCare AI
                </h1>
                {currentPatient && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                    {currentPatient.first_name} {currentPatient.last_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Medical Records & Diagnostic Intelligence · Natural Spoken Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setChatMode('text');
                  stopAudio();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  chatMode === 'text'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageSquare size={13} />
                Text Chat
              </button>
              <button
                onClick={() => {
                  setChatMode('voice');
                  setAutoVoiceEnabled(true);
                  stopAudio();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  chatMode === 'voice'
                    ? 'bg-purple-600 text-white shadow-xs shadow-purple-500/20'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Radio size={13} className={chatMode === 'voice' ? 'animate-pulse' : ''} />
                Voice Mode
              </button>
            </div>

            {/* Auto-Voice / Sound Toggle Button */}
            <button
              onClick={() => {
                if (currentlyPlayingText) {
                  stopAudio();
                } else {
                  setAutoVoiceEnabled(!autoVoiceEnabled);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                currentlyPlayingText
                  ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                  : autoVoiceEnabled || chatMode === 'voice'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              title={autoVoiceEnabled ? "Natural voice readout active" : "Enable spoken audio replies"}
            >
              {currentlyPlayingText ? (
                <>
                  <VolumeX size={14} className="text-red-600" />
                  <span>Stop Speaking</span>
                </>
              ) : autoVoiceEnabled || chatMode === 'voice' ? (
                <>
                  <Volume2 size={14} className="text-blue-600" />
                  <span>Voice Replies: ON</span>
                </>
              ) : (
                <>
                  <VolumeX size={14} className="text-gray-400" />
                  <span>Voice: Muted</span>
                </>
              )}
            </button>

            {/* Language Selector */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              {(['en', 'kn', 'hi'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => {
                    setSelectedLang(lang);
                    stopAudio();
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedLang === lang
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {lang === 'en' ? '🇬🇧 EN' : lang === 'kn' ? '🇮🇳 ಕನ್ನಡ' : '🇮🇳 हिन्दी'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Confirmation Banner */}
      {showEmergencyConfirm && (
        <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <PhoneCall size={20} className="animate-bounce" />
            <div>
              <p className="font-bold text-xs">CRITICAL EMERGENCY DETECTED</p>
              <p className="text-[11px] opacity-90">
                Initiating emergency protocol in {emergencyCountdown}s...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEmergencyCall}
              className="px-3 py-1.5 bg-white text-red-600 rounded-lg font-bold text-xs hover:bg-gray-100 transition-all flex items-center gap-1 shadow-sm"
            >
              <Phone size={13} />
              CALL NOW
            </button>
            <button
              onClick={handleEmergencyCancel}
              className="px-3 py-1.5 bg-red-700 text-white rounded-lg font-bold text-xs hover:bg-red-800 transition-all flex items-center gap-1"
            >
              <X size={13} />
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* MAIN BODY: Voice Mode View OR Standard Text Chat */}
      {chatMode === 'voice' ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50 min-h-0">
          
          {/* Left/Center: Siri/Sarvam Glowing 3D Voice Orb Canvas (Stationary / Non-scrolling) */}
          <div className="lg:col-span-7 h-full flex flex-col items-center justify-between p-6 md:p-8 relative border-r border-gray-200/80 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden select-none">
            
            {/* Top Bar of Voice Call */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-emerald-200 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Live Voice Session</span>
              </div>
              <div className="text-center hidden sm:block">
                <h2 className="text-sm font-bold text-gray-900">
                  {currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'MedCare AI Voice Assistant'}
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">Natural Spoken Assistant</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 shadow-xs">
                {selectedLang === 'kn' ? '🇮🇳 ಕನ್ನಡ' : selectedLang === 'hi' ? '🇮🇳 हिन्दी' : '🇬🇧 English'}
              </div>
            </div>

            {/* Central 3D Glowing Animated Orb */}
            <div className="my-auto py-8 flex flex-col items-center justify-center relative">
              {/* Outer ambient glow rings */}
              <div className={`absolute w-72 h-72 rounded-full transition-all duration-700 blur-2xl opacity-60 pointer-events-none ${
                currentlyPlayingText
                  ? 'bg-gradient-to-tr from-emerald-400 via-teal-300 to-indigo-400 scale-125 animate-pulse'
                  : isListening
                  ? 'bg-gradient-to-tr from-red-400 via-orange-300 to-amber-400 scale-125 animate-pulse'
                  : isTyping
                  ? 'bg-gradient-to-tr from-blue-400 via-indigo-300 to-purple-400 scale-110 animate-pulse'
                  : 'bg-gradient-to-tr from-emerald-200 via-teal-100 to-blue-200 scale-100'
              }`} />

              {/* 3D Sphere Orb Body */}
              <div
                onClick={() => {
                  if (currentlyPlayingText) {
                    stopAudio();
                  } else {
                    toggleListening();
                  }
                }}
                className={`w-60 h-60 md:w-64 md:h-64 rounded-full cursor-pointer relative shadow-2xl transition-all duration-500 flex items-center justify-center select-none ${
                  currentlyPlayingText
                    ? 'bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-600 shadow-emerald-400/50 scale-105 ring-8 ring-emerald-100 animate-pulse'
                    : isListening
                    ? 'bg-gradient-to-br from-rose-400 via-red-500 to-amber-600 shadow-red-400/50 scale-105 ring-8 ring-rose-100 animate-pulse'
                    : isTyping
                    ? 'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 shadow-blue-400/40 ring-8 ring-blue-100'
                    : 'bg-gradient-to-br from-emerald-200 via-emerald-300 to-teal-400 shadow-emerald-200/40 hover:scale-102 hover:shadow-emerald-300/50 ring-6 ring-emerald-50'
                }`}
              >
                {/* Inner glass texture pattern */}
                <div className="absolute inset-0 rounded-full opacity-25 bg-[radial-gradient(circle_at_30%_30%,white,transparent)] pointer-events-none" />

                {/* Center Floating Glass Pill Button (Matches User Screenshot) */}
                <div className="px-5 py-2.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-white/80 flex items-center gap-2 hover:scale-105 transition-transform z-10">
                  {currentlyPlayingText ? (
                    <>
                      <Pause size={16} className="text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-800">Pause</span>
                    </>
                  ) : isListening ? (
                    <>
                      <Mic size={16} className="text-red-600 animate-pulse" />
                      <span className="text-xs font-bold text-red-700">Listening...</span>
                    </>
                  ) : isTyping ? (
                    <>
                      <Sparkles size={16} className="text-blue-600 animate-spin" />
                      <span className="text-xs font-bold text-blue-700">Thinking...</span>
                    </>
                  ) : (
                    <>
                      <Mic size={16} className="text-gray-700" />
                      <span className="text-xs font-bold text-gray-800">Tap to Speak</span>
                    </>
                  )}
                </div>
              </div>

              {/* Call Timer (Matches Screenshot 00:06) */}
              <div className="mt-6 font-mono text-sm font-bold text-gray-600 tracking-wider">
                {formatVoiceTime(voiceCallSeconds)}
              </div>

              {/* Live Spoken Status */}
              <p className="mt-2 text-xs font-medium text-gray-500 text-center max-w-xs">
                {currentlyPlayingText
                  ? '🔊 MedCare Assistant is speaking natural audio...'
                  : isListening
                  ? '🎙️ Listening... Speak your medical question now'
                  : isTyping
                  ? '⚡ Processing clinical query...'
                  : 'Tap the orb or mic below to speak naturally'}
              </p>
            </div>

            {/* Bottom Controls Bar */}
            <div className="w-full max-w-md flex items-center justify-between pt-4 border-t border-gray-200/70">
              <button
                onClick={() => {
                  setChatMode('text');
                  stopAudio();
                  stopListening();
                }}
                className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <MessageSquare size={14} />
                Switch to Text
              </button>

              <button
                onClick={toggleListening}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95 ${
                  isListening ? 'bg-red-600 shadow-red-500/40 animate-pulse ring-4 ring-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
                }`}
                title={isListening ? "Stop listening" : "Tap to speak"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                onClick={() => {
                  stopAudio();
                  stopListening();
                  setChatMode('text');
                }}
                className="px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1.5"
              >
                <PhoneOff size={14} />
                End Call
              </button>
            </div>
          </div>

          {/* Right: Live Transcript Panel (Matches Reference Design) */}
          <div className="lg:col-span-5 flex flex-col h-full bg-white border-l border-gray-200/80 min-h-0">
            {/* Transcript Header (Matches Reference: "Live transcript" & "👤 MedCare Assistant") */}
            <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 tracking-tight">Live transcript</h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <User size={14} className="text-gray-400" />
                <span>MedCare Assistant</span>
              </div>
            </div>

            {/* Transcript Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-400">
                  <Radio size={28} className="mb-2 text-gray-300 animate-pulse" />
                  <p className="text-xs font-medium text-gray-600">No spoken messages yet</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[220px]">
                    Tap the green orb or microphone to speak. Your conversation will transcribe in real-time.
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onSpeak={(t) => playNaturalAudio(t, true)}
                    isPlayingAudio={currentlyPlayingText === msg.content}
                  />
                ))
              )}
              <div ref={voiceTranscriptEndRef} />
            </div>

            {/* Footer with Dark Graphite Action Button (Matches Reference) */}
            <div className="p-4 border-t border-gray-100 bg-white space-y-3">
              {/* Quick Vocal Suggestions */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => sendMessage("What medications am I taking?")}
                  className="px-3 py-1.5 rounded-full bg-gray-50 hover:bg-indigo-50 text-xs text-gray-700 hover:text-indigo-700 border border-gray-200 font-medium transition-all shadow-2xs"
                >
                  💊 "What medications do I take?"
                </button>
                <button
                  onClick={() => sendMessage("Read out my latest lab vitals")}
                  className="px-3 py-1.5 rounded-full bg-gray-50 hover:bg-indigo-50 text-xs text-gray-700 hover:text-indigo-700 border border-gray-200 font-medium transition-all shadow-2xs"
                >
                  📊 "Read out my latest vitals"
                </button>
              </div>

              <button
                onClick={() => {
                  setChatMode('text');
                  stopAudio();
                  stopListening();
                }}
                className="w-full py-3.5 px-6 rounded-full bg-[#1e2029] hover:bg-[#111217] text-white text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <MessageSquare size={14} />
                Switch to Text Mode
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="max-w-3xl mx-auto py-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 mb-3 shadow-inner">
                    <HeartPulse className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    {selectedLang === 'kn'
                      ? 'ನಿಮ್ಮ ವೈದ್ಯಕೀಯ AI ಸಹಾಯಕ'
                      : selectedLang === 'hi'
                      ? 'आपका AI चिकित्सा सहायक'
                      : 'How can I assist with clinical records today?'}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    {selectedLang === 'kn' 
                      ? 'ಔಷಧಿಗಳು, ಲ್ಯಾಬ್ ವರದಿಗಳು, ವೈದ್ಯರ ಸಲಹೆಗಳು ಅಥವಾ ಧ್ವನಿ ಮೂಲಕ ನೇರವಾಗಿ ಕೇಳಿ'
                      : selectedLang === 'hi'
                      ? 'ದವಾइयों, लैब रिपोर्ट, डॉक्टर के पर्चे अथवा बोलकर सीधे प्रश्न पूछें'
                      : 'Ask about prescribed medications, recent lab reports, vital trends, or tap the microphone to speak naturally.'}
                  </p>
                </div>

                {/* Categorized Smart Suggestion Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {currentCategories.map((cat, idx) => {
                    const IconComponent = cat.icon;
                    return (
                      <div key={idx} className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-gray-800">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <IconComponent size={14} />
                          </div>
                          <span>{cat.category}</span>
                        </div>
                        <div className="space-y-1.5">
                          {cat.items.map((item, itemIdx) => (
                            <button
                              key={itemIdx}
                              onClick={() => handleSuggestionClick(item)}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-700 bg-gray-50/80 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200/60 transition-all flex items-center justify-between group"
                            >
                              <span className="line-clamp-1">{item}</span>
                              <span className="text-gray-400 group-hover:text-blue-600 font-bold ml-2">→</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOpenEmergencyDispatch={(sym) => {
                  setEmergencySymptom(sym);
                  setIsEmergencyModalOpen(true);
                }}
                onSpeak={(text) => playNaturalAudio(text, true)}
                isPlayingAudio={currentlyPlayingText === msg.content}
              />
            ))}

            {isTyping && (() => {
              const loadingInfo = getDynamicLoadingState(currentQueryText, selectedLang);
              return (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs border border-blue-100/90 bg-blue-50/20">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{loadingInfo.icon}</span>
                      <span className="text-xs text-blue-800 font-medium">{loadingInfo.text}</span>
                      <div className="flex items-center gap-1 ml-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Controls Footer */}
          <div className="border-t border-gray-200 bg-white px-6 py-3.5 shadow-lg">
            <div className="max-w-4xl mx-auto space-y-2">
              {/* Quick suggestions pill row when messages exist */}
              {messages.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                  <span className="text-[11px] font-semibold text-gray-400 shrink-0">Suggestions:</span>
                  <button
                    onClick={() => handleSuggestionClick("What medications are currently active?")}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 text-[11px] font-medium transition-all"
                  >
                    💊 Active Meds
                  </button>
                  <button
                    onClick={() => handleSuggestionClick("What are the latest vital signs and lab results?")}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 text-[11px] font-medium transition-all"
                  >
                    📊 Latest Vitals
                  </button>
                  <button
                    onClick={() => handleSuggestionClick("Summarize the doctor's diagnosis.")}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 text-[11px] font-medium transition-all"
                  >
                    🩺 Diagnosis Summary
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2.5">
                {/* Natural Voice Input (Microphone) */}
                <button
                  onClick={toggleListening}
                  className={`p-3 rounded-xl transition-all shrink-0 flex items-center justify-center ${
                    isListening
                      ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-500/30 ring-2 ring-red-300'
                      : 'bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 border border-gray-200'
                  }`}
                  title={isListening ? "Listening... Click to stop" : "Speak your medical question"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                {/* Input Box */}
                <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200/90 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      isListening
                        ? selectedLang === 'kn'
                          ? 'ಕೇಳಿಸಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ... ಮಾತನಾಡಿ...'
                          : selectedLang === 'hi'
                          ? 'सुन रहे हैं... कृपया बोलिए...'
                          : 'Listening... Speak your question now...'
                        : selectedLang === 'kn'
                        ? 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಧ್ವನಿ ಬಳಸಿ...'
                        : selectedLang === 'hi'
                        ? 'अपना प्रश्न यहाँ लिखें या बोलकर पूछें...'
                        : 'Type a clinical question or tap the mic to speak...'
                    }
                    className="w-full px-4 py-2.5 bg-transparent border-0 outline-none resize-none text-sm text-gray-900 placeholder-gray-400"
                    rows={1}
                    style={{ minHeight: '42px', maxHeight: '120px' }}
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendClick}
                  disabled={!inputText.trim() || isTyping}
                  className="p-3 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-md shadow-blue-500/20 active:scale-95"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              </div>

              {/* Voice status notification banner */}
              {isListening && (
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  <span>
                    Listening in {selectedLang === 'kn' ? 'ಕನ್ನಡ (Kannada)' : selectedLang === 'hi' ? 'हिन्दी (Hindi)' : 'English'} — Speak clearly into your microphone
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Emergency Modal */}
      <EmergencyDispatchModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        patientId={currentPatient?.id}
        symptom={emergencySymptom}
        initialLang={selectedLang}
      />
    </div>
  );
}

