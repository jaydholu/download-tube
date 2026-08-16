import { Download, Loader2, RotateCcw } from 'lucide-react';
import { PlatformBadge } from './PlatformBadge';
import { FormatToggle } from './FormatToggle';
import { QualitySelector } from './QualitySelector';
import { StatusMessage } from './StatusMessage';

export function QueueCard({ item, globalFormat, globalQuality, onFormatChange, onQualityChange, onResetToGlobal, onSave }) {
  const effectiveFormat = item.format === 'inherit' ? globalFormat : item.format;
  const effectiveQuality = item.quality === 'inherit' ? globalQuality : item.quality;
  const isCustom = item.format !== 'inherit' || item.quality !== 'inherit';
  const info = item.info;
  const isInstagram = item.platform === 'instagram';
  const showControls = info && item.phase !== 'complete';

  return (
    <div className="glass-card p-4 animate-slide-up space-y-3">
      <div className="flex gap-3">
        <div className="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-surface-200 dark:bg-surface-800">
          {info?.thumbnail ? (
            <img src={info.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 size={14} className="animate-spin text-surface-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-display font-semibold text-sm leading-snug line-clamp-1">
              {info?.title || item.url}
            </h4>
            <div className="flex-shrink-0 pt-0.5">
              <PlatformBadge platform={item.platform} size={22} />
            </div>
          </div>
          {info?.channel && (
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{info.channel}</p>
          )}
        </div>
      </div>

      {showControls && (
        <div className="flex items-center gap-2 flex-wrap">
          <FormatToggle format={effectiveFormat} setFormat={(f) => onFormatChange(item.id, f)} />
          <div className="w-32">
            {isInstagram ? (
              <div className="btn-secondary flex items-center text-xs text-surface-500 dark:text-surface-400 cursor-default">
                Best quality
              </div>
            ) : (
              <QualitySelector
                format={effectiveFormat}
                quality={effectiveQuality}
                setQuality={(q) => onQualityChange(item.id, q)}
                availableQualities={info?.available_qualities}
                compact
              />
            )}
          </div>
          {isCustom && (
            <button
              onClick={() => onResetToGlobal(item.id)}
              className="flex items-center gap-1 text-xs text-surface-400 hover:text-brand-500 transition-colors ml-auto"
              title="Reset to global settings"
            >
              <RotateCcw size={12} /> reset
            </button>
          )}
        </div>
      )}

      {item.phase && <StatusMessage status={item.phase} taskData={item.taskData} />}

      {item.phase === 'complete' && item.taskId && (
        <button
          onClick={() => onSave(item)}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm"
        >
          <Download size={16} />
          Save {item.taskData?.format === 'mp4' ? 'Video' : 'Audio'} · {item.taskData?.size_mb} MB
        </button>
      )}
    </div>
  )
}
