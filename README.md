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
- **Smart size management** — 450 MB cap per file with automatic quality degradation.
- **Quality selector** — pick a specific quality or let auto mode find the best fit (hidden for Instagram, which only ever exposes one quality).
- **Transcript extraction** — fetch auto-generated English subtitles as plain text, with a one-click copy button (YouTube only).
- **Auto cleanup** — downloaded files are deleted from the server 5 minutes after being served.
- **Dark / Light mode** — respects system preference, toggleable
- **Responsive** — works on desktop and mobile.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11+ · FastAPI · yt-dlp · uvicorn |
| Frontend | React 18 · Tailwind CSS 3 · Vite 6 |
| Cloud YouTube bot mitigation | Node.js · [bgutil-ytdlp-pot-provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider) (Render deployment only — see below) |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- ffmpeg (`apt install ffmpeg` / `brew install ffmpeg` / `choco install ffmpeg`)
- yt-dlp (`pip install yt-dlp`) — keep updated with `pip install --upgrade yt-dlp`
- Cookie files, for reliable Instagram support and cloud-deployed YouTube support — see [Cookies](#cookies-instagram--youtube) below

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

## Cookies (Instagram & YouTube)

Both platforms can rate-limit or bot-block anonymous requests from a datacenter IP (Render) even when everything works fine locally on a residential connection. The fix is the same for both: an authenticated session's cookies, exported and supplied to the backend.

**Why this mostly matters for cloud deployment:** your home IP gets treated far more leniently than a server's IP. Instagram usually needs cookies for any reliable datacenter access; YouTube can often work anonymously for a while and then start failing with "Sign in to confirm you're not a bot" once traffic looks automated.

For each platform you want reliable cloud access to:

1. **Use a secondary/throwaway account, not your main one.** A server hitting these endpoints doesn't look like a phone, and heavier-than-normal traffic is exactly what triggers account flags.
2. Log into that account in a browser, then export its session with yt-dlp itself:
   ```bash
   yt-dlp --cookies-from-browser firefox --cookies cookies_instagram.txt https://www.instagram.com/
   yt-dlp --cookies-from-browser firefox --cookies cookies_youtube.txt https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
   Use a real video URL for the YouTube export, not the bare homepage. Swap `firefox` for whichever browser you're actually logged in with — Chrome-based browsers can fail here (`Could not copy Chrome cookie database`) since Chrome 127 locks/encrypts its cookie store in a way `--cookies-from-browser` often can't get past. Firefox's cookie storage doesn't have this issue; a cookies-export browser extension (e.g. "Get cookies.txt LOCALLY") is a reliable alternative if you're stuck on Chrome/Brave.
3. **Filter each file down to just that platform's cookies** before using it anywhere — the raw export contains your entire browser's cookie jar across every site you're logged into, not just the one you exported for:
   ```powershell
   Get-Content cookies_instagram.txt | Where-Object { $_ -match '^#' -or $_ -match 'instagram\.com' } | Set-Content cookies_instagram.txt
   ```
   (adjust the domain match for the YouTube export similarly)
4. **Local development** — drop the filtered file at `backend/cookies_instagram.txt` / `backend/cookies_youtube.txt` (already covered by `.gitignore`; never commit these, they grant full account access).
5. **Render deployment** — upload each as a [Secret File](https://render.com/docs/configure-environment-variables#secret-files), named exactly `cookies_instagram.txt` / `cookies_youtube.txt`. They become available at `/etc/secrets/...` at runtime, which `config.py` checks first, falling back to the local path above.

If no cookie file is present for a platform, requests are still attempted anonymously and may work some of the time — you're just more exposed to rate-limiting/bot-detection errors, especially from a cloud IP.

## YouTube Bot Detection & the PO Token Provider

This deployment also includes [bgutil-ytdlp-pot-provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider) — `build.sh` builds it, and `render.yaml`'s start command runs it alongside the backend. It supplies yt-dlp with a "Proof of Origin" token intended to make cloud-IP traffic look more legitimate to YouTube.

Worth knowing going in: **the project's own maintainers currently say PO tokens no longer reliably bypass YouTube's bot check in most cases.** It's an active, ongoing arms race, and this is one tool in it, not a guaranteed fix. It's left running since it's harmless and may help at the margins, but the [cookies setup above](#cookies-instagram--youtube) is the actually-reliable fix. If you hit "Sign in to confirm you're not a bot" on a deployed instance, cookies are the fix to reach for — not further PO-token debugging.

## Deploying to Render

`render.yaml` and `build.sh` are already configured for a one-click Blueprint deploy on Render's free tier:

1. **Push to GitHub.** `.gitignore` already excludes what shouldn't be committed (cookie files, `backend/static`, `node_modules`).
2. **Connect the repo on Render**, then use **New + → Blueprint** (not a manual Web Service) — Render detects `render.yaml` automatically and provisions exactly what's defined there.
3. **Upload cookie files as Secret Files** once the service exists — Environment tab → Secret Files → add `cookies_instagram.txt` and/or `cookies_youtube.txt`. This can't live in `render.yaml` itself, since secrets shouldn't be committed to git.
4. **Wait for the first build.** `build.sh` installs ffmpeg, backend deps, force-updates yt-dlp, builds the PO token provider, then builds the frontend and copies it into `backend/static`. Expect a few minutes on the first run.
5. **Test the live URL** — hit `/api/health` first (also what Render itself polls for its health check), then try a real download on each platform.

Free-tier behavior worth expecting going in: services spin down after 15 minutes idle, with a ~30–60s cold start on the next request — normal, not a bug. The filesystem is ephemeral (wiped on every restart/redeploy), which doesn't matter here since downloaded files are meant to be temporary anyway. Secret Files are the exception — Render re-mounts them from its own secret store on every boot, so cookies only need uploading once, not on every deploy.

## Project Structure

```
download-tube/
├── backend/
│   ├── main.py                         # FastAPI app, routes, lifespan startup/cleanup
│   ├── downloader.py                   # yt-dlp orchestration (info / download / transcript)
│   ├── models.py                       # Pydantic request models + URL validation
│   ├── config.py                       # Paths, size limits, quality ladders, cookie paths
│   ├── utils.py                        # Platform detection, cookie flags, filename sanitization
│   ├── requirements.txt                # Python dependencies
│   ├── cookies_instagram.txt           # you create this — gitignored, see Cookies above
│   ├── cookies_youtube.txt             # you create this — gitignored, see Cookies above
│   └── static/                         # built frontend output — generated at build time, gitignored
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
├── render.yaml                         # Render Blueprint — service, build/start commands, health check
├── build.sh                            # ffmpeg + deps + PO token provider + frontend build, in one script
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
