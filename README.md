# Northstar Inventory

An inventory and sales workspace based on the supplied Northstar dashboard prototype. The prototype remains at `../index.html`; this runnable application moves its visual language into Next.js and obtains business records from the Express API.

## Stack and structure

- `frontend/`: Next.js App Router, React, TypeScript, Tailwind CSS, responsive dashboard and CRUD screens.
- `backend/`: Express and TypeScript API, JWT authentication, Zod validation and Mongoose models.
- MongoDB is the source of truth for products, sales and inventory movements.

## Setup

1. Install Node.js 20+ and run MongoDB as a replica set (or use a MongoDB Atlas replica set). Transactions are required for sale and inventory writes. For local development, start `mongod` with `--replSet rs0`, then run `mongosh --eval "rs.initiate()"` once. The example URI already selects `rs0`.
2. Copy `.env.example` to `.env` in this directory and set `MONGODB_URI`, a unique `JWT_SECRET`, and unique development admin/staff credentials before seeding.
3. Run `npm run install:all` at this project root. Each app installs into its own directory to avoid workspace symlinks on Windows.
4. Create development admin/staff accounts and, if the workspace is empty, sample products, opening-stock movements, and sales: `npm run seed`. Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_STAFF_EMAIL`, and `SEED_STAFF_PASSWORD` in `.env`; the seed script has no fallback credentials. Seed business records are development-only and are inserted into MongoDB, not used as frontend fixtures.
5. Start both apps: `npm run dev`. Frontend: `http://localhost:3000`; API: `http://localhost:5000/api/health`.
6. Sign in with either seeded account. Customers can register from the storefront.

For separate processes, run `npm run dev` from `backend/` and `npm run dev` from `frontend/` in two terminals. For production use `npm run build` followed by `npm start` in each package directory.

## Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string. Use a replica set for transaction support. |
| `JWT_SECRET` | Long random signing secret. Never commit a real secret. |
| `PORT` | Express port (default 5000). |
| `NEXT_PUBLIC_API_URL` | Browser-facing API base URL (default `http://localhost:5000/api`). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Required when creating the initial administrator with the seed script. |
| `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` | Required when creating the initial staff account with the seed script. |

## API

All business endpoints require `Authorization: Bearer <token>` except login and health.

- Auth: `POST /api/auth/login`, `GET /api/auth/me`
- Products: `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id`
- Inventory: `GET /api/inventory`, `GET /api/inventory/low-stock`, `POST /api/inventory/adjustments`, `GET /api/inventory/movements`
- Sales: `POST /api/sales`, `GET /api/sales`, `GET /api/sales/:id`
- Dashboard: `GET /api/dashboard/summary`, `/sales-trend`, `/categories`, `/top-products`, `/stock-alerts`, `/recent-transactions`
- Reports: `GET /api/reports/sales`, `/profit`, `/products`, `/inventory`

Errors use `{ "success": false, "message": "..." }`. Product write/deactivation routes require ADMIN. Inventory adjustments and sales require a signed-in user. Sales validate every requested line before writes, then create the invoice, deduct stock and write movement records in a MongoDB transaction. Inventory adjustments use the same transaction boundary and reject stock-outs that would make inventory negative. Product deactivation is soft so invoice history remains readable.

## Synchronization and limitations

After a successful write the client reloads dashboard, product, sales and movement resources from the API. Refreshing the page also reloads persisted records. Multi-user push updates (Socket.IO), user-management UI, workspace switching, pagination, and CSV export are not implemented in this version. Invoice creation supports multiple product lines. “Manual adjustment” currently follows the stock-out behavior; inventory may not be set to an arbitrary absolute quantity. Authentication uses local storage; production deployment should move JWTs to secure HTTP-only cookies and configure a strict CORS origin.

## Verification performed

The implementation has not been connected to a configured MongoDB instance in this workspace. Database persistence, transaction rollback, role behavior and the end-to-end refresh scenario require a running MongoDB replica set and are not claimed as tested. Run the commands above and use the API health endpoint to confirm connectivity before operational use.
