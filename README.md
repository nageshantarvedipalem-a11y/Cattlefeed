# Cattle Feed ERP

Production-ready Billing, Inventory, Ledger & Accounting Management System for cattle feed retail businesses.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite), Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | MySQL 8.0+ |
| Auth | JWT, bcrypt |
| Hosting | Hostinger VPS |

## Phase 1 — Complete ✓

- [x] Database design documentation
- [x] ER diagram (Mermaid)
- [x] MySQL schema (22 tables with FK, indexes, constraints)
- [x] Seed data (roles, admin user, settings)
- [x] Backend initialization (Express, Helmet, CORS, Rate Limiting)
- [x] Frontend initialization (Vite, React, Tailwind CSS)
- [x] Project folder structure

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+

### 1. Database Setup

```bash
# Copy environment file
cp backend/.env.example backend/.env

# Edit backend/.env with your MySQL credentials

# Run migrations
cd backend
npm install
npm run db:setup
```

### 2. Start Backend

```bash
cd backend
npm run dev
# API: http://localhost:5001/api/cattlefeed/v1
# Health: http://localhost:5001/api/cattlefeed/v1/health
```

### 3. Start Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# App: http://localhost:5173
```

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Username | admin |
| Email | admin@cattlefeed.com |
| Password | Admin@123 |

> Change the default password immediately after first login (Phase 2).

## Project Structure

See [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) for complete directory layout.

## Database Documentation

- [Database Design](docs/DATABASE_DESIGN.md)
- [ER Diagram](docs/ER_DIAGRAM.md)
- [Schema SQL](backend/database/schema.sql)

## Development Phases

| Phase | Module | Status |
|-------|--------|--------|
| 1 | Database & Foundation | ✅ Complete |
| 2 | Authentication | ✅ Complete |
| 3 | User Management | ✅ Complete |
| 4 | Customers | ✅ Complete |
| 5 | Suppliers | ✅ Complete |
| 6 | Products | ✅ Complete |
| 7 | Stock Management | ✅ Complete |
| 8 | Billing (POS) | ✅ Complete |
| 9 | Ledger | ✅ Complete |
| 10 | Cash Book | ✅ Complete |
| 11 | Pending Payments | ✅ Complete |
| 12 | Profit | ✅ Complete |
| 13 | Reports | ✅ Complete |
| 14 | Dashboard Graphs | ✅ Complete |
| 15 | WhatsApp Integration | ✅ Complete |

## Deployment (Hostinger VPS)

- Full VPS guide: [docs/HOSTINGER_DEPLOYMENT.md](docs/HOSTINGER_DEPLOYMENT.md)
- **CI/CD pipeline setup: [docs/CI_CD_SETUP.md](docs/CI_CD_SETUP.md)**

After CI/CD is configured, every `git push` to `main` auto-deploys to your VPS.

## Security

- Helmet security headers
- Rate limiting on API endpoints
- CORS configuration
- Parameterized SQL queries (mysql2 prepared statements)
- bcrypt password hashing (cost factor 12)
- JWT authentication (Phase 2)
- Role-based access control (Phase 2)
- Environment variables for secrets

## License

Proprietary — All rights reserved.
# Cattlefeed
