import { Download, FileText, Loader2, X } from 'lucide-react';
import { VideoCard } from './VideoCard';
import { FormatToggle } from './FormatToggle';
import { QualitySelector } from './QualitySelector';
import { StatusMessage } from './StatusMessage';
import { TranscriptPanel } from './TranscriptPanel';

export function SingleDownloadPanel({
  item, onDismissError,
  globalFormat, setGlobalFormat, globalQuality, setGlobalQuality,
  onDownload, downloading, onSave, transcript,
}) {
  if (!item)
    return null;

  const { url, platform, info, phase, taskId, taskData, error } = item;
  const isYoutube = platform === 'youtube';

  return (
    <>
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm animate-fade-in">
          <span>{error}</span>
          <button onClick={onDismissError} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {info && <VideoCard info={info} />}

      {info && (
        <div className="glass-card p-5 space-y-4 animate-slide-up">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="block text-[11px] font-display font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Format</label>
              <FormatToggle format={globalFormat} setFormat={setGlobalFormat} />
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <label className="block text-[11px] font-display font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Quality</label>
              {isYoutube ? (
                <QualitySelector
                  format={globalFormat}
                  quality={globalQuality}
                  setQuality={setGlobalQuality}
                  availableQualities={info?.available_qualities}
                />
              ) : (
                <div className="btn-secondary flex items-center text-sm text-surface-500 dark:text-surface-400 cursor-default">
                  Best available quality
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onDownload}
              disabled={downloading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {phase === 'downloading' ? 'Downloading...' : phase === 'starting' ? 'Starting...' : 'Download'}
            </button>
            <button
              onClick={() => transcript.fetchFor(url)}
              disabled={transcript.loading}
              className="px-5 py-4 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 font-display font-medium text-sm rounded-xl border border-surface-200 dark:border-surface-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-60"
              title="Get transcript"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Transcript</span>
            </button>
          </div>
        </div>
      )}

      {phase && phase !== 'fetching' && (
        <StatusMessage status={phase} taskData={taskData} />
      )}

      {phase === 'complete' && taskId && (
        <button
          onClick={() => onSave(item)}
          className="w-full btn-primary flex items-center justify-center gap-3 py-5 text-lg animate-slide-up"
        >
          <Download size={22} />
          Save {taskData?.format === 'mp4' ? 'Video' : 'Audio'} · {taskData?.size_mb} MB
        </button>
      )}

      {transcript.loading && (
        <StatusMessage
          status={isYoutube ? 'transcript_loading' : 'transcribing'}
          taskData={null}
        />
      )}
      {transcript.error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm animate-fade-in">
          <span>{transcript.error}</span>
        </div>
      )}
      {transcript.transcript && (
        <TranscriptPanel
          transcript={transcript.transcript}
          source={transcript.source}
          onClose={transcript.clear}
        />
      )}
    </>
  );
}
