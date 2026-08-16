import { Download, Loader2 } from 'lucide-react';
import { QueueCard } from './QueueCard';
import { FormatToggle } from './FormatToggle';
import { QualitySelector } from './QualitySelector';
import { BatchProgressBar } from './BatchProgressBar';

export function BatchPanel({ queue }) {
  const {
    items, globalFormat, setGlobalFormat, globalQuality, setGlobalQuality,
    downloadAll, downloadingBatch, setItemFormat, setItemQuality,
    resetItemToGlobal, saveItem, completedCount, currentProgress, total,
  } = queue;

  const anyInfoLoaded = items.some(it => it.info);
  const anyYoutube = items.some(it => it.platform === 'youtube');

  return (
    <div className="space-y-4">
      <div className="glass-card p-5 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-md">Apply to all</h3>
          <span className="text-xs text-surface-400">{items.length} links</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="block text-[11px] font-display font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Format</label>
            <FormatToggle format={globalFormat} setFormat={setGlobalFormat} />
          </div>
          <div className="w-full sm:w-48 space-y-2">
            <label className="block text-[11px] font-display font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Quality</label>
            {anyYoutube ? (
              <QualitySelector format={globalFormat} quality={globalQuality} setQuality={setGlobalQuality} />
            ) : (
              <div className="btn-secondary flex items-center text-sm text-surface-500 dark:text-surface-400 cursor-default">
                Best available quality
              </div>
            )}
          </div>
        </div>

        <button
          onClick={downloadAll}
          disabled={downloadingBatch || !anyInfoLoaded}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          {downloadingBatch ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {downloadingBatch ? 'Downloading batch...' : `Download all ${items.length} links`}
        </button>

        <p className="text-xs text-surface-400 dark:text-surface-500 text-center">
          Links download one at a time · 450 MB limit per file
        </p>
      </div>

      {downloadingBatch && (
        <BatchProgressBar completedCount={completedCount} currentProgress={currentProgress} total={total} />
      )}

      <div className="space-y-3">
        {items.map(item => (
          <QueueCard
            key={item.id}
            item={item}
            globalFormat={globalFormat}
            globalQuality={globalQuality}
            onFormatChange={setItemFormat}
            onQualityChange={setItemQuality}
            onResetToGlobal={resetItemToGlobal}
            onSave={saveItem}
          />
        ))}
      </div>
    </div>
  );
}
