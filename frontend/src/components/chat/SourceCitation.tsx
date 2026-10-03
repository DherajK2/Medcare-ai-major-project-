import type { SourceCitation as CitationType } from '../../types/conversation';
export function SourceCitation({ source }: { source: CitationType }) {
  return (
    <span className="inline-flex items-center px-2 py-1 bg-gray-50 text-xs text-gray-600 rounded border border-gray-200">
      📄 {source.title || source.document_type} ({source.document_date})
    </span>
  );
}