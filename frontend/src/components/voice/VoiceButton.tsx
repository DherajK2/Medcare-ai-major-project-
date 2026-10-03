import { useState, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';

export function VoiceButton({ onTranscript, lang = 'en-IN' }: { onTranscript: (text: string) => void; lang?: string }) {
  const [isListening, setIsListening] = useState(false);

  const toggle = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  }, [isListening, onTranscript, lang]);

  return (
    <button
      onClick={toggle}
      className={`p-3 rounded-full transition-all cursor-pointer ${
        isListening
          ? 'bg-red-500 text-white animate-pulse shadow-lg'
          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
      }`}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      title={isListening ? 'Listening... click to stop' : `Click to speak (${lang})`}
    >
      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  );
}