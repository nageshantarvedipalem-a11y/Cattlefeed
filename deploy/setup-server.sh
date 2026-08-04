#!/bin/bash
# ============================================================
# Hostinger VPS — first-time setup for Cattle Feed ERP
# Run on Ubuntu 22.04/24.04 VPS as root or with sudo
# Usage: bash deploy/setup-server.sh
# ============================================================
set -euo pipefail

APP_DIR="/var/www/cattlefeed"
REPO_URL="${REPO_URL:-https://github.com/nageshantarvedipalem-a11y/Cattlefeed.git}"
DOMAIN="${DOMAIN:-YOUR_DOMAIN}"

echo "==> Updating system packages..."
apt update && apt upgrade -y

echo "==> Installing Node.js 20..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
node -v
npm -v

echo "==> Installing Nginx, Git, PM2..."
apt install -y nginx git
npm install -g pm2

echo "==> Creating app directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -d ".git" ]; then
  git clone "$REPO_URL" .
else
  git pull origin main
fi

echo "==> Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --omit=dev

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT: Edit $APP_DIR/backend/.env with production values:"
  echo "   nano $APP_DIR/backend/.env"
  echo ""
fi

echo "==> Building frontend..."
cd "$APP_DIR/frontend"
npm ci
cat > .env.production <<EOF
VITE_API_BASE_URL=/api/cattlefeed/v1
VITE_APP_NAME=Cattle Feed ERP
VITE_API_PROJECT=cattlefeed
EOF
npm run build

echo "==> Configuring Nginx..."
NGINX_CONF="/etc/nginx/sites-available/cattlefeed"
sed "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/deploy/nginx/cattlefeed.conf" > "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/cattlefeed
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl enable nginx
systemctl reload nginx

echo "==> Starting backend with PM2..."
cd "$APP_DIR"
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit backend env:  nano $APP_DIR/backend/.env"
echo "  2. Run DB migration:  cd $APP_DIR/backend && npm run db:setup"
echo "  3. Restart API:       pm2 restart cattlefeed-api"
echo "  4. Open in browser:   http://$DOMAIN"
echo "  5. Enable SSL:        certbot --nginx -d $DOMAIN"
echo ""
echo "Default login: admin / Admin@123  (change immediately!)"
