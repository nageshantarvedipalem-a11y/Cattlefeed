# Project Folder Structure

```
Cattlefeed/
├── .github/workflows/
│   ├── ci.yml                 # Lint & build test (PR + main)
│   └── deploy.yml             # Frontend FTP deploy → Hostinger
│
├── backend/                   # Node.js Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── helpers/
│   │   ├── validators/
│   │   ├── templates/         # Invoice HTML/PDF
│   │   └── server.js
│   ├── database/              # schema.sql, migrations, seed
│   └── scripts/
│
├── frontend/                  # React + Vite + Tailwind
│   ├── public/                # Static assets + .htaccess
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── routes/
│   │   └── styles/
│   └── vite.config.js
│
├── deploy/                    # Hostinger deploy scripts
│   ├── build-hostinger-frontend.sh
│   └── hostinger-public_html/ # Build output (.htaccess kept in git)
│
└── docs/                      # Deployment & design docs
```

## Live hosting layout

| Hostinger site | Role |
|----------------|------|
| `lightsteelblue-…hostingersite.com` / `public_html` | Frontend (React static) |
| `yellow-cobra-…hostingersite.com` | Backend (Node.js Web App) |
| MySQL `srv674.hstgr.io` | Database |
