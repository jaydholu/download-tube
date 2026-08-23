# DownloadTube

A clean, modern downloader for YouTube Shorts and Instagram Reels. Paste one link — or several — pick your format, and download.

## Features

- **YouTube & Instagram** — download YouTube Shorts (video/audio) and Instagram Reels.
- **Automatic Platform Detector** — auto-detects platform from the pasted link.
- **Multi-link batch downloads** — paste up to 10 links at once (YouTube and Instagram mixed freely), downloaded one at a time so disk usage never exceeds a single file.
- **Global + per-link controls** — set format/quality once for the whole batch, or override any individual link.
- **Video download** (MP4) — quality cascade: 1080p → 720p → 480p → 360p → 240p → 144p
- **Audio download** (MP3) — quality cascade: 320kbps → 256 → 192 → 128 → 64 → 32kbps
- **Real-time progress** — live percentage, download speed, ETA, and file size streamed from yt-dlp, plus an overall weighted progress bar across a batch.
- **Smart size management** — 450 MB cap per file with automatic quality degradation.
- **Quality selector** — pick a specific quality or let auto mode find the best fit (hidden for Instagram, which only ever exposes one quality).
- **Transcript extraction** — fetch auto-generated English subtitles as plain text (YouTube only).
- **Auto cleanup** — downloaded files are deleted from the server 5 minutes after being served.
- **Dark / Light mode** — respects system preference, toggleable
- **Responsive** — works on desktop and mobile.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11+ · FastAPI · yt-dlp · uvicorn |
| Frontend | React 18 · Tailwind CSS 3 · Vite 6 |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- ffmpeg (`apt install ffmpeg` / `brew install ffmpeg` / `choco install ffmpeg`)
- yt-dlp (`pip install yt-dlp`) — keep updated with `pip install --upgrade yt-dlp`
- An Instagram cookies file, for Instagram Reels support — see [Instagram Cookies](#instagram-cookies) below

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The Vite dev server proxies `/api` requests to `localhost:8000` automatically.

### Windows Note

The backend auto-detects Windows and applies the correct asyncio event loop policy. No manual config needed.

## Instagram Cookies

Unlike YouTube, Instagram requires an authenticated session to reliably fetch reels — anonymous requests get rate-limited quickly, especially from a cloud/datacenter IP. To enable Instagram support:

1. **Use a secondary/throwaway Instagram account, not your main one.** A server hitting Instagram's endpoints looks nothing like a phone, and can trigger checkpoints on the account behind it.
2. Log into that account in a browser, then export its session using yt-dlp itself:
   ```bash
   yt-dlp --cookies-from-browser chrome --cookies cookies_instagram.txt https://instagram.com
   ```
3. **Local development** — drop the file at `backend/cookies_instagram.txt` (already covered by `.gitignore`; never commit it, it grants full account access).
4. **Render deployment** — upload it as a [Secret File](https://render.com/docs/configure-environment-variables#secret-files) named `cookies_instagram.txt`. It becomes available at `/etc/secrets/cookies_instagram.txt` at runtime, which `config.py` checks first.

If no cookies file is present, Instagram links are still attempted anonymously and may occasionally work, but expect "login required / rate-limit reached" errors.

## Cloud Deployment Note

YouTube aggressively blocks datacenter/cloud IP addresses (AWS, Render, GCP, etc.) with bot detection. This app works best when run locally on a residential IP. If you want to deploy it on a server, you'd need either a residential proxy or to provide YouTube cookies — refer to the [yt-dlp wiki](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#youtube) for details. Instagram has the same issue, addressed by the cookies setup above.

## Project Structure

```
downloadtube/
├── backend/
│   ├── main.py                                    # FastAPI app, routes, progress streaming
│   ├── downloader.py                              # yt-dlp orchestration (info / download / transcript)
│   ├── models.py                                  # Pydantic request models + URL validation
│   ├── config.py                                  # Paths, size limits, quality ladders
│   ├── utils.py                                   # Platform detection, cookie flags, filename sanitization
│   ├── requirements.txt                           # Python dependencies
│   ├── cookies_instagram.txt                      # gitignore
│   └── cookies_youtube.txt                        # gitignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx                                # Top-level composition — header, hero, single/batch switch
│   │   ├── api/
│   │   │   └── client.js                          # All backend fetch calls in one place
│   │   ├── hooks/
│   │   │   ├── useTheme.js
│   │   │   ├── useTranscript.js
│   │   │   └── useBatchQueue.js                   # Drives 1-to-N links through fetch → download → save
│   │   ├── components/
│   │   │   ├── Logo.jsx                           # App logo — mirrors public/favicon.svg
│   │   │   ├── LinkInput.jsx                      # Multi-link textarea with live platform badge
│   │   │   ├── SingleDownloadPanel.jsx            # Rich single-link view (VideoCard + controls)
│   │   │   ├── BatchPanel.jsx                     # Global controls + queue list for 2+ links
│   │   │   ├── QueueCard.jsx                      # One card per queued link, with overrides
│   │   │   ├── BatchProgressBar.jsx               # Weighted overall progress across a batch
│   │   │   │
│   │   │   ├── StatusMessage.jsx                  # Presentational pieces
│   │   │   ├── FormatToggle.jsx                   # Presentational pieces
│   │   │   ├── QualitySelector.jsx                # Presentational pieces
│   │   │   ├── PlatformBadge.jsx                  # Presentational pieces
│   │   │   ├── TranscriptPanel.jsx                # Presentational pieces
│   │   │   ├── ThemeToggle.jsx                    # Presentational pieces
│   │   │   └── VideoCard.jsx                      # Presentational pieces
│   │   ├── utils/
│   │   │   ├── platform.js                        # detectPlatform, extractUrls
│   │   │   └── format.js                          # formatDuration, formatViews
│   │   ├── constants/
│   │   │   ├── qualities.js
│   │   │   └── limits.js
│   │   ├── index.css                              # Tailwind directives + custom styles
│   │   └── main.jsx                               # React entry point
│   ├── public/
│   │   └── favicon.svg                            # Keep in sync with components/Logo.jsx if the logo changes
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── .gitignore
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check + max file size |
| `POST` | `/api/info` | Fetch video metadata (title, thumbnail, duration, qualities) |
| `POST` | `/api/download` | Start a download task, returns `task_id` |
| `GET` | `/api/status/{id}` | Poll progress (percentage, speed, ETA, status) |
| `GET` | `/api/file/{id}` | Serve the downloaded file as attachment |
| `POST` | `/api/transcript` | Extract English auto-generated subtitles (YouTube only) |

Multi-link batches don't have their own endpoints — the frontend calls these same four per link, sequentially for downloads so at most one file is being written to disk at any moment.

## License

For personal use only.
