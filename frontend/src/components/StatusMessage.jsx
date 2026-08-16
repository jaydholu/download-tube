import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function StatusMessage({ status, taskData }) {
  if (!status)
    return null;

  const progress = taskData?.progress || 0;
  const speed = taskData?.speed || '';
  const eta = taskData?.eta || '';
  const totalSize = taskData?.total_size || '';

  const configs = {
    fetching: { icon: Loader2, color: 'text-blue-500', spin: true, msg: 'Fetching video info...' },
    starting: { icon: Loader2, color: 'text-brand-500', spin: true, msg: 'Starting download...' },
    downloading: {
      icon: Loader2, color: 'text-brand-500', spin: true,
      msg: `Downloading${taskData?.quality ? ` at ${taskData.quality}${taskData.format === 'mp4' ? 'p' : ' kbps'}` : ''}`
    },
    complete: {
      icon: CheckCircle2, color: 'text-emerald-500', spin: false,
      msg: `Ready — ${taskData?.quality} · ${taskData?.size_mb} MB`
    },
    failed: { icon: AlertCircle, color: 'text-red-500', spin: false, msg: taskData?.error || 'Download failed' },
    transcript_loading: { icon: Loader2, color: 'text-blue-500', spin: true, msg: 'Fetching transcript...' },
  };

  const cfg = configs[status];
  if (!cfg)
    return null;

  const Icon = cfg.icon;

  return (
    <div className="glass-card px-4 py-3 animate-fade-in space-y-2.5">
      <div className="flex items-center gap-3">
        <Icon size={18} className={`${cfg.color} flex-shrink-0 ${cfg.spin ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium flex-1">{cfg.msg}</span>
        {status === 'downloading' && progress > 0 && (
          <span className="text-sm font-mono font-semibold text-brand-500 tabular-nums">{progress}%</span>
        )}
      </div>
      {status === 'downloading' && (
        <>
          <div className="w-full h-2 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {(speed || eta || totalSize) && (
            <div className="flex items-center gap-3 text-xs text-surface-400 dark:text-surface-500 font-mono">
              {totalSize && <span>Size: {totalSize}</span>}
              {speed && <span>Speed: {speed}</span>}
              {eta && <span>ETA: {eta}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
