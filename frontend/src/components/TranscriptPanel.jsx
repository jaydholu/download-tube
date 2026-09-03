import { useState } from 'react';
import { FileText, X, Copy, Check } from 'lucide-react';

export function TranscriptPanel({ transcript, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!transcript)
    return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
    } catch {
      
    }
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <FileText size={16} /> Transcript
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors text-xs font-medium text-surface-600 dark:text-surface-400"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto text-sm text-surface-600 dark:text-surface-400 leading-relaxed pr-2">
        {transcript}
      </div>
    </div>
  );
}
