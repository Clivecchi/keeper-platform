# Keeper API

## 📌 Purpose
Express.js API server that handles authentication, user profile management, domain features, KIP agent operations, and core Keeper platform functionality.

## 🧱 Key Files
- `apps/api/src/index.ts` – Main Express server setup and route definitions
- `apps/api/src/middleware/authMiddleware.ts` – JWT authentication middleware
- `apps/api/src/api/debug.ts` – Runtime debug endpoints
- `apps/api/src/api/kip/` – KIP agent service endpoints
- `apps/api/package.json` – Dependencies and build scripts

## 🔄 Data & Behavior
The API server uses:
- **Express.js** for HTTP server and routing
- **Prisma** via `@keeper/database` for PostgreSQL interactions
- **jsonwebtoken** for JWT creation & verification
- **bcryptjs** for secure password hashing
- **Zod** for strict request validation
- **CORS** with dynamic origin checks

### Core Routes
- `POST /api/kam/auth/register` – Register new users, hash password, issue JWT
- `POST /api/kam/auth/login` – Login existing users, verify password, issue JWT
- `POST /api/kam/auth/logout` – Local logout helper (stateless)
- `PUT /api/users/:id` – Authenticated profile update (name, avatar)
- `GET /debug` – Comprehensive debug snapshot
- KIP Agent endpoints under `/api/kip/*`
- Domain management endpoints under `/api/domains/*`

## ⚠️ Notes & ToDo
- [ ] Enforce password strength & email verification
- [ ] Implement JWT refresh tokens
- [ ] Add rate-limiting on auth endpoints

## 📆 Update Log
- **2025-07-16**: Implemented secure authentication flow with bcryptjs password hashing and signed JWTs. Replaced placeholder login/register logic with full DB-backed implementation; profile updates now succeed with valid tokens. 