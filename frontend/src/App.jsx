import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Download, Search, Music, Film, Sun, Moon, Loader2, CheckCircle2,
  AlertCircle, ChevronDown, FileText, Clock, Eye, HardDrive, X
} from 'lucide-react'

const API_BASE = import.meta.env.PROD ? '' : ''

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatViews(n) {
  if (!n) return '0'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

// --- Theme Hook ---
function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dt-theme')
      if (stored) return stored === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.body.classList.toggle('dark-body', dark)
    localStorage.setItem('dt-theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, setDark]
}

// --- Components ---
function ThemeToggle({ dark, setDark }) {
  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 transition-all duration-200"
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={18} className="text-brand-500" /> : <Moon size={18} className="text-surface-600" />}
    </button>
  )
}

function FormatToggle({ format, setFormat }) {
  return (
    <div className="flex gap-2">
      {[
        { id: 'mp4', label: 'Video', icon: Film },
        { id: 'mp3', label: 'Audio', icon: Music },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setFormat(id)}
          className={`chip flex items-center gap-2 ${format === id ? 'chip-active' : 'chip-inactive'}`}
        >
          <Icon size={15} />
          <span>{label}</span>
          <span className="opacity-60 text-xs uppercase">.{id}</span>
        </button>
      ))}
    </div>
  )
}

function QualitySelector({ format, quality, setQuality, availableQualities }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const videoQ = ['auto', '1080', '720', '480', '360', '240', '144']
  const audioQ = ['auto', '320', '256', '192', '128', '64', '32']
  const options = format === 'mp4' ? videoQ : audioQ

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const label = quality === 'auto'
    ? 'Auto (Best fit)'
    : format === 'mp4' ? `${quality}p` : `${quality} kbps`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary flex items-center gap-2 text-sm w-full justify-between"
      >
        <span>Quality: {label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
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
  )
}

function VideoCard({ info }) {
  if (!info) return null
  return (
    <div className="glass-card p-4 animate-slide-up">
      <div className="flex gap-4">
        <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-200 dark:bg-surface-800">
          {info.thumbnail && (
            <img src={info.thumbnail} alt="" className="w-full h-full object-cover" />
          )}
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {formatDuration(info.duration)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2 mb-1">
            {info.title}
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">{info.channel}</p>
          <div className="flex items-center gap-3 text-xs text-surface-400">
            <span className="flex items-center gap-1"><Eye size={12} />{formatViews(info.view_count)}</span>
            <span className="flex items-center gap-1"><Clock size={12} />{formatDuration(info.duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusMessage({ status, taskData }) {
  if (!status) return null

  const progress = taskData?.progress || 0
  const speed = taskData?.speed || ''
  const eta = taskData?.eta || ''
  const totalSize = taskData?.total_size || ''

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
  }

  const cfg = configs[status]
  if (!cfg) return null
  const Icon = cfg.icon

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
  )
}

function TranscriptPanel({ transcript, onClose }) {
  if (!transcript) return null
  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <FileText size={16} /> Transcript
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto text-sm text-surface-600 dark:text-surface-400 leading-relaxed pr-2">
        {transcript}
      </div>
    </div>
  )
}

// --- Main App ---
export default function App() {
  const [dark, setDark] = useTheme()
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('mp4')
  const [quality, setQuality] = useState('auto')
  const [videoInfo, setVideoInfo] = useState(null)
  const [status, setStatus] = useState(null)
  const [taskData, setTaskData] = useState(null)
  const [taskId, setTaskId] = useState(null)
  const [transcript, setTranscript] = useState(null)
  const [error, setError] = useState(null)
  const pollingRef = useRef(null)

  // Clear state on URL change
  useEffect(() => {
    setVideoInfo(null)
    setStatus(null)
    setTaskData(null)
    setTaskId(null)
    setTranscript(null)
    setError(null)
  }, [url])

  // Poll download status
  useEffect(() => {
    if (!taskId) return
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status/${taskId}`)
        const data = await res.json()
        setTaskData(data)
        setStatus(data.status)
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(pollingRef.current)
        }
      } catch {
        clearInterval(pollingRef.current)
      }
    }, 800)
    return () => clearInterval(pollingRef.current)
  }, [taskId])

  const fetchInfo = useCallback(async () => {
    if (!url.trim()) return
    setError(null)
    setStatus('fetching')
    try {
      const res = await fetch(`${API_BASE}/api/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to fetch info')
      }
      const data = await res.json()
      setVideoInfo(data)
      setStatus(null)
    } catch (e) {
      setError(e.message)
      setStatus(null)
    }
  }, [url])

  const startDownload = useCallback(async () => {
    if (!url.trim()) return
    setError(null)
    setStatus('starting')
    try {
      const res = await fetch(`${API_BASE}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format, quality: quality === 'auto' ? null : quality }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to start download')
      }
      const data = await res.json()
      setTaskId(data.task_id)
      setStatus('starting')
    } catch (e) {
      setError(e.message)
      setStatus(null)
    }
  }, [url, format, quality])

  const downloadFile = useCallback(() => {
    if (!taskId) return
    const link = document.createElement('a')
    link.href = `${API_BASE}/api/file/${taskId}`
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [taskId])

  const fetchTranscript = useCallback(async () => {
    if (!url.trim()) return
    setStatus('transcript_loading')
    try {
      const res = await fetch(`${API_BASE}/api/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'No transcript available')
      }
      const data = await res.json()
      setTranscript(data.transcript)
      setStatus(taskId ? 'complete' : null)
    } catch (e) {
      setError(e.message)
      setStatus(taskId ? 'complete' : null)
    }
  }, [url, taskId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchInfo()
  }

  const isValidUrl = url.match(/(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/)

  return (
    <div className="noise-overlay min-h-screen flex flex-col">
      {/* Decorative bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-brand-400/8 dark:bg-brand-400/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8">
            <rect width="32" height="32" rx="6" fill="#ff3b3b"/>
            <path d="M16 7v12m0 0l-5-5m5 5l5-5M10 24h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <h1 className="font-display font-bold text-lg tracking-tight">
            Download<span className="text-brand-500">Tube</span>
          </h1>
        </div>
        <ThemeToggle dark={dark} setDark={setDark} />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-2xl space-y-5 mt-8">
          {/* Hero */}
          <div className="text-center space-y-2 mb-8">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight">
              Download YouTube videos
            </h2>
            <p className="text-surface-500 dark:text-surface-400 font-body text-base">
              Paste a link, pick your format, and download. It's that simple.
            </p>
          </div>

          {/* URL Input */}
          <div className="glass-card p-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste YouTube URL here..."
                className="input-field border-0 bg-transparent focus:ring-0"
              />
              <button
                onClick={fetchInfo}
                disabled={!isValidUrl || status === 'fetching'}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                {status === 'fetching'
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Search size={18} />
                }
                <span className="hidden sm:inline">Fetch</span>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm animate-fade-in">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
            </div>
          )}

          {/* Video Info */}
          {videoInfo && <VideoCard info={videoInfo} />}

          {/* Controls */}
          {videoInfo && (
            <div className="glass-card p-5 space-y-4 animate-slide-up">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="block text-[11px] font-display font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Format</label>
                  <FormatToggle format={format} setFormat={setFormat} />
                </div>
                <div className="w-full sm:w-48 space-y-2">
                  <label className="block text-[11px] font-display font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Quality</label>
                  <QualitySelector
                    format={format}
                    quality={quality}
                    setQuality={setQuality}
                    availableQualities={videoInfo?.available_qualities}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={startDownload}
                  disabled={!isValidUrl || ['starting', 'downloading'].includes(status)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {['starting', 'downloading'].includes(status)
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Download size={18} />
                  }
                  {status === 'downloading' ? 'Downloading...' : status === 'starting' ? 'Starting...' : 'Download'}
                </button>
                <button
                  onClick={fetchTranscript}
                  disabled={status === 'transcript_loading'}
                  className="px-5 py-4 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 font-display font-medium text-sm rounded-xl border border-surface-200 dark:border-surface-700 transition-all duration-200 flex items-center gap-2"
                  title="Get transcript"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">Transcript</span>
                </button>
              </div>

              <p className="text-xs text-surface-400 dark:text-surface-500 text-center">
                Max file size: 450 MB · Quality auto-adjusts to fit
              </p>
            </div>
          )}

          {/* Status */}
          {status && !['fetching', 'transcript_loading'].includes(status) && (
            <StatusMessage status={status} taskData={taskData} />
          )}

          {/* Download button when ready */}
          {status === 'complete' && taskId && (
            <button
              onClick={downloadFile}
              className="w-full btn-primary flex items-center justify-center gap-3 py-5 text-lg animate-slide-up"
            >
              <Download size={22} />
              Save {taskData?.format === 'mp4' ? 'Video' : 'Audio'} · {taskData?.size_mb} MB
            </button>
          )}

          {/* Transcript */}
          {transcript && (
            <TranscriptPanel transcript={transcript} onClose={() => setTranscript(null)} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-xs text-surface-400 dark:text-surface-600 font-body">
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
