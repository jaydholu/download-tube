import { useState, useMemo, useEffect } from 'react';
import { HardDrive } from 'lucide-react';

import { useTheme } from './hooks/useTheme';
import { useBatchQueue } from './hooks/useBatchQueue';
import { useTranscript } from './hooks/useTranscript';
import { extractUrls } from './utils/platform';
import { MAX_BATCH_LINKS } from './constants/limits';

import { ThemeToggle } from './components/ThemeToggle';
import { Logo } from './components/Logo';
import { LinkInput } from './components/LinkInput';
import { SingleDownloadPanel } from './components/SingleDownloadPanel';
import { BatchPanel } from './components/BatchPanel';

export default function App() {
  const [dark, setDark] = useTheme();
  const [rawInput, setRawInput] = useState('');

  const allLinks = useMemo(() => extractUrls(rawInput), [rawInput]);
  const links = useMemo(() => allLinks.slice(0, MAX_BATCH_LINKS), [allLinks]);
  const truncatedCount = Math.max(0, allLinks.length - MAX_BATCH_LINKS);

  const queue = useBatchQueue(links);
  const transcript = useTranscript();

  const isSingle = links.length === 1;
  const isBatch = links.length > 1;
  const soleItem = isSingle ? queue.items[0] : null;

  // Reset the transcript panel when the single link itself changes.
  useEffect(() => { transcript.clear() }, [soleItem?.url]);

  return (
    <div className="noise-overlay min-h-screen flex flex-col">
      {/* Decorative bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-brand-400/8 dark:bg-brand-400/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <Logo className="w-8 h-8" />
          <h1 className="font-display font-bold text-lg tracking-tight">
            Download<span className="text-brand-500">Tube</span>
          </h1>
        </div>
        <ThemeToggle dark={dark} setDark={setDark} />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-3xl space-y-5 mt-8">
          {/* Hero */}
          <div className="text-center space-y-2 mb-8">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight">
              Download YouTube Videos & Instagram Reels
            </h2>
            <p className="text-surface-600 dark:text-surface-300 font-body text-base">
              Paste a link, pick your format, and download. It's that simple.
            </p>
          </div>

          <LinkInput
            rawInput={rawInput}
            setRawInput={setRawInput}
            links={links}
            truncatedCount={truncatedCount}
            onFetch={queue.fetchAllInfo}
            fetching={queue.fetchingAll}
            disabled={queue.downloadingBatch}
          />

          {isSingle && soleItem && (
            <SingleDownloadPanel
              item={soleItem}
              onDismissError={() => queue.updateItem(soleItem.id, { error: null })}
              globalFormat={queue.globalFormat}
              setGlobalFormat={queue.setGlobalFormat}
              globalQuality={queue.globalQuality}
              setGlobalQuality={queue.setGlobalQuality}
              onDownload={queue.downloadAll}
              downloading={queue.downloadingBatch}
              onSave={queue.saveItem}
              transcript={transcript}
            />
          )}

          {isBatch && <BatchPanel queue={queue} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-xs text-surface-500 dark:text-surface-500 font-body">
        <p>
          DownloadTube · For personal use only ·{' '}
          <span className="inline-flex items-center gap-1">
            <HardDrive size={10} />
            450 MB limit
          </span>
        </p>
      </footer>
    </div>
  )
}
