# Keeper Platform

![CI](https://github.com/<username>/<repo>/actions/workflows/ci.yml/badge.svg)

A poetic digital space where people preserve what matters. This is the beginning of a life-centered UI.

## 🚀 Getting Started

This project contains a **React frontend** (for Vercel) and an **Express backend** (for Railway).

- **Frontend**: `React` `Vite` `TypeScript` `TailwindCSS` `Shadcn` `Framer Motion`
- **Backend**: `Express.js` `Prisma` `Zod` `PostgreSQL`

### Environment Setup

**⚠️ Security Note**: Never commit `.env` files to Git. They contain sensitive information.

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables:**
   - **Required:**
     - `DATABASE_URL`: Your PostgreSQL database URL
     - `JWT_SECRET`: A secure random string for JWT signing
   - **Optional (Redis):**
     - `DISABLE_REDIS`: Set to `true` to disable Redis (uses no-op adapter)
     - `REDIS_URL`: Your Redis connection URL (if Redis is enabled)
   - **Optional (Application):**
     - `NODE_ENV`: Environment mode (development/production/test)
     - `PORT`: Server port (default: 3001 development, 8080 production)
     - `LOG_LEVEL`: Logging level (error/warn/info/debug, default: info)
     - `ENABLE_REQUEST_LOGGING`: Enable detailed request logging (default: false)
     - `CORS_ORIGINS`: Allowed CORS origins (comma-separated, default: *)
   - **Optional (Advanced Database):**
     - `DB_POOL_MIN`, `DB_POOL_MAX`: Connection pool settings
     - `DB_QUERY_TIMEOUT`, `DB_STATEMENT_TIMEOUT`: Database timeouts
     - `DB_SSL`, `DB_LOGGING`: Database SSL and query logging
   - **Optional (Security):**
     - `CSRF_ENABLED`, `CSRF_SECRET`: CSRF protection settings
     - `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`: JWT token expiration
   - **Optional (Vercel Integration):**
     - `VERCEL_TOKEN`: Vercel API token for custom domain management
     - `VERCEL_PROJECT_ID`: Vercel project ID for custom domain management
   - **Optional (Testing):**
     - `TEST_DATABASE_URL`: Test database URL for automated tests

3. **For deployment platforms (Railway/Vercel):**
   - Copy the values from your `.env` file
   - Add them to your deployment platform's environment variables section

### Running Locally

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```
2.  **Run the development server:**
    ```bash
    pnpm dev
    ```

---

## 🏛️ Architecture Overview

### UI Shell
The UI is built around a central `AppLayout.tsx` which provides a consistent structure and includes the main `Navbar.tsx`. The entire application is wrapped in two key context providers:

- **`AuthProvider`**: Manages user authentication state.
- **`ThemeProvider`**: Manages the application's visual theme, applying styles dynamically using CSS variables. The default theme is "Keeper Classic".

### Key Components & Pages

-   **`LandingPage.tsx`**: The public-facing welcome page, designed to be inviting and poetic.
-   **`LoginPage.tsx` / `RegisterPage.tsx`**: Centered, card-based forms for user authentication.
-   **`RootKeeperPage.tsx`**: The main authenticated view, providing a personal space for the user.

### Routing

Routing is managed by `react-router-dom` in `App.tsx`. Public and protected routes are clearly defined, with `AppLayout` wrapping all views.
---

## 📆 Update Log
### 2026-02-05
- **DOCS**: Added `KEEPER-AUDIT.md` with a comprehensive platform audit snapshot.
- **DOCS**: Added `KEEPER-FUNCTIONAL-AUDIT.md` with a functional handoff review.
### 2024-05-22
- **INIT**: Scaffolding of the initial Keeper UI shell.
- **ADD**: `AppLayout`, `Navbar`, `ThemeProvider`, and pages for Landing, Login, Register, and Root Keeper.
- **STYLE**: Implemented a custom theming system with a "Keeper Classic" default theme.
- **STYLE**: Added custom fonts (`Playfair Display`, `EB Garamond`, `Inter`) and base styles.
- **REFACTOR**: Redesigned authentication pages (`LoginPage`, `RegisterPage`) with a card-based UI.
- **REFACTOR**: Updated routing in `App.tsx` to use the new layout and providers.
### 2025-09-24
- **CHORE**: Add root `vercel.json` rewrite to forward to Railway API for `api.ke3p.com`.
### 2026-01-14
- **CHORE**: Add repo-root `Dockerfile.proxy` for monorepo builds of the Proxy service.

# Keeper Platform: Source Structure

This project contains both a **React frontend** (for Vercel) and an **Express backend** (for Railway). The source code is organized to support dual build targets and deploy paths.

---

## 🔷 Frontend (React + Vite)
- Entry: `src/main.tsx`
- JSX components live in `src/**/*.tsx`
- Built using `vite` and compiled with `tsconfig.app.json`

**Build Commands:**
```bash
pnpm run build        # Runs Vite + tsconfig.app.json
pnpm run dev          # Local dev server for frontend

```

## 🗄️ Database Development

### Seeding Canonical Data

The application includes canonical themes and roles that should be seeded for development and production:

```bash
# Seed the database with canonical themes and roles
pnpm --filter @keeper/database run seed
```

This will create:
- **4 Canonical Themes**: `keeper-classic`, `keen-kip`, `lowcountry-summer`, `juke-joint`
- **Platform Roles**: `super-admin`, `admin`, `support`, `moderator`, `analyst`, `developer`, `viewer`

### Database Commands

```bash
# Generate Prisma client
pnpm --filter @keeper/database run generate

# Push schema changes to database
pnpm --filter @keeper/database run push

# Open Prisma Studio
pnpm --filter @keeper/database run studio

# Run migrations
pnpm --filter @keeper/database run migrate
```

## 📦 Releases

- **Current stable**: [`v0.1.0-stable`](https://github.com/<username>/<repo>/releases/tag/v0.1.0-stable)
  - Stable: deterministic Redis tests + canonical .env.example + pnpm CI

## Single-Domain MVP Setup

- WEB env:
  - `VITE_PUBLIC_APP_ORIGIN=https://www.ke3p.com`
  - `VITE_API_URL=https://api.ke3p.com`
  - `FALLBACK_DOMAIN=www.ke3p.com`
- API env:
  - `PUBLIC_WEB_ORIGIN=https://www.ke3p.com`
  - `APP_ORIGIN=https://api.ke3p.com`
  - `CORS_ALLOWLIST=https://www.ke3p.com,https://api.ke3p.com`
  - `FALLBACK_DOMAIN=www.ke3p.com`
  - `KEEPER_PROXY_ENABLED=false` (must remain false in production)

CORS policy:
- Production: allow only `https://www.ke3p.com` and `https://api.ke3p.com`.
- Development: also allow `http://localhost:5173` and `http://localhost:3000`.

Production endpoints:
- Web: `https://www.ke3p.com`
- API: `https://api.ke3p.com` (sole production API entrypoint; `api.keeper.domains` disabled)

Vercel Configuration:
- See `docs/vercel-config.md` for deployment and SPA routing details

Health & CORS checks:
- Health:   `GET https://api.ke3p.com/api/health` (expect 200)
- CORS OK:  `GET https://api.ke3p.com/api/test` with `Origin: https://www.ke3p.com` (expect 200)
- CORS NO:  `GET https://api.ke3p.com/api/test` with `Origin: https://evil.example` (expect 403)

Run:
- Web: set envs above, then `pnpm dev` in `apps/web`
- API: set envs above, then `pnpm dev` in `apps/api`
- Prisma: `pnpm prisma migrate dev && pnpm prisma db seed` in `packages/database`