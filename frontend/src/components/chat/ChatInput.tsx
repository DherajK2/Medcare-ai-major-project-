import { useState } from 'react';
import { Send } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { VoiceButton } from '../voice/VoiceButton';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  lang?: string;
}

export function ChatInput({ onSend, disabled = false, lang = 'en-IN' }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    if (transcript.trim() && !disabled) {
      onSend(transcript);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
      <Input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type a health inquiry (or click mic to speak in English / ಕನ್ನಡ / हिन्दी)..."
        className="flex-1 bg-white text-sm py-2.5 rounded-xl border-gray-300 focus:border-blue-500 shadow-2xs"
        disabled={disabled}
      />
      <VoiceButton onTranscript={handleVoiceTranscript} lang={lang} />
      <Button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-xl px-4 py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold shadow-xs"
      >
        <Send size={15} className="mr-1.5" /> Send
      </Button>
    </form>
  );
}
