# Deploy BOTH Frontend + Backend on Hostinger

Domain: **lightsteelblue-bison-593262.hostingersite.com**

| Part | How | Where |
|------|-----|-------|
| **Frontend** (React/Vite) | GitHub Actions → FTP | `public_html` |
| **Backend** (Node.js API) | Hostinger Node.js Web App | hPanel (Business/Cloud plan) |
| **Database** | Already configured | Hostinger MySQL remote |

---

## PART 1 — Frontend (FTP auto-deploy)

### Step 1: Add GitHub Secrets

Go to: **https://github.com/nageshantarvedipalem-a11y/Cattlefeed/settings/secrets/actions**

Add these secrets (**do NOT commit passwords to Git**):

| Secret name | Value |
|-------------|-------|
| `FTP_SERVER` | `82.25.125.53` |
| `FTP_USERNAME` | `u289260512.lightsteelblue-bison-593262.hostingersite.com` |
| `FTP_PASSWORD` | *(your FTP password)* |
| `FTP_PORT` | `21` |
| `FTP_PROTOCOL` | `ftps` |
| `REMOTE_DIR` | `/public_html` |
| `SITE_URL` | `https://lightsteelblue-bison-593262.hostingersite.com` |
| `VITE_API_BASE_URL` | *(set after Part 2 — backend URL)* |

> If `/public_html` fails, try: `/domains/lightsteelblue-bison-593262.hostingersite.com/public_html`

### Step 2: Trigger deploy

Push any change to `main`, or go to **Actions → Deploy Frontend to Hostinger → Run workflow**.

---

## PART 2 — Backend (Node.js Web App in hPanel)

> Requires **Business Web Hosting** or **Cloud** plan.  
> If you don't see "Node.js Web App" in hPanel, your plan may not support it — upgrade or use Render.com for backend.

### Step 1: Open Node.js in hPanel

1. Log in to **hpanel.hostinger.com**
2. **Websites → Add Website**
3. Select **Node.js Web App**
4. Choose **Import Git repository → Connect with GitHub**
5. Select repo: **nageshantarvedipalem-a11y/Cattlefeed**

### Step 2: Build settings

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Node.js version | `20` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Entry file | `src/server.js` |

### Step 3: Environment variables (hPanel → Web App → Environment)

```env
NODE_ENV=production
PORT=3000
API_PROJECT_SLUG=cattlefeed
API_VERSION=v1

DB_HOST=srv674.hstgr.io
DB_PORT=3306
DB_USER=u289260512_cattlefeed
DB_PASSWORD=your_mysql_password
DB_NAME=u289260512_cattlefeed
DB_CONNECTION_LIMIT=10

JWT_SECRET=generate_a_long_random_secret_32_chars_min
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://lightsteelblue-bison-593262.hostingersite.com

APP_NAME=Cattle Feed ERP
```

Generate JWT secret:
```bash
openssl rand -base64 48
```

### Step 4: Deploy

Click **Deploy**. Hostinger gives you a backend URL, e.g.:
`https://lightsteelblue-bison-593262.hostingersite.com` (if same site)
or a subdomain like `https://api-xxxxx.hostingersite.com`

### Step 5: Test backend

Open: `YOUR_BACKEND_URL/api/cattlefeed/v1/health`  
Should return JSON with `"status": "ok"`.

### Step 6: Database setup (first time)

In hPanel Web App → **Terminal** or run locally:
```bash
cd backend && npm run db:setup
```

---

## PART 3 — Connect frontend to backend

After backend is live, copy its full API base URL, e.g.:
`https://YOUR-BACKEND-URL/api/cattlefeed/v1`

### Update GitHub Secret

**Settings → Secrets → `VITE_API_BASE_URL`**  
Set to your backend API URL (example above).

### Rebuild frontend

Push a small change to `main`, or re-run **Deploy Frontend to Hostinger** workflow.

---

## PART 4 — Verify everything

| Check | URL |
|-------|-----|
| Frontend | https://lightsteelblue-bison-593262.hostingersite.com |
| Backend health | https://YOUR-BACKEND-URL/api/cattlefeed/v1/health |
| Login | `admin` / `Admin@123` |

---

## Architecture

```
User Browser
    │
    ├─► lightsteelblue-bison-593262.hostingersite.com
    │       └── public_html (React static — FTP deploy)
    │
    └─► Backend URL (Node.js Web App)
            └── /api/cattlefeed/v1 → Express API
                    └── MySQL (srv674.hstgr.io)
```

---

## If Node.js Web App is NOT available on your plan

Your plan may only support **static websites** (FTP). In that case:

| Component | Alternative |
|-----------|-------------|
| Frontend | Hostinger FTP (this guide Part 1) ✅ |
| Backend | Deploy on **Render.com** free (see `docs/HOSTINGER_WEB_HOSTING.md`) |

---

## Security

- ⚠️ **Change your FTP password** if you shared it in chat
- Never commit `.env` or passwords to GitHub
- Use GitHub Secrets for FTP credentials only
- Change default admin password after first login

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| FTP login failed | Try `FTP_PROTOCOL=ftp` instead of `ftps` |
| Default Hostinger page | Delete old files in `public_html`; re-run deploy |
| No Node.js option in hPanel | Upgrade to Business plan or use Render for backend |
| CORS error | Set `CORS_ORIGIN` to exact frontend URL on backend |
| API 404 | Check backend entry file is `src/server.js` |
| DB connection failed | Enable Remote MySQL `%` in hPanel → Databases |
