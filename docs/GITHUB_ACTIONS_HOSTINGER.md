# GitHub Actions — Hostinger Shared Hosting CI/CD

Production pipeline that **builds the Vite frontend** and **deploys `frontend/dist/` to Hostinger via FTP/FTPS** on every push to `main`.

---

## Folder structure (relevant parts)

```
Cattlefeed/
├── .github/
│   └── workflows/
│       ├── ci.yml              # PR + quality checks (lint, build test)
│       └── deploy.yml          # Build + FTP deploy to Hostinger (main branch)
├── frontend/
│   ├── public/
│   │   ├── .htaccess           # SPA routing (copied to dist on build)
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   ├── dist/                   # Build output (gitignored, uploaded by CI)
│   ├── package.json
│   ├── vite.config.js
│   └── .env.production.example
├── backend/                    # Not deployed by this workflow (use Render)
├── deploy/
│   └── hostinger-public_html/  # Manual upload fallback
└── docs/
    └── GITHUB_ACTIONS_HOSTINGER.md
```

---

## How deployment works

```
git push main (frontend/** changed)
        │
        ▼
GitHub Actions: deploy.yml
        │
        ├── checkout code
        ├── setup Node.js 20 (npm cache)
        ├── npm ci
        ├── npm run lint          ← fails → stop (no deploy)
        ├── npm run build         ← fails → stop (no deploy)
        ├── verify dist/index.html
        ├── FTP upload dist/      ← incremental (changed files only)
        └── curl SITE_URL         ← verify live site
```

**Incremental uploads:** [FTP-Deploy-Action](https://github.com/SamKirkland/FTP-Deploy-Action) stores `.ftp-deploy-sync-state.json` on the server and only uploads new/changed/deleted files after the first deploy.

---

## Two Hostinger servers — use the correct credentials

| Site | Domain | Deploy method | GitHub secrets |
|------|--------|---------------|----------------|
| **Frontend** | `lightsteelblue-bison-593262.hostingersite.com` | **This workflow** (FTP) | `FTP_*`, `REMOTE_DIR`, `SITE_URL` |
| **Backend** | `yellow-cobra-125039.hostingersite.com` | hPanel → Node.js Web App → Git redeploy | **Not used here** — no backend FTP in Actions |

> **530 Login incorrect** almost always means `FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` are from the **wrong site**. Open hPanel → **Websites → lightsteelblue-bison-593262 → FTP Accounts** and copy those credentials into GitHub Secrets — not the yellow-cobra backend site.

---

## Step 1 — Configure Hostinger FTP (frontend site only)

1. Log in to **[hpanel.hostinger.com](https://hpanel.hostinger.com)**
2. Open **Websites → lightsteelblue-bison-593262.hostingersite.com → Manage → FTP Accounts**
   - Do **not** use FTP from the yellow-cobra (backend) website
3. Create or note an FTP account:
   - **FTP Host:** e.g. `ftp.lightsteelblue-bison-593262.hostingersite.com` or IP
   - **Username:** e.g. `u289260512.youruser`
   - **Password:** set a strong password
   - **Port:** `21` (FTPS)
4. Find **Remote directory** for uploads:
   - Usually: `/public_html`
   - Or: `/domains/lightsteelblue-bison-593262.hostingersite.com/public_html`
5. Test with FileZilla (Protocol: **FTP - File Transfer Protocol**, Encryption: **Require explicit FTP over TLS**)

---

## Step 2 — Configure GitHub Secrets

Go to:  
**https://github.com/nageshantarvedipalem-a11y/Cattlefeed/settings/secrets/actions**

Click **New repository secret** for each:

| Secret | Required | Example |
|--------|----------|---------|
| `FTP_SERVER` | Yes | `82.25.125.53` or `ftp.lightsteelblue-bison-593262.hostingersite.com` |
| `FTP_USERNAME` | Yes | `u289260512.lightsteelblue-bison-593262.hostingersite.com` |
| `FTP_PASSWORD` | Yes | your FTP password |
| `FTP_PORT` | No | `21` (default) |
| `FTP_PROTOCOL` | No | `ftps` (recommended) or `ftp` |
| `REMOTE_DIR` | No | Leave empty or `/` for domain FTP users (see note below) |
| `VITE_API_BASE_URL` | Yes | `https://yellow-cobra-125039.hostingersite.com/api/cattlefeed/v1` |
| `SITE_URL` | No | `https://dineshcattlefeed.com` (must be the domain customers use) |
| `CUSTOM_DOMAIN_REMOTE_DIR` | No | Only if one FTP user can reach the domain folder (rare) |

> **REMOTE_DIR for lightsteelblue FTP:** If your FTP username is `u289260512.lightsteelblue-bison-593262.hostingersite.com`, login already opens **inside** `public_html`. Leave `REMOTE_DIR` **empty** or set it to **`/`** — do **not** use `/public_html` or `./` (deploy will fail).
>
> **REMOTE_DIR troubleshooting:** If Actions shows green but the live site does not change, your FTP path is wrong. In Hostinger File Manager, open the folder that contains `index.html` for your site, then set `REMOTE_DIR` to that FTP path. Common values:
> - `/` or empty — domain FTP account (username = `*.hostingersite.com`)
> - `/public_html/` — generic FTP account that starts above web root

### Critical: `dineshcattlefeed.com` is a different Hostinger website

DNS check (Oct 2026):

| Host | Server |
|------|--------|
| `dineshcattlefeed.com` | `147.79.69.30` / `91.108.106.161` |
| `yellow-cobra-125039…` (Node + new UI) | `147.79.69.86` |
| `lightsteelblue-bison…` (FTP deploy target) | different CDN IPs |

GitHub Actions FTP uploads to **lightsteelblue**. That does **not** update **dineshcattlefeed.com**. Secondary paths like `/domains/dineshcattlefeed.com/public_html` fail silently when the FTP user cannot see that folder.

**Pick one fix (any one):**

1. **Recommended — point the domain at yellow-cobra**  
   hPanel → Domains / Websites → assign `dineshcattlefeed.com` to the **yellow-cobra** Node.js website. The Node app already serves `backend/public` (`app-Tli-GHzS.js`). After DNS propagates, the domain matches every Git redeploy.

2. **FTP for the domain website**  
   hPanel → Websites → **dineshcattlefeed.com** → FTP Accounts → copy host/user/password into GitHub Secrets `FTP_*` (replace lightsteelblue credentials). Set `SITE_URL=https://dineshcattlefeed.com`. Re-run **Deploy Frontend**.

3. **Manual File Manager (fastest once)**  
   Unzip Desktop `cattlefeed-frontend-upload.zip` into that site’s `public_html` (replace `index.html` + `assets/`). Hard refresh.

Until `https://dineshcattlefeed.com/` serves the same `assets/app-….js` as yellow-cobra, deploy verify **fails on purpose**.

> Never commit passwords. Only store in GitHub Secrets.

### Optional: GitHub Environment

**Settings → Environments → New → `production`**

Add protection rules (required reviewers) for production deploys.

---

## Step 3 — Push workflow to GitHub

```bash
cd "/Users/volksskatt/Desktop/Cattle feed"
git add .github/workflows/ frontend/public/.htaccess docs/GITHUB_ACTIONS_HOSTINGER.md .gitignore
git commit -m "Add Hostinger FTP CI/CD pipeline for frontend"
git push origin main
```

---

## Step 4 — Verify deployment

1. **GitHub Actions tab** — workflow should show green ✅
2. Open your site:  
   `https://lightsteelblue-bison-593262.hostingersite.com`
3. Hard refresh: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)
4. Check login page loads (not Hostinger default page)
5. Open browser DevTools → Network → login should call your `VITE_API_BASE_URL`

### Manual workflow run (dry run)

**Actions → Deploy Frontend to Hostinger → Run workflow → dry_run: true**

Builds without uploading (tests CI without touching production).

---

## Rollback options

| Method | How |
|--------|-----|
| **Git revert (recommended)** | `git revert HEAD && git push origin main` → CI redeploys previous version |
| **Redeploy old commit** | Actions → Run workflow on earlier commit via branch reset |
| **Manual FTP** | Upload previous `frontend/dist/` from local build |
| **Hostinger backup** | hPanel → Backups → restore `public_html` snapshot |

There is no automatic rollback — revert in Git and push to trigger a new deploy.

---

## Speed optimizations

| Optimization | Implementation |
|--------------|----------------|
| npm cache | `actions/setup-node` with `cache: npm` |
| `npm ci` | Faster, reproducible installs vs `npm install` |
| Incremental FTP | Only changed files after first deploy |
| Path filters | Deploy only when `frontend/**` changes |
| Concurrency | Cancel in-progress deploy if new push arrives |
| No `node_modules` upload | Only `dist/` goes to FTP |

---

## Files ignored (not uploaded)

Handled by `.gitignore` + FTP exclude list:

- `node_modules/`
- `.env` / secrets
- `frontend/dist/` in git (built fresh in CI)
- `.git/`, `.DS_Store`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| FTP login failed | Check `FTP_SERVER`, username, password; try `FTP_PROTOCOL=ftp` |
| Wrong folder on server | Fix `REMOTE_DIR` — must be `public_html` path |
| Blank page | Check `VITE_API_BASE_URL`; rebuild with correct secret |
| 404 on page refresh | Ensure `.htaccess` is in `frontend/public/` |
| Old site still showing | Hard refresh; clear Hostinger cache in hPanel |
| Build fails on lint | Run `npm run lint` locally and fix |
| `VITE_API_BASE_URL` error | Add secret in GitHub Settings |

---

## Backend (separate server — not FTP deploy)

This workflow deploys **frontend only** to **lightsteelblue**.

The **backend** runs on **yellow-cobra-125039.hostingersite.com** via **Hostinger Node.js Web App** (GitHub connect in hPanel). Redeploy backend there after pushing backend changes — do not put yellow-cobra FTP credentials in `FTP_*` secrets.

Ensure backend `CORS_ORIGIN` matches the frontend domain.

---

## Security checklist

- [ ] All FTP/API credentials in GitHub Secrets only
- [ ] `.env` files in `.gitignore`
- [ ] Use FTPS (`FTP_PROTOCOL=ftps`)
- [ ] Rotate FTP password periodically
- [ ] Enable GitHub Environment protection for production
