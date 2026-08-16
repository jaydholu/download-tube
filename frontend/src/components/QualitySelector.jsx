import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { QUALITIES_BY_FORMAT } from '../constants/qualities';

export function QualitySelector({ format, quality, setQuality, availableQualities, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const options = QUALITIES_BY_FORMAT[format] || QUALITIES_BY_FORMAT.mp4;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = quality === 'auto' ? 'Auto (Best fit)' : format === 'mp4' ? `${quality}p` : `${quality} kbps`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`btn-secondary flex items-center gap-2 justify-between ${compact ? 'text-xs' : 'text-sm w-full'}`}
      >
        <span>{label}</span>
        <ChevronDown size={compact ? 12 : 14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 glass-card p-1.5 animate-fade-in">
          {options.map(q => {
            const isAvailable = q === 'auto' || format === 'mp3' || !availableQualities?.length || availableQualities.includes(q)
            return (
              <button
                key={q}
                onClick={() => { setQuality(q); setOpen(false) }}
                disabled={!isAvailable}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  quality === q
                    ? 'bg-brand-500 text-white'
                    : isAvailable
                    ? 'hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300'
                    : 'text-surface-400 dark:text-surface-600 cursor-not-allowed'
                }`}
              >
                {q === 'auto' ? 'Auto (Best fit)' : format === 'mp4' ? `${q}p` : `${q} kbps`}
              </button>
            )
          })}
        </div>
      )}
    </div>
  );
}
