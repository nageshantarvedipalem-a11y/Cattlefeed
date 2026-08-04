# Cattle Feed ERP — Database Design Document

## Overview

This document describes the normalized MySQL database design for the Cattle Feed Billing, Inventory, Ledger & Accounting Management System. All business data is persisted exclusively in MySQL with foreign keys, indexes, constraints, and transactional integrity.

## Design Principles

- **Third Normal Form (3NF)** — No redundant data; derived values computed at query time where possible
- **Referential Integrity** — All relationships enforced via foreign keys with appropriate ON DELETE/UPDATE rules
- **Audit Trail** — Activity logs and stock movement history for full traceability
- **Double-Entry Style Ledger** — Customer ledger uses debit/credit with running balance
- **Atomic Transactions** — Billing, stock updates, ledger, and cash book updates occur in single transactions

## Entity Relationship Summary

| Entity | Purpose |
|--------|---------|
| `roles` | RBAC: Owner, Manager, Cashier |
| `users` | System users with role assignment |
| `password_reset_tokens` | Secure forgot-password flow |
| `categories` | Product categorization |
| `brands` | Product brand master |
| `products` | Product catalog with pricing and stock |
| `suppliers` | Supplier master data |
| `customers` | Customer master with credit limits |
| `purchases` | Stock-in / purchase entries |
| `purchase_items` | Line items for purchases |
| `sales` | POS invoices / bills |
| `sale_items` | Line items for sales with profit tracking |
| `sale_payments` | Split payment records per sale |
| `payments` | Customer payment receipts (pending balance) |
| `customer_ledger` | Customer account ledger entries |
| `cash_book` | Cash in/out, income, expense, transfers |
| `expenses` | Business expense tracking |
| `stock_movements` | Complete stock in/out history |
| `settings` | Application configuration |
| `activity_logs` | User action audit trail |
| `notifications` | In-app notifications |

## Key Relationships

```
roles ──< users
users ──< password_reset_tokens

categories ──< products
brands ──< products

suppliers ──< purchases
purchases ──< purchase_items >── products

customers ──< sales
customers ──< payments
customers ──< customer_ledger

sales ──< sale_items >── products
sales ──< sale_payments
sales ──< payments

products ──< stock_movements
products ──< purchase_items
products ──< sale_items

users ──< purchases (created_by)
users ──< sales (created_by)
users ──< payments (created_by)
users ──< cash_book (created_by)
users ──< activity_logs
```

## Profit Calculation Strategy

Profit is **not stored as a separate mutable table**. It is derived from `sale_items`:

```
profit = (selling_price × quantity) - (purchase_price × quantity) - discount
```

Aggregated profit views (daily/monthly/yearly) are computed via SQL queries against `sale_items` joined with `sales`. This ensures profit always reflects actual transaction data.

## Stock Management Strategy

- `products.current_stock` — Denormalized cache for fast lookups (updated atomically with transactions)
- `stock_movements` — Authoritative history of every stock change with reference to source document

Stock changes occur on:
1. **Purchase entry** → stock IN
2. **Sale/billing** → stock OUT
3. **Manual adjustment** → stock IN or OUT

## Ledger Strategy

Each customer transaction creates a `customer_ledger` entry:

| Type | Debit | Credit |
|------|-------|--------|
| Sale (credit bill) | Amount owed | — |
| Payment received | — | Amount paid |
| Opening balance (Dr) | Amount | — |
| Opening balance (Cr) | — | Amount |

Running balance is stored per entry for fast retrieval and PDF/Excel export.

## Cash Book Strategy

Every cash-affecting operation creates a `cash_book` entry:
- Sale payment (cash/UPI/card)
- Customer payment receipt
- Expense
- Manual cash in/out
- Bank transfer

## Index Strategy

- Primary keys on all tables (AUTO_INCREMENT)
- Unique indexes: `users.email`, `users.username`, `products.sku`, `products.barcode`, `sales.invoice_number`
- Composite indexes for common filters: `(sale_date)`, `(customer_id, transaction_date)`, `(product_id, created_at)`
- Foreign key indexes on all FK columns

## Security Considerations

- Passwords stored as bcrypt hashes only
- JWT secrets in environment variables
- No sensitive data in application logs
- Soft delete via `is_active` / `status` flags where appropriate

## Deployment Notes (Hostinger VPS)

- MySQL 8.0+ recommended
- Use InnoDB engine for all tables
- UTF8MB4 charset for full Unicode support
- Connection pooling via mysql2
- Regular automated backups recommended
