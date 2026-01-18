# API Server (src)

## 📌 Purpose
This folder contains the Express server bootstrap and application-wide middleware for the Keeper Platform backend.

## 🧱 Key Files
- `index.ts` – server entry-point, route mounting, global middleware & error handling.
- `api/` – sub-routers grouped by domain (debug, kip, domains, etc.).
- `middleware/` – Express middleware used globally or in routes.

## 🔄 Data & Behavior
The server loads environment variables, configures CORS, JSON parsing, domain routing, and mounts the API sub-routers. It also defines global error and 404 handlers. All debugging routes are now delegated to `api/debug` and mounted in `index.ts`.

## ⚠️ Notes & ToDo
- [ ] Restrict debug routes to Admin role once role-based auth is added.
- [ ] Implement rate-limiting for high-verbosity endpoints.
- [ ] Consolidate startup console logging via a helper.

## 📆 Update Log
- 2025-07-17: Unified debug routing via `api/debug` and added folder README. (by Cursor)
- 2026-01-17: Expanded CORS allowed headers in the API bootstrap to support moment draft headers.
