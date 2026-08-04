#!/bin/bash
# ============================================================
# One-command Hostinger VPS install
# Run inside Hostinger Browser Terminal (hPanel → VPS → Terminal):
#
#   curl -fsSL https://raw.githubusercontent.com/nageshantarvedipalem-a11y/Cattlefeed/main/deploy/remote-install.sh | bash
#
# ============================================================
set -euo pipefail

DOMAIN="${DOMAIN:-lightsteelblue-bison-593262.hostingersite.com}"
APP_DIR="/var/www/cattlefeed"
REPO="https://github.com/nageshantarvedipalem-a11y/Cattlefeed.git"

echo "=========================================="
echo " Cattle Feed ERP — Auto Install"
echo " Domain: $DOMAIN"
echo "=========================================="

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (Hostinger Browser Terminal uses root by default)"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Node.js 20
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

apt-get install -y git nginx curl
npm install -g pm2

mkdir -p /var/www
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull origin main
else
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR/backend"
npm ci --omit=dev

if [ ! -f ".env" ]; then
  cp .env.example .env
  JWT=$(openssl rand -base64 48 | tr -d '\n')
  sed -i "s|NODE_ENV=development|NODE_ENV=production|" .env
  sed -i "s|CORS_ORIGIN=http://localhost:5173|CORS_ORIGIN=https://${DOMAIN}|" .env
  sed -i "s|JWT_SECRET=change_this_to_a_long_random_secret_key_in_production|JWT_SECRET=${JWT}|" .env
  sed -i "s|JWT_SECRET=local_dev_jwt_secret_change_in_production|JWT_SECRET=${JWT}|" .env
  echo ""
  echo "⚠️  Edit DB password in .env:"
  echo "   nano $APP_DIR/backend/.env"
  echo ""
fi

cd "$APP_DIR/frontend"
npm ci
cat > .env.production <<EOF
VITE_API_BASE_URL=/api/cattlefeed/v1
VITE_APP_NAME=Cattle Feed ERP
VITE_API_PROJECT=cattlefeed
EOF
npm run build

# Nginx
cat > /etc/nginx/sites-available/cattlefeed <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    root ${APP_DIR}/frontend/dist;
    index index.html;
    client_max_body_size 20M;

    location /api/cattlefeed/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)\$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/cattlefeed /etc/nginx/sites-enabled/cattlefeed
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl enable nginx
systemctl reload nginx

# PM2
cd "$APP_DIR"
pm2 delete cattlefeed-api 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# DB setup (non-fatal if already done)
cd "$APP_DIR/backend"
npm run db:setup 2>/dev/null || echo "DB setup skipped — configure .env and run: npm run db:setup"

pm2 restart cattlefeed-api

echo ""
echo "=========================================="
echo " ✅ INSTALL COMPLETE"
echo "=========================================="
echo " App:    http://${DOMAIN}"
echo " API:    http://${DOMAIN}/api/cattlefeed/v1/health"
echo ""
echo " NEXT (required if DB not configured):"
echo "   nano ${APP_DIR}/backend/.env"
echo "   # Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
echo "   cd ${APP_DIR}/backend && npm run db:setup"
echo "   pm2 restart cattlefeed-api"
echo ""
echo " SSL (optional):"
echo "   apt install certbot python3-certbot-nginx -y"
echo "   certbot --nginx -d ${DOMAIN}"
echo ""
echo " Login: admin / Admin@123  (change immediately!)"
echo "=========================================="
