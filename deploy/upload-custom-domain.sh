#!/usr/bin/env bash
# Upload the latest frontend build to dineshcattlefeed.com via FTP.
#
# Usage (from repo root):
#   FTP_SERVER=... FTP_USERNAME=... FTP_PASSWORD=... bash deploy/upload-custom-domain.sh
#
# Optional:
#   FTP_PORT=21
#   FTP_PROTOCOL=ftp|ftps
#   REMOTE_DIR=/          # use / when the FTP user already opens inside public_html
#   SOURCE_DIR=backend/public
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="${SOURCE_DIR:-$ROOT/backend/public}"
REMOTE_DIR="${REMOTE_DIR:-/}"
FTP_PORT="${FTP_PORT:-21}"
FTP_PROTOCOL="${FTP_PROTOCOL:-ftp}"

: "${FTP_SERVER:?Set FTP_SERVER}"
: "${FTP_USERNAME:?Set FTP_USERNAME}"
: "${FTP_PASSWORD:?Set FTP_PASSWORD}"

if [ ! -f "$SOURCE_DIR/index.html" ]; then
  echo "Missing $SOURCE_DIR/index.html — run: npm run build:web"
  exit 1
fi

BUNDLE=$(grep -oE 'assets/app-[A-Za-z0-9_-]+\.js' "$SOURCE_DIR/index.html" | head -1)
echo "Uploading $BUNDLE from $SOURCE_DIR -> ftp://$FTP_SERVER$REMOTE_DIR"

PROTOCOL_SETTINGS='set ftp:ssl-allow no;'
OPEN_URL="ftp://${FTP_SERVER}:${FTP_PORT}"
if [ "$FTP_PROTOCOL" = "ftps" ]; then
  PROTOCOL_SETTINGS='set ftp:ssl-force true; set ssl:verify-certificate no;'
  OPEN_URL="ftps://${FTP_SERVER}:${FTP_PORT}"
fi

case "$REMOTE_DIR" in
  */) ;;
  *) REMOTE_DIR="${REMOTE_DIR}/" ;;
esac

cd "$SOURCE_DIR"
lftp -c "
  ${PROTOCOL_SETTINGS}
  set ftp:passive-mode true;
  set net:max-retries 8;
  set net:timeout 60;
  set net:connection-limit 1;
  set cmd:fail-exit true;
  open -u '${FTP_USERNAME}','${FTP_PASSWORD}' ${OPEN_URL};
  mirror -R --verbose --parallel=1 --no-perms --exclude-glob index.html ./ ${REMOTE_DIR};
  put -O ${REMOTE_DIR} index.html;
  bye
"

echo "Upload finished. Checking live domain..."
sleep 3
LIVE=$(curl -sL -H 'Cache-Control: no-cache' "https://dineshcattlefeed.com/index.html?v=$(date +%s)" | grep -oE 'assets/app-[A-Za-z0-9_-]+\.js' | head -1 || true)
echo "Live bundle: ${LIVE:-none}"
if [ "$LIVE" = "$BUNDLE" ]; then
  echo "SUCCESS: dineshcattlefeed.com is serving $BUNDLE"
else
  echo "WARNING: domain still shows ${LIVE:-none}. Wrong FTP account/folder, or CDN cache. Try REMOTE_DIR=/domains/dineshcattlefeed.com/public_html"
  exit 2
fi
