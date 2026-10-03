import { ReactNode } from 'react';

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  title,
  maxWidth = 'max-w-lg'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: ReactNode; 
  title: string;
  maxWidth?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-slate-50/50 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors text-lg"
          >
            &times;
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}