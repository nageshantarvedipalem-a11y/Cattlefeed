#!/bin/bash
# Build frontend for Hostinger Web Hosting (static upload to public_html)
# Usage:
#   BACKEND_URL=https://your-api.onrender.com bash deploy/build-hostinger-frontend.sh
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-https://YOUR-BACKEND-URL.onrender.com}"
DOMAIN="${DOMAIN:-https://lightsteelblue-bison-593262.hostingersite.com}"
API_BASE="${BACKEND_URL%/}/api/cattlefeed/v1"
OUT_DIR="deploy/hostinger-public_html"

echo "Building frontend for Hostinger Web Hosting..."
echo "  API: $API_BASE"
echo "  Site: $DOMAIN"

cd frontend
npm ci
cat > .env.production <<EOF
VITE_API_BASE_URL=${API_BASE}
VITE_APP_NAME=Cattle Feed ERP
VITE_API_PROJECT=cattlefeed
EOF
npm run build

cd ..
mkdir -p "$OUT_DIR"
cp -r frontend/dist/* "$OUT_DIR/"
cp deploy/hostinger-public_html/.htaccess "$OUT_DIR/.htaccess" 2>/dev/null || cp deploy/hostinger-public_html/.htaccess "$OUT_DIR/"

echo ""
echo "✅ Build ready in: $OUT_DIR/"
echo ""
echo "Upload ALL files inside $OUT_DIR/ to Hostinger public_html:"
echo "  hPanel → Websites → Manage → File Manager → public_html"
echo "  Upload: index.html, assets/, favicon.svg, .htaccess"
echo ""
echo "Then open: $DOMAIN"
