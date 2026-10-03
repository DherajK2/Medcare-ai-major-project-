import { useState } from 'react';
import type { ChatMessage as MsgType } from '../../types/conversation';
import { SourceCitation } from './SourceCitation';
import { cn } from '../../utils/cn';
import { Volume2, VolumeX, Copy, Check, AlertTriangle, PhoneCall, MessageCircle, Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: MsgType;
  onOpenEmergencyDispatch?: (symptom: string) => void;
  onSpeak?: (text: string) => void;
  isPlayingAudio?: boolean;
}

function renderTextWithLinks(text: string, isUser: boolean) {
  // Regex to match phone numbers like +91 80629 70067, 0821-2566666, 0821-2335168, 1800 102 4647, +91 98866 06395, 1860-500-1066
  const phoneRegex = /(\+91[\s\-]?\d{3,5}[\s\-]?\d{3,5}|\b0821[\s\-]?\d{6,7}\b|\b1800[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b|\b1860[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b|\+91\s*\d{10})/g;
  
  const subparts = text.split(phoneRegex);
  if (subparts.length === 1) return text;

  return subparts.map((sub, j) => {
    if (phoneRegex.test(sub)) {
      phoneRegex.lastIndex = 0;
      const cleanTel = sub.replace(/[^\d+]/g, '');
      return (
        <a
          key={j}
          href={`tel:${cleanTel}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded transition-colors underline decoration-blue-400 underline-offset-2",
            isUser ? "text-white bg-blue-700/40 hover:bg-blue-700/60" : "text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100"
          )}
          title={`Call ${sub}`}
        >
          <PhoneCall size={12} className="shrink-0" />
          <span>{sub}</span>
        </a>
      );
    }
    return <span key={j}>{sub}</span>;
  });
}

function renderInlineFormatted(text: string, isUser: boolean) {
  // Splits by **bold**, *italic*, `code`
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className={isUser ? "font-bold text-white" : "font-semibold text-gray-900"}>
          {renderTextWithLinks(inner, isUser)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      const inner = part.slice(1, -1);
      return (
        <em key={i} className={isUser ? "italic text-blue-100" : "italic text-gray-700"}>
          {renderTextWithLinks(inner, isUser)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code key={i} className={cn(
          "px-1.5 py-0.5 rounded text-xs font-mono font-medium",
          isUser ? "bg-blue-700/60 text-white" : "bg-gray-100 text-blue-700"
        )}>
          {inner}
        </code>
      );
    }
    return <span key={i}>{renderTextWithLinks(part, isUser)}</span>;
  });
}

function renderMessageBody(content: string, isUser: boolean) {
  const lines = content.split('\n');
  return (
    <div className="font-normal space-y-2">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-0.5" />;
        }

        // Bullet point lines
        if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
          const cleanText = line.replace(/^[•\-\*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 py-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full mt-2 shrink-0", isUser ? "bg-blue-200" : "bg-blue-500")} />
              <span className={cn("leading-relaxed text-sm", isUser ? "text-white" : "text-gray-800")}>
                {renderInlineFormatted(cleanText, isUser)}
              </span>
            </div>
          );
        }

        // Numbered list items: "1. 💊 Metformin..."
        const numMatch = line.match(/^(\d+)\.\s*(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 py-1">
              <span className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5",
                isUser ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-700"
              )}>
                {numMatch[1]}
              </span>
              <span className={cn("leading-relaxed text-sm", isUser ? "text-white" : "text-gray-800")}>
                {renderInlineFormatted(numMatch[2], isUser)}
              </span>
            </div>
          );
        }

        // Section Headers
        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
          const title = line.replace(/^#+\s*/, '');
          return (
            <h4 key={idx} className={cn("font-bold text-sm pt-1 pb-0.5", isUser ? "text-white" : "text-gray-900 border-b border-gray-100")}>
              {renderInlineFormatted(title, isUser)}
            </h4>
          );
        }

        // Clinical Callout Highlights (Assistant only)
        if (!isUser) {
          if (line.includes('📋 Diagnosis') || line.includes('📋 ರೋಗನಿರ್ಣಯ') || line.includes('📋 निदान')) {
            return (
              <div key={idx} className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100/80 text-blue-950 text-sm">
                {renderInlineFormatted(line, isUser)}
              </div>
            );
          }

          if (line.includes('💊 Current Medications') || line.includes('💊 ಪ್ರಸ್ತುತ ಔಷಧಿಗಳು') || line.includes('💊 वर्तमान दवाएं')) {
            return (
              <div key={idx} className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100/80 text-indigo-950 text-sm">
                {renderInlineFormatted(line, isUser)}
              </div>
            );
          }

          if (line.includes('📊 Recent Vitals') || line.includes('📊 Latest') || line.includes('📊 ಇತ್ತೀಚಿನ Vitals') || line.includes('📊 हालिया Vitals')) {
            return (
              <div key={idx} className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100/80 text-emerald-950 text-sm">
                {renderInlineFormatted(line, isUser)}
              </div>
            );
          }

          if (line.includes('⚠️ Known Allergies') || line.includes('⚠️ Known Drug') || line.includes('⚠️ ಅಲರ್ಜಿಗಳು') || line.includes('⚠️ एलर्जी')) {
            return (
              <div key={idx} className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-sm font-medium">
                {renderInlineFormatted(line, isUser)}
              </div>
            );
          }
        }

        // Standard line
        return (
          <p key={idx} className="leading-relaxed">
            {renderInlineFormatted(line, isUser)}
          </p>
        );
      })}
    </div>
  );
}

export function ChatMessage({
  message,
  onOpenEmergencyDispatch,
  onSpeak,
  isPlayingAudio = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isEmergency = message.isSafetyResponse === true || 
    (message.content.toLowerCase().includes('critical medical emergency') && !isUser);

  return (
    <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[88%] md:max-w-[80%] flex flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-5 py-3.5 text-sm leading-relaxed transition-all shadow-xs",
            isUser
              ? "bg-[#ffede2] text-[#22252a] font-normal border border-[#ffd5bf]"
              : isEmergency
              ? "bg-red-50 border border-red-200 text-red-950"
              : "bg-[#eef2ff] border border-[#dbeafe] text-[#1e2029]"
          )}
        >
          {/* Main Message Content */}
          {renderMessageBody(message.content, isUser)}

          {/* Emergency SOS Quick Action Card */}
          {!isUser && isEmergency && onOpenEmergencyDispatch && (
            <div className="mt-3 pt-3 border-t border-red-200 bg-white/90 rounded-xl p-3 border space-y-2">
              <div className="flex items-center space-x-1.5 text-red-700 font-bold text-xs">
                <AlertTriangle size={15} />
                <span>Emergency Dispatch Ready</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => onOpenEmergencyDispatch("Acute Medical Distress / Urgent Care Needed")}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  <PhoneCall size={13} />
                  <span>Call Emergency</span>
                </button>
              </div>
            </div>
          )}

          {/* Sources */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-indigo-100 flex flex-wrap gap-2">
              {message.sources.map((s, i) => (
                <SourceCitation key={i} source={s} />
              ))}
            </div>
          )}
        </div>

        {/* Action bar below assistant message */}
        {!isUser && (
          <div className="flex items-center space-x-3 mt-1 px-1 text-gray-400 text-xs">
            {onSpeak && (
              <button
                onClick={() => onSpeak(message.content)}
                className="flex items-center space-x-1 hover:text-blue-600 transition-colors p-0.5"
                title="Play natural voice"
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX size={13} className="text-blue-600" />
                    <span className="text-[11px] text-blue-600 font-medium animate-pulse">Playing...</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={13} />
                    <span className="text-[11px]">Listen</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 hover:text-gray-700 transition-colors p-0.5"
              title="Copy text"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
