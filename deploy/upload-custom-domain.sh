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
# Live site serves from FTP user's /public_html. Also sync domain docroots.
REMOTE_DIRS="${REMOTE_DIRS:-/public_html /domains/dineshcattlefeed.com/public_html /domains/www.dineshcattlefeed.com/public_html}"
FTP_PORT="${FTP_PORT:-21}"

: "${FTP_SERVER:?Set FTP_SERVER}"
: "${FTP_USERNAME:?Set FTP_USERNAME}"
: "${FTP_PASSWORD:?Set FTP_PASSWORD}"

if [ ! -f "$SOURCE_DIR/index.html" ]; then
  echo "Missing $SOURCE_DIR/index.html — run frontend build and copy into backend/public"
  exit 1
fi

BUNDLE=$(grep -oE 'assets/app-[A-Za-z0-9_-]+\.js' "$SOURCE_DIR/index.html" | head -1)
echo "Uploading $BUNDLE from $SOURCE_DIR -> $FTP_SERVER [$REMOTE_DIRS]"

python3 - "$SOURCE_DIR" "$FTP_SERVER" "$FTP_USERNAME" "$FTP_PASSWORD" "$FTP_PORT" $REMOTE_DIRS <<'PY'
import ftplib, pathlib, sys
source = pathlib.Path(sys.argv[1])
host, user, password, port = sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
targets = sys.argv[6:]
ftp = ftplib.FTP()
ftp.connect(host, port, timeout=90)
ftp.login(user, password)
ftp.set_pasv(True)
for target in targets:
    print("->", target)
    ftp.cwd(target)
    with open(source / "index.html", "rb") as f:
        ftp.storbinary("STOR index.html", f)
    for path in source.rglob("*"):
        if not path.is_file() or path.name == "index.html":
            continue
        rel = path.relative_to(source).as_posix()
        parent = "/".join(rel.split("/")[:-1])
        ftp.cwd(target)
        for part in [p for p in parent.split("/") if p]:
            try:
                ftp.cwd(part)
            except Exception:
                ftp.mkd(part)
                ftp.cwd(part)
        with open(path, "rb") as f:
            ftp.storbinary(f"STOR {path.name}", f)
ftp.quit()
print("FTP upload complete")
PY

echo "Upload finished. Checking live domain..."
sleep 3
LIVE=$(curl -sL -H 'Cache-Control: no-cache' "https://dineshcattlefeed.com/index.html?v=$(date +%s)" | grep -oE 'assets/app-[A-Za-z0-9_-]+\.js' | head -1 || true)
echo "Live bundle: ${LIVE:-none}"
if [ "$LIVE" = "$BUNDLE" ]; then
  echo "SUCCESS: dineshcattlefeed.com is serving $BUNDLE"
else
  echo "WARNING: domain still shows ${LIVE:-none}. Wrong FTP account/folder, or CDN cache."
  exit 2
fi
