# GitHub Actions — Automatic frontend + backend deploy

Every push to `main` runs **Deploy Production** (`.github/workflows/deploy.yml`):

1. Build the React frontend  
2. Copy it into `backend/public/` and **git push** → Hostinger **yellow-cobra** Node app redeploys **API + UI**  
3. FTP to `dineshcattlefeed.com` when `DOMAIN_FTP_*` secrets are set  

---

## One-time setup so the **domain** auto-updates

`dineshcattlefeed.com` is currently a **different Hostinger website** than yellow-cobra. Git deploy alone updates yellow-cobra until you do **one** of these:

### Option A (recommended) — point domain at yellow-cobra

1. Open [hpanel.hostinger.com](https://hpanel.hostinger.com)  
2. **Websites** → open **yellow-cobra-125039** (Node.js)  
3. **Domains** → add / assign **dineshcattlefeed.com** (and www)  
4. Wait for DNS (often a few minutes)  

After that, every `git push` to `main` updates the domain automatically (Node serves `backend/public`).

### Option B — domain FTP for CI

1. hPanel → **Websites** → **dineshcattlefeed.com** → **FTP Accounts**  
2. Add GitHub secrets (repo → Settings → Secrets → Actions):

| Secret | Required | Example |
|--------|----------|---------|
| `DOMAIN_FTP_SERVER` | for Option B | FTP host or IP from that site |
| `DOMAIN_FTP_USERNAME` | for Option B | site FTP username |
| `DOMAIN_FTP_PASSWORD` | for Option B | FTP password |
| `DOMAIN_FTP_PORT` | no | `21` |
| `DOMAIN_FTP_PROTOCOL` | no | `ftp` or `ftps` |
| `VITE_API_BASE_URL` | **yes** | `https://yellow-cobra-125039.hostingersite.com/api/cattlefeed/v1` |
| `SITE_URL` | no | `https://dineshcattlefeed.com` |

Optional legacy: `FTP_*` (only if those credentials are for **dineshcattlefeed.com**, not lightsteelblue).

---

## What Hostinger must have connected

| Piece | Where | How it updates |
|-------|--------|----------------|
| **API + SPA** | yellow-cobra Node.js | GitHub repo connected in hPanel → auto redeploy on push |
| **Custom domain** | Option A or B above | Same Node site, or DOMAIN_FTP |

Confirm in hPanel → yellow-cobra → **Deployment** / Git: connected to `nageshantarvedipalem-a11y/Cattlefeed`, branch `main`.

---

## Day-to-day

```bash
git add .
git commit -m "Your change"
git push origin main
```

Then check **Actions** → **Deploy Production**.  
Success means yellow-cobra (and the domain, after Option A or B) serve the new `assets/app-….js`.

Hard refresh: `Cmd+Shift+R`.

---

## Verify

| URL | Expect |
|-----|--------|
| https://yellow-cobra-125039.hostingersite.com/payments | New UI after every deploy |
| https://dineshcattlefeed.com/payments | Same UI after Option A or B |

If yellow-cobra is new but the domain is old, finish Option A or B — CI will keep failing verify until the domain matches (on purpose).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Domain still old invoice list | Option A or B above; lightsteelblue FTP does **not** update the domain |
| Actions fails verify on domain | Domain not on yellow-cobra and no `DOMAIN_FTP_*` |
| Node not updating | hPanel → yellow-cobra → Redeploy; check Git webhook |
| 530 FTP login | Use FTP from **dineshcattlefeed.com**, not yellow-cobra |
| Infinite Actions loop | Commits use `[skip ci]` when syncing `backend/public` |

---

## Security

- Never commit FTP passwords  
- Store secrets only in GitHub Actions secrets  
- Rotate FTP passwords if they were shared in chat  
