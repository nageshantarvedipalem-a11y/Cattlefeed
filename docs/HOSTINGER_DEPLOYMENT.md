# Hostinger VPS Deployment Guide

Deploy **Cattle Feed ERP** (React frontend + Node.js backend + MySQL) on a Hostinger VPS.

## Architecture

```
Browser → Nginx (port 80/443)
            ├── /              → frontend/dist (React static files)
            └── /api/cattlefeed/ → Node.js backend (PM2, port 5001)
                                        └── MySQL (Hostinger remote DB)
```

## Requirements

| Item | Details |
|------|---------|
| Hostinger VPS | Ubuntu 22.04 or 24.04 recommended |
| Domain | Point A record to VPS IP |
| MySQL | Hostinger remote MySQL (already configured) |
| SSH access | Root or sudo user |

---

## Step 1 — Point domain to VPS

In **Hostinger hPanel → Domains → DNS**:

| Type | Name | Value |
|------|------|-------|
| A | `@` | Your VPS IP |
| A | `www` | Your VPS IP |

Wait 5–30 minutes for DNS propagation.

---

## Step 2 — SSH into VPS

```bash
ssh root@YOUR_VPS_IP
```

---

## Step 3 — One-command setup (automated)

```bash
export DOMAIN="yourdomain.com"
export REPO_URL="https://github.com/nageshantarvedipalem-a11y/Cattlefeed.git"
git clone https://github.com/nageshantarvedipalem-a11y/Cattlefeed.git /var/www/cattlefeed
cd /var/www/cattlefeed
bash deploy/setup-server.sh
```

---

## Step 4 — Configure production `.env`

```bash
nano /var/www/cattlefeed/backend/.env
```

Use your **Hostinger MySQL** credentials:

```env
NODE_ENV=production
PORT=5001
API_PROJECT_SLUG=cattlefeed
API_VERSION=v1

# Hostinger MySQL (from hPanel → Databases)
DB_HOST=srvXXXX.hstgr.io
DB_PORT=3306
DB_USER=u289260512_cattlefeed
DB_PASSWORD=your_db_password
DB_NAME=u289260512_cattlefeed
DB_CONNECTION_LIMIT=10

# Generate a strong random secret (32+ chars)
JWT_SECRET=your_long_random_production_secret_here
JWT_EXPIRES_IN=24h

# Your live domain (no trailing slash)
CORS_ORIGIN=https://yourdomain.com

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=v21.0

APP_NAME=Cattle Feed ERP
```

Save and restart:

```bash
pm2 restart cattlefeed-api
```

---

## Step 5 — Database setup (first time only)

```bash
cd /var/www/cattlefeed/backend
npm run db:setup
```

If the database already exists remotely, run only the WhatsApp migration:

```bash
mysql -h srvXXXX.hstgr.io -u u289260512_cattlefeed -p u289260512_cattlefeed < database/migrations/015_whatsapp_messages.sql
```

---

## Step 6 — Enable HTTPS (SSL)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot auto-renews. Update `CORS_ORIGIN` in `.env` to `https://yourdomain.com` after SSL.

---

## Step 7 — Verify deployment

| Check | URL |
|-------|-----|
| Frontend | `https://yourdomain.com` |
| API health | `https://yourdomain.com/api/cattlefeed/v1/health` |
| Login | `admin` / `Admin@123` — **change immediately** |

```bash
pm2 status                  # backend running
pm2 logs cattlefeed-api     # view logs
systemctl status nginx      # nginx running
```

---

## Redeploy after code changes

On the VPS:

```bash
cd /var/www/cattlefeed
bash deploy/deploy.sh
```

Or manually:

```bash
cd /var/www/cattlefeed
git pull origin main
cd backend && npm ci --omit=dev && pm2 restart cattlefeed-api
cd ../frontend && npm ci && npm run build
sudo systemctl reload nginx
```

---

## Manual setup (alternative)

### Install dependencies

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2
```

### Clone & build

```bash
git clone https://github.com/nageshantarvedipalem-a11y/Cattlefeed.git /var/www/cattlefeed
cd /var/www/cattlefeed/backend
cp .env.example .env   # then edit with production values
npm ci --omit=dev

cd /var/www/cattlefeed/frontend
cp .env.production.example .env.production
npm ci && npm run build
```

### Start backend

```bash
cd /var/www/cattlefeed
pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup
```

### Configure Nginx

```bash
# Replace YOUR_DOMAIN in the config file
sed 's/YOUR_DOMAIN/yourdomain.com/g' /var/www/cattlefeed/deploy/nginx/cattlefeed.conf \
  > /etc/nginx/sites-available/cattlefeed
ln -sf /etc/nginx/sites-available/cattlefeed /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## Firewall (recommended)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Backend port `5001` stays internal — only Nginx exposes 80/443.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 502 Bad Gateway | `pm2 restart cattlefeed-api` and check `pm2 logs` |
| CORS error | Set `CORS_ORIGIN=https://yourdomain.com` in backend `.env` |
| DB connection failed | Verify Hostinger MySQL host, user, password in `.env` |
| Blank page after login | Check browser console; ensure `VITE_API_BASE_URL=/api/cattlefeed/v1` |
| API 404 | Confirm Nginx proxy path matches `/api/cattlefeed/` |

---

## Hostinger shared hosting (not VPS)

Shared hosting usually **cannot** run Node.js PM2. Use **VPS** or **Hostinger Cloud** for this stack. MySQL on shared hosting can still be used as remote DB from VPS.

---

## Security checklist

- [ ] Change default admin password
- [ ] Strong `JWT_SECRET` in production
- [ ] Enable HTTPS (SSL)
- [ ] Never commit `.env` to Git
- [ ] Restrict MySQL remote access to VPS IP in Hostinger panel
- [ ] Keep `pm2` and system packages updated
