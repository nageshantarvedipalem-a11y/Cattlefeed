# Cattle Feed ERP — Project Folder Structure

```
Cattle feed/
├── docs/
│   ├── DATABASE_DESIGN.md      # Database design documentation
│   └── ER_DIAGRAM.md           # Entity Relationship Diagram (Mermaid)
│
├── backend/
│   ├── config/
│   │   └── database.js         # MySQL connection pool configuration
│   ├── database/
│   │   ├── schema.sql          # Complete MySQL schema (22 tables)
│   │   ├── seed.sql            # Default roles, admin user, settings
│   │   └── migrate.js          # Database migration runner
│   ├── logs/                   # Application log files
│   ├── scripts/
│   │   └── hashPassword.js     # Utility to generate bcrypt hashes
│   ├── src/
│   │   ├── controllers/        # Route handlers (Phase 2+)
│   │   ├── helpers/            # Helper functions (Phase 2+)
│   │   ├── middlewares/
│   │   │   ├── errorHandler.js # Centralized error handling
│   │   │   └── rateLimiter.js  # API rate limiting
│   │   ├── models/             # Data models (Phase 2+)
│   │   ├── repositories/       # Database query layer (Phase 2+)
│   │   ├── routes/
│   │   │   └── health.routes.js
│   │   ├── services/           # Business logic (Phase 2+)
│   │   ├── utils/
│   │   │   ├── apiResponse.js  # Standard API response helpers
│   │   │   └── logger.js       # Winston logger
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server entry point
│   ├── uploads/                # Invoice PDFs, exports
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   └── common/         # Reusable UI components
    │   ├── context/            # React context (Phase 2+)
    │   ├── hooks/              # Custom hooks (Phase 2+)
    │   ├── layouts/            # Page layouts (Phase 2+)
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   └── LoginPage.jsx
    │   │   ├── dashboard/
    │   │   │   └── DashboardPage.jsx
    │   │   └── NotFoundPage.jsx
    │   ├── routes/
    │   │   ├── AppRoutes.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── services/
    │   │   ├── api.js          # Axios instance with interceptors
    │   │   └── healthService.js
    │   ├── styles/
    │   │   └── index.css       # Tailwind CSS + theme
    │   ├── utils/              # Utility functions (Phase 2+)
    │   ├── validations/        # Form validations (Phase 2+)
    │   └── main.jsx
    ├── .env.example
    ├── .gitignore
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Architecture Layers

### Backend (Clean Architecture)
```
Routes → Controllers → Services → Repositories → MySQL
                ↓
           Middlewares (Auth, Validation, Rate Limit)
```

### Frontend
```
Pages → Components → Services (API) → Backend
  ↓
Routes → Layouts → Context/Hooks
```

## Database Tables (22)

| # | Table | Purpose |
|---|-------|---------|
| 1 | roles | RBAC permissions |
| 2 | users | System users |
| 3 | password_reset_tokens | Forgot password |
| 4 | categories | Product categories |
| 5 | brands | Product brands |
| 6 | products | Product catalog |
| 7 | suppliers | Supplier master |
| 8 | customers | Customer master |
| 9 | purchases | Stock-in entries |
| 10 | purchase_items | Purchase line items |
| 11 | sales | POS invoices |
| 12 | sale_items | Sale line items |
| 13 | sale_payments | Split payments |
| 14 | payments | Payment receipts |
| 15 | customer_ledger | Customer accounts |
| 16 | cash_book | Cash transactions |
| 17 | expenses | Business expenses |
| 18 | stock_movements | Stock history |
| 19 | settings | App configuration |
| 20 | activity_logs | Audit trail |
| 21 | notifications | In-app alerts |
