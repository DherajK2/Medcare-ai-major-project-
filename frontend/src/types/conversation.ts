export interface SourceCitation {
  document_type: string;
  document_date: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  isSafetyResponse?: boolean;
  audioBase64?: string;
  intent?: string;
  timestamp: Date;
}