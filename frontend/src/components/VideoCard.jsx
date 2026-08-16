import { Eye, Clock } from 'lucide-react';
import { formatDuration, formatViews } from '../utils/format';

export function VideoCard({ info }) {
  if (!info)
    return null;

  const hasDuration = Boolean(info.duration);
  const hasViews = Boolean(info.view_count);

  return (
    <div className="glass-card p-4 animate-slide-up">
      <div className="flex gap-4">
        <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-200 dark:bg-surface-800">
          {info.thumbnail && (
            <img src={info.thumbnail} alt="" className="w-full h-full object-cover" />
          )}
          {hasDuration && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
              {formatDuration(info.duration)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2 mb-1">
            {info.title}
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">{info.channel}</p>
          {(hasViews || hasDuration) && (
            <div className="flex items-center gap-3 text-xs text-surface-400">
              {hasViews && (
                <span className="flex items-center gap-1"><Eye size={12} />{formatViews(info.view_count)}</span>
              )}
              {hasDuration && (
                <span className="flex items-center gap-1"><Clock size={12} />{formatDuration(info.duration)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
