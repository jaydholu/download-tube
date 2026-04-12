# DownloadTube

A clean, modern YouTube downloader web app. Paste a link, pick your format, and download.

## Features

- **Video download** (MP4) — quality cascade: 1080p → 720p → 480p → 360p → 240p → 144p
- **Audio download** (MP3) — quality cascade: 320kbps → 256 → 192 → 128 → 64 → 32kbps
- **Real-time progress** — live percentage, download speed, ETA, and file size streamed from yt-dlp
- **Smart size management** — 450 MB cap with automatic quality degradation
- **Quality selector** — pick a specific quality or let auto mode find the best fit
- **Transcript extraction** — fetch auto-generated English subtitles as plain text
- **Auto cleanup** — downloaded files are deleted from the server 5 minutes after being served
- **Dark / Light mode** — respects system preference, toggleable
- **Responsive** — works on desktop and mobile

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11 · FastAPI · yt-dlp · uvicorn |
| Frontend | React 18 · Tailwind CSS 3 · Vite 6 |
| Fonts | Outfit · Source Sans 3 · JetBrains Mono |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- ffmpeg (`apt install ffmpeg` / `brew install ffmpeg` / `choco install ffmpeg`)
- yt-dlp (`pip install yt-dlp`) — keep updated with `pip install --upgrade yt-dlp`

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

## Cloud Deployment Note

YouTube aggressively blocks datacenter/cloud IP addresses (AWS, Render, GCP, etc.) with bot detection. This app works best when run locally on a residential IP. If you want to deploy it on a server, you would need either a residential proxy or to provide YouTube cookies — refer to the [yt-dlp wiki](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#youtube) for details.

## Project Structure

```
downloadtube/
├── backend/
│   ├── main.py               # FastAPI app, yt-dlp integration, progress streaming
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React SPA (all components)
│   │   ├── index.css          # Tailwind directives + custom styles
│   │   └── main.jsx           # React entry point
│   ├── public/
│   │   └── favicon.svg
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
| `POST` | `/api/transcript` | Extract English auto-generated subtitles |

## License

For personal use only.
