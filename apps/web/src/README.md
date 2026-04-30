# Web App Source

## 📌 Purpose
Defines the root application shell, routing, and shared providers for the Keeper web app.

## 🧱 Key Files
- `App.tsx` – Top-level routes and auth guards.
- `main.tsx` – App bootstrap (providers + render).
- `index.css` – Global styles.

## 🔄 Data & Behavior
- Uses `AuthGate` and context providers to resolve session state before rendering protected routes.
- Routes split between authenticated, admin-only, and public surfaces.
- Public entry routes redirect into domain board shells as needed.

## ⚠️ Notes & ToDo
- [ ] Replace admin allowlist fallback once `/api/kam/auth/me` exposes roles.
- [ ] Consolidate legacy and public routes once domain routing is stabilized.

## 📆 Update Log
### 2026-01-27 - Admin route guard alignment
- Routed `/d/:slug/admin` through the admin guard and redirected non-admin users back to the domain Commons.
### 2026-01-24 - Admin Guard + Root Redirect
- Added admin-only routing for `/root*` and redirected `/` to the default domain cover.
### 2026-01-25 - Legacy routing guard
- Routed `/legacy` to the authenticated `/root` dashboard so legacy UI is no longer public.
### 2026-01-25 - Commons + settings routing
- Defaulted authenticated domain routing to Commons and introduced `/settings` for profile edits.
### 2026-04-29 - Panel opacity fix (Prompt 7b)
- Removed `.keeper-board-scope` dark token overrides from `index.css` — panel surfaces revert to original warm cream values.
- Added ghost panel fix: `.keeper-board-scope .keeper-dialog-frame .keeper-panel-scroll { background: transparent }` so the inner scroll container no longer doubles the surface background.
- Upgraded banner and bottom zone `backdrop-filter` from `blur(12px)` to `blur(16px)` and opacity from `0.70` to `0.88` for visual consistency with the frosted panel system.
