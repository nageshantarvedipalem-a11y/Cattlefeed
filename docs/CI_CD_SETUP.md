# CI/CD Pipeline — Step-by-Step Setup

Automated **CI** (build & test on every push) and **CD** (auto-deploy to Hostinger VPS on push to `main`).

---

## Overview

```
git push main
    │
    ├── CI workflow  → build backend + frontend (GitHub Actions)
    │
    └── CD workflow  → SSH to Hostinger VPS → deploy/deploy.sh
                              ├── git pull
                              ├── npm ci backend → pm2 restart
                              └── npm run build frontend → nginx reload
```

---

## PART A — One-time VPS setup (Hostinger server)

### Step 1 — Create / access VPS

1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com)
2. Open **VPS** (Ubuntu 22.04 or 24.04)
3. Note your **VPS IP address**
4. Point your domain **A record** to that IP

### Step 2 — SSH into VPS

```bash
ssh root@YOUR_VPS_IP
```

### Step 3 — Initial server setup

```bash
export DOMAIN="yourdomain.com"
git clone https://github.com/nageshantarvedipalem-a11y/Cattlefeed.git /var/www/cattlefeed
cd /var/www/cattlefeed
bash deploy/setup-server.sh
```

### Step 4 — Create production `.env` on server (NOT in Git)

```bash
nano /var/www/cattlefeed/backend/.env
```

Paste production values (Hostinger MySQL, JWT secret, domain):

```env
NODE_ENV=production
PORT=5001
API_PROJECT_SLUG=cattlefeed
API_VERSION=v1

DB_HOST=srv674.hstgr.io
DB_PORT=3306
DB_USER=u289260512_cattlefeed
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=u289260512_cattlefeed
DB_CONNECTION_LIMIT=10

JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET_HERE
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://yourdomain.com

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

APP_NAME=Cattle Feed ERP
```

```bash
cd /var/www/cattlefeed/backend
npm run db:setup
pm2 restart cattlefeed-api
```

### Step 5 — Enable HTTPS

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## PART B — SSH key for GitHub Actions

GitHub Actions needs SSH access to deploy. Do this **on your Mac** (local machine):

### Step 6 — Generate deploy key

```bash
ssh-keygen -t ed25519 -C "github-actions-cattlefeed" -f ~/.ssh/cattlefeed_deploy -N ""
```

This creates:
- Private key: `~/.ssh/cattlefeed_deploy` → goes to **GitHub Secrets**
- Public key: `~/.ssh/cattlefeed_deploy.pub` → goes to **VPS**

### Step 7 — Add public key to VPS

```bash
ssh-copy-id -i ~/.ssh/cattlefeed_deploy.pub root@YOUR_VPS_IP
```

Or manually on VPS:

```bash
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# paste contents of cattlefeed_deploy.pub
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
```

### Step 8 — Test SSH from your Mac

```bash
ssh -i ~/.ssh/cattlefeed_deploy root@YOUR_VPS_IP "cd /var/www/cattlefeed && git pull origin main"
```

If this works, GitHub Actions will work too.

---

## PART C — GitHub Secrets (CI/CD credentials)

### Step 9 — Open GitHub repository settings

1. Go to: https://github.com/nageshantarvedipalem-a11y/Cattlefeed
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each:

| Secret name | Value | Example |
|-------------|-------|---------|
| `VPS_HOST` | VPS IP or domain | `123.45.67.89` |
| `VPS_USER` | SSH username | `root` |
| `VPS_SSH_KEY` | Full private key content | paste entire `~/.ssh/cattlefeed_deploy` file |
| `VPS_PORT` | SSH port (Hostinger uses **65002**) | `65002` |
| `VPS_APP_DIR` | App path (optional) | `/var/www/cattlefeed` |
| `DEPLOY_HEALTH_URL` | Health check URL (optional) | `https://yourdomain.com/api/cattlefeed/v1/health` |

**Get private key content:**

```bash
cat ~/.ssh/cattlefeed_deploy
```

Copy everything including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`.

### Step 10 — (Optional) Create GitHub Environment

1. **Settings** → **Environments** → **New environment**
2. Name: `production`
3. Add protection rules if you want (e.g. require approval before deploy)

The CD workflow uses `environment: production`.

---

## PART D — Push CI/CD workflows to GitHub

### Step 11 — Commit and push workflow files

On your Mac, in the project folder:

```bash
cd "/Users/volksskatt/Desktop/Cattle feed"
git add .github/workflows/ docs/CI_CD_SETUP.md deploy/
git commit -m "Add GitHub Actions CI/CD pipeline for Hostinger deployment"
git push origin main
```

### Step 12 — Watch pipeline run

1. Go to: https://github.com/nageshantarvedipalem-a11y/Cattlefeed/actions
2. You should see:
   - **CI** — builds backend & frontend
   - **CD — Deploy to Hostinger VPS** — SSH deploy

Green check = success.

---

## PART E — Daily workflow (after setup)

Every time you push to `main`:

```bash
git add .
git commit -m "your changes"
git push origin main
```

GitHub Actions automatically:
1. Builds & validates code (CI)
2. SSHs to VPS and runs `deploy/deploy.sh` (CD)
3. Restarts backend + rebuilds frontend

---

## Manual deploy (fallback)

If CI/CD fails, deploy manually on VPS:

```bash
ssh root@YOUR_VPS_IP
cd /var/www/cattlefeed
bash deploy/deploy.sh
```

Or trigger deploy from GitHub:
**Actions** → **CD — Deploy to Hostinger VPS** → **Run workflow**

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Permission denied (publickey)` | Check `VPS_SSH_KEY` secret; verify public key on VPS |
| `host key verification failed` | Add `VPS_HOST` correctly; VPS must accept SSH |
| `git pull` fails on VPS | Ensure VPS has cloned repo; check git remote |
| `pm2: command not found` | Run `npm install -g pm2` on VPS |
| `nginx: command not found` | Run `apt install nginx -y` on VPS |
| CI fails on lint | Run `cd frontend && npm run lint` locally and fix |
| 502 after deploy | `pm2 logs cattlefeed-api` on VPS |
| CORS errors | Update `CORS_ORIGIN` in server `backend/.env` |

---

## Security checklist

- [ ] Never commit `backend/.env` to Git
- [ ] Use strong `JWT_SECRET` on production server only
- [ ] Deploy SSH key is **only** for GitHub Actions (separate from personal SSH key)
- [ ] Restrict VPS firewall: ports 22, 80, 443 only
- [ ] Change default admin password after first login
- [ ] Rotate GitHub secrets if key is exposed

---

## Files in this pipeline

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Build & lint on every push/PR |
| `.github/workflows/deploy.yml` | Auto-deploy to Hostinger on push to `main` |
| `deploy/deploy.sh` | Server-side deploy script |
| `deploy/setup-server.sh` | First-time VPS setup |
| `deploy/nginx/cattlefeed.conf` | Nginx config |
| `deploy/ecosystem.config.cjs` | PM2 config |
