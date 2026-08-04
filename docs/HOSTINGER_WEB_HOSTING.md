# Hostinger Web Hosting Deployment (No VPS)

Your plan: **Web Hosting only** — no VPS, no PM2, no SSH root.

| Component | Where it runs |
|-----------|---------------|
| **Frontend** (React) | Hostinger `public_html` (static files) |
| **Backend** (Node.js API) | [Render.com](https://render.com) free tier |
| **Database** (MySQL) | Hostinger remote MySQL (already set up) |

Domain: **https://lightsteelblue-bison-593262.hostingersite.com**

---

## Architecture

```
Browser
  → lightsteelblue-bison-593262.hostingersite.com  (Hostinger public_html — React)
  → cattlefeed-api.onrender.com/api/cattlefeed/v1  (Render — Node.js backend)
  → srv674.hstgr.io                                (Hostinger MySQL)
```

---

## PART 1 — Allow remote MySQL (one time)

1. **hPanel → Databases → Remote MySQL**
2. Add host: **`%`** (allows Render to connect)  
   Or add Render's outbound IPs when known
3. Save

Your DB credentials (from backend `.env`):
- Host: `srv674.hstgr.io`
- Database: `u289260512_cattlefeed`
- User: `u289260512_cattlefeed`

---

## PART 2 — Deploy backend on Render (free)

### Step 1 — Create Render account
1. Go to **[render.com](https://render.com)** → Sign up with GitHub
2. Connect repo: **nageshantarvedipalem-a11y/Cattlefeed**

### Step 2 — Create Web Service
1. **New +** → **Web Service**
2. Select **Cattlefeed** repo
3. Settings:

| Setting | Value |
|---------|-------|
| Name | `cattlefeed-api` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type | **Free** |

### Step 3 — Environment variables

Add in Render dashboard:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5001` |
| `DB_HOST` | `srv674.hstgr.io` |
| `DB_PORT` | `3306` |
| `DB_USER` | `u289260512_cattlefeed` |
| `DB_PASSWORD` | your MySQL password |
| `DB_NAME` | `u289260512_cattlefeed` |
| `JWT_SECRET` | long random string |
| `CORS_ORIGIN` | `https://lightsteelblue-bison-593262.hostingersite.com` |
| `API_PROJECT_SLUG` | `cattlefeed` |
| `API_VERSION` | `v1` |

### Step 4 — Deploy
Click **Create Web Service**. Wait ~3–5 minutes.

Your API URL will be something like:
**`https://cattlefeed-api.onrender.com`**

Test: **`https://cattlefeed-api.onrender.com/api/cattlefeed/v1/health`**

### Step 5 — Database setup (first time)

In Render → your service → **Shell** tab:

```bash
npm run db:setup
```

Or run locally pointing to Hostinger MySQL (if not done already).

---

## PART 3 — Build frontend for Hostinger

On your **Mac** (replace with your Render URL):

```bash
cd "/Users/volksskatt/Desktop/Cattle feed"
BACKEND_URL=https://cattlefeed-api.onrender.com bash deploy/build-hostinger-frontend.sh
```

This creates ready-to-upload files in:
**`deploy/hostinger-public_html/`**

---

## PART 4 — Upload to Hostinger public_html

1. **hPanel → Websites → Manage** (your site)
2. **Files → File Manager**
3. Open **`public_html`**
4. **Delete** default Hostinger files (`default.php`, `index.html`, etc.)
5. **Upload** everything from `deploy/hostinger-public_html/`:
   - `index.html`
   - `assets/` folder
   - `favicon.svg`
   - `.htaccess` (important for React routing)

6. Open: **https://lightsteelblue-bison-593262.hostingersite.com**

You should see the **Cattle Feed ERP login page**.

Login: `admin` / `Admin@123` → change password immediately.

---

## PART 5 — CI/CD (optional, simplified)

### Frontend auto-build (GitHub Actions)
On push to `main`, build frontend artifact — you upload manually to Hostinger (File Manager has no API on basic plans).

### Backend auto-deploy
Render auto-deploys when you push to `main` (enable in Render → Settings → Auto-Deploy).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Default Hostinger page still shows | Delete old files in `public_html`; upload new build |
| Blank page | Check browser console; verify `VITE_API_BASE_URL` matches Render URL |
| CORS error | Set `CORS_ORIGIN=https://lightsteelblue-bison-593262.hostingersite.com` on Render |
| API 502 / slow | Render free tier sleeps after 15 min idle — first request takes ~30s |
| DB connection failed | Enable Remote MySQL `%` in hPanel; check DB credentials on Render |
| 404 on page refresh | Upload `.htaccess` file to `public_html` |

---

## Upgrade path (later)

When you need faster API (no sleep) or full control:
- Upgrade to **Hostinger VPS** → use `docs/HOSTINGER_DEPLOYMENT.md`
- Or upgrade Render to paid plan

---

## Quick checklist

- [ ] Remote MySQL enabled in hPanel
- [ ] Backend deployed on Render with env vars
- [ ] Health check returns OK
- [ ] Frontend built with correct `BACKEND_URL`
- [ ] Files uploaded to `public_html` including `.htaccess`
- [ ] Login works on live domain
