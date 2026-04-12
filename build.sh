#!/usr/bin/env bash
set -e

echo "=== Checking ffmpeg ==="
if ! command -v ffmpeg &> /dev/null; then
  echo "ffmpeg not found, installing..."
  apt-get update -qq && apt-get install -y -qq ffmpeg
else
  echo "ffmpeg found: $(ffmpeg -version | head -1)"
fi

echo "=== Installing backend dependencies ==="
cd backend
pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo "=== Force-installing latest yt-dlp + PO Token provider ==="
pip install --upgrade --force-reinstall --no-cache-dir yt-dlp
pip install --upgrade --no-cache-dir bgutil-ytdlp-pot-provider
echo "yt-dlp version: $(yt-dlp --version)"

echo "=== Setting up bgutil PO Token script ==="
# Clone the bgutil repo for the server/script component
BGUTIL_DIR="$HOME/bgutil-ytdlp-pot-provider"
rm -rf "$BGUTIL_DIR"
git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git "$BGUTIL_DIR"
cd "$BGUTIL_DIR/server"
npm install
npx tsc
cd /opt/render/project/src

echo "=== Verifying setup ==="
echo "Node.js: $(node --version)"
echo "bgutil dir: $(ls $HOME/bgutil-ytdlp-pot-provider/server/build/ 2>/dev/null || echo 'NOT FOUND')"

echo "=== Installing frontend dependencies ==="
cd frontend
npm ci --prefer-offline
npm run build
cd ..

echo "=== Moving frontend build to backend/static ==="
rm -rf backend/static
mkdir -p backend/static
cp -r frontend/dist/* backend/static/

echo "=== Build complete ==="
