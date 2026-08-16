import { FileText, X } from 'lucide-react';

export function TranscriptPanel({ transcript, onClose }) {
  if (!transcript)
    return null;

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <FileText size={16} /> Transcript
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto text-sm text-surface-600 dark:text-surface-400 leading-relaxed pr-2">
        {transcript}
      </div>
    </div>
  );
}
