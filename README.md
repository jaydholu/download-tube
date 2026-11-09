# DownloadTube

A clean, modern downloader for YouTube Shorts and Instagram Reels. Paste one link — or several — pick your format, and download.

## Features

- **YouTube & Instagram** — download YouTube Shorts (video/audio) and Instagram Reels.
- **Automatic platform detection** — auto-detects platform from the pasted link, no manual mode switch.
- **Multi-link batch downloads** — paste up to 10 links at once (YouTube and Instagram mixed freely), downloaded one at a time so disk usage never exceeds a single file.
- **Global + per-link controls** — set format/quality once for the whole batch, or override any individual link.
- **Video download** (MP4) — quality cascade: 1080p → 720p → 480p → 360p → 240p → 144p
- **Audio download** (MP3) — quality cascade: 320kbps → 256 → 192 → 128 → 64 → 32kbps, with embedded cover art and, when the source has real music metadata (officially licensed/Content-ID videos), artist and album tags too
- **Real-time progress** — live percentage, download speed, ETA, and file size streamed from yt-dlp, plus an overall weighted progress bar across a batch.
- **No file size limit** — downloads stream straight to disk, so size is bounded only by free space in your system temp folder.
- **Quality selector** — pick a specific quality or let auto mode pick the best (Auto tops out at 1080p; hidden for Instagram, which only exposes one quality).
- **Transcript extraction** — YouTube: auto-generated English subtitles as plain text. Instagram Reels: the audio is transcribed by Groq's hosted Whisper API (free tier works, needs an API key — see [Groq setup](#groq-setup-instagram-transcripts)). One-click copy button. Single-link view only.
- **Auto cleanup** — downloaded files are deleted from the temp folder 5 minutes after being served.
- **Dark / Light mode** — respects system preference, toggleable
- **Responsive** — works on desktop and mobile.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11+ · FastAPI · yt-dlp · uvicorn |
| Frontend | React 18 · Tailwind CSS 3 · Vite 6 |
| Instagram transcripts | [Groq](https://console.groq.com) Whisper API via httpx |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- ffmpeg (`apt install ffmpeg` / `brew install ffmpeg` / `choco install ffmpeg`)
- yt-dlp (`pip install yt-dlp`) — keep updated with `pip install --upgrade yt-dlp`
- Instagram cookie file (needed for Reels) — see [Cookies](#cookies-instagram--youtube) below
- A free Groq API key (only for Instagram transcripts)

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Create `backend/.env` from the example and add your Groq key (see below):

```bash
cp .env.example .env
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The Vite dev server proxies `/api` requests to `localhost:8000` automatically.

## Groq setup (Instagram transcripts)

Instagram has no captions, so transcripts are generated from the audio with Whisper on Groq.

1. Create a free key at [console.groq.com/keys](https://console.groq.com/keys).
2. Put it in `backend/.env`:
   ```
   GROQ_API_KEY=your_key_here
   # Optional — force a language (ISO-639-1, e.g. hi, en) if auto-detect gets Hindi/Hinglish wrong
   GROQ_LANGUAGE=
   # Optional — whisper-large-v3 (default, most accurate) or whisper-large-v3-turbo (faster)
   GROQ_WHISPER_MODEL=whisper-large-v3
   ```
3. Restart the backend.

Audio is downsampled to mono 16 kHz MP3 before upload (~0.5 MB/min), which stays well under Groq's 25 MB free-tier upload cap. Free-tier limits are set by Groq and can change. Without a key, the Transcript button on a Reel shows a clear error; everything else works.

## Cookies (Instagram & YouTube)

Instagram needs a logged-in session to be reliable. YouTube usually works anonymously from a home connection, but a cookie file helps if you ever see "Sign in to confirm you're not a bot".

1. **Use a secondary/throwaway account, not your main one.**
2. Log into that account in a browser, then export its session with yt-dlp:
   ```bash
   yt-dlp --cookies-from-browser firefox --cookies cookies_instagram.txt https://www.instagram.com/
   yt-dlp --cookies-from-browser firefox --cookies cookies_youtube.txt https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
   Use a real video URL for the YouTube export. Swap `firefox` for your browser — Chrome-based browsers can fail (`Could not copy Chrome cookie database`) since Chrome 127; Firefox doesn't have this issue, and a cookies-export extension (e.g. "Get cookies.txt LOCALLY") is a reliable alternative. The `Unsupported URL` line for the bare Instagram homepage is harmless.
3. **Filter each file down to that platform's cookies** — the raw export contains your whole browser's cookie jar:
   ```powershell
   Get-Content cookies_instagram.txt | Where-Object { $_ -match '^#' -or $_ -match 'instagram\.com' } | Set-Content cookies_instagram.txt
   ```
4. Place them at `backend/cookies_instagram.txt` / `backend/cookies_youtube.txt`. Both are gitignored — never commit them, they grant full account access. Cookies expire; re-export if Instagram downloads or transcripts start failing.

> **Note on hosting:** this app is meant to run locally. YouTube blocks datacenter IPs (e.g. Render) with its bot check, even with cookies and PO tokens, so cloud deployment isn't supported. `render.yaml` and `build.sh` are leftovers from that attempt and are not used locally.

## Project Structure

```
download-tube/
├── backend/
│   ├── main.py                         # FastAPI app, routes, lifespan startup/cleanup
│   ├── downloader.py                   # yt-dlp orchestration (info / download / transcript)
│   ├── transcriber.py                  # Groq Whisper client for Instagram transcripts
│   ├── models.py                       # Pydantic request models + URL validation
│   ├── config.py                       # Paths, Groq settings, quality ladders, cookie paths
│   ├── utils.py                        # Platform detection, cookie flags, filename sanitization
│   ├── requirements.txt                # Python dependencies
│   ├── .env.example                    # copy to .env and add GROQ_API_KEY (.env is gitignored)
│   ├── cookies_instagram.txt           # you create this — gitignored, see Cookies above
│   ├── cookies_youtube.txt             # you create this — gitignored, see Cookies above
│   └── static/                         # built frontend output (only if you serve it from the backend), gitignored
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Top-level composition — header, hero, single/batch switch
│   │   ├── api/
│   │   │   └── client.js               # All backend fetch calls, in one place
│   │   ├── hooks/
│   │   │   ├── useTheme.js
│   │   │   ├── useTranscript.js
│   │   │   └── useBatchQueue.js        # Drives 1-to-N links through fetch → download → save
│   │   ├── components/
│   │   │   ├── Logo.jsx                # App logo — mirrors public/favicon.svg
│   │   │   ├── LinkInput.jsx           # Multi-link textarea with live platform badge
│   │   │   ├── SingleDownloadPanel.jsx # Rich single-link view (VideoCard + controls)
│   │   │   ├── BatchPanel.jsx          # Global controls + queue list for 2+ links
│   │   │   ├── QueueCard.jsx           # One card per queued link, with per-item overrides
│   │   │   ├── BatchProgressBar.jsx    # Weighted overall progress across a batch
│   │   │   ├── VideoCard.jsx           # Thumbnail + title/channel/stats
│   │   │   ├── StatusMessage.jsx       # Progress/status strip, reused per-item in batch mode
│   │   │   ├── FormatToggle.jsx        # Video/Audio format chips
│   │   │   ├── QualitySelector.jsx     # Quality dropdown
│   │   │   ├── PlatformBadge.jsx       # YouTube/Instagram icon, single + adaptive group
│   │   │   ├── TranscriptPanel.jsx     # Transcript display with copy-to-clipboard
│   │   │   └── ThemeToggle.jsx         # Dark/light toggle
│   │   ├── utils/
│   │   │   ├── platform.js             # detectPlatform, extractUrls
│   │   │   └── format.js               # formatDuration, formatViews
│   │   ├── constants/
│   │   │   ├── qualities.js
│   │   │   └── limits.js
│   │   ├── index.css                   # Tailwind directives + custom styles
│   │   └── main.jsx                    # React entry point
│   ├── public/
│   │   └── favicon.svg                 # Keep in sync with components/Logo.jsx if the logo changes
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── render.yaml                         # unused leftover from the Render attempt
├── build.sh                            # unused leftover from the Render attempt
├── .gitignore
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/info` | Fetch video metadata (title, thumbnail, duration, qualities) |
| `POST` | `/api/download` | Start a download task, returns `task_id` |
| `GET` | `/api/status/{id}` | Poll progress (percentage, speed, ETA, status) |
| `GET` | `/api/file/{id}` | Serve the downloaded file as attachment |
| `POST` | `/api/transcript` | YouTube: auto-generated English subtitles. Instagram: Whisper transcription via Groq. Returns `transcript` + `source` (`captions` / `whisper`) |

Multi-link batches don't have their own endpoints — the frontend calls these same four per link, sequentially for downloads so only one file is written to disk at a time.

## License

For personal use only.
