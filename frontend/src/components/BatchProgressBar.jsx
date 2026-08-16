export function BatchProgressBar({ completedCount, currentProgress, total }) {
  if (total <= 1)
    return null;

  const pct = Math.min(100, Math.round(((completedCount + currentProgress / 100) / total) * 100));

  return (
    <div className="glass-card px-4 py-3 space-y-2 animate-fade-in">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Overall progress</span>
        <span className="font-mono font-semibold text-brand-500 tabular-nums">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-surface-400 dark:text-surface-500">
        {completedCount} of {total} complete
      </p>
    </div>
  );
}
