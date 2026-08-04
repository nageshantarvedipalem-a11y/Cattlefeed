#!/bin/bash
# ============================================================
# Redeploy after code changes (run on Hostinger VPS)
# Usage: bash deploy/deploy.sh
# ============================================================
set -euo pipefail

APP_DIR="/var/www/cattlefeed"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Updating backend..."
cd "$APP_DIR/backend"
npm ci --omit=dev
pm2 restart cattlefeed-api

echo "==> Rebuilding frontend..."
cd "$APP_DIR/frontend"
npm ci
if [ ! -f ".env.production" ]; then
  cat > .env.production <<EOF
VITE_API_BASE_URL=/api/cattlefeed/v1
VITE_APP_NAME=Cattle Feed ERP
VITE_API_PROJECT=cattlefeed
EOF
fi
npm run build

echo "==> Reloading Nginx..."
if command -v nginx &>/dev/null; then
  nginx -t && systemctl reload nginx
elif command -v sudo &>/dev/null && sudo nginx -t 2>/dev/null; then
  sudo nginx -t && sudo systemctl reload nginx
else
  echo "nginx not found — skip reload"
fi

echo "✅ Deploy complete!"
pm2 status cattlefeed-api
