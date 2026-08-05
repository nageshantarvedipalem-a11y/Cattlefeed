# Deploy (Hostinger Web Hosting)

This folder contains **Hostinger shared hosting** deployment helpers only.

| File / folder | Purpose |
|---------------|---------|
| `build-hostinger-frontend.sh` | Build frontend → `hostinger-public_html/` |
| `hostinger-public_html/.htaccess` | SPA routing for React (upload with every deploy) |
| `.env.production.example` | Backend env reference for Hostinger Node.js app |

## Build frontend for upload

```bash
BACKEND_URL=https://YOUR-BACKEND-URL bash deploy/build-hostinger-frontend.sh
```

Output goes to `deploy/hostinger-public_html/` — upload contents to Hostinger **`public_html`**.

## CI/CD

- **Frontend:** GitHub Actions → FTP → `public_html` (see `docs/GITHUB_ACTIONS_HOSTINGER.md`)
- **Backend:** Hostinger Node.js Web App → GitHub auto-deploy (see `docs/HOSTINGER_FULL_DEPLOY.md`)

## Docs

| Guide | When to use |
|-------|-------------|
| [HOSTINGER_FULL_DEPLOY.md](../docs/HOSTINGER_FULL_DEPLOY.md) | Full setup (frontend + backend on Hostinger) |
| [GITHUB_ACTIONS_HOSTINGER.md](../docs/GITHUB_ACTIONS_HOSTINGER.md) | GitHub Secrets & auto FTP deploy |
| [HOSTINGER_WEB_HOSTING.md](../docs/HOSTINGER_WEB_HOSTING.md) | Manual upload fallback |
