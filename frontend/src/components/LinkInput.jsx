import { useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { PlatformBadgeGroup } from './PlatformBadge';
import { MAX_BATCH_LINKS } from '../constants/limits';

const MAX_TEXTAREA_HEIGHT = 160;

export function LinkInput({ rawInput, setRawInput, links, truncatedCount, onFetch, fetching, disabled }) {
  const textareaRef = useRef(null);

  // Auto-grow: single-row height for the common one-link case, expanding as more lines are pasted/typed, capped with internal scroll.
  useEffect(() => {
    const el = textareaRef.current;

    if (!el)
      return;

    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [rawInput]);

  // Enter inserts a newline (needed to separate multiple links). Use Ctrl/Cmd + Enter as the fetch shortcut instead.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onFetch();
    }
  };

  const platforms = links.map(l => l.platform);

  return (
    <div className="glass-card p-2">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Paste a YouTube Short or Instagram Reel link — or several, one per line..."
            className="input-field border-0 bg-transparent focus:ring-0 pr-16 resize-none overflow-y-auto disabled:opacity-60"
          />

          <div className="absolute top-1/2 right-0 -translate-y-1/2 flex items-center pr-4 pointer-events-none">
            <div className={`transition-opacity duration-200 ${links.length ? 'opacity-100' : 'opacity-0'}`}>
              <PlatformBadgeGroup platforms={platforms} size={18} />
            </div>
          </div>
        </div>
        <button
          onClick={onFetch}
          disabled={disabled || !links.length || fetching}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          {fetching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          <span className="hidden sm:inline">Fetch</span>
        </button>
      </div>
      {(links.length > 1 || truncatedCount > 0) && (
        <div className="px-2 pt-2 text-xs text-surface-600 dark:text-surface-400">
          {links.length} link{links.length !== 1 ? 's' : ''} detected
          {truncatedCount > 0 && ` · +${truncatedCount} more ignored (max ${MAX_BATCH_LINKS})`}
        </div>
      )}
    </div>
  );
}
