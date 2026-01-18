# Pages

## 📌 Purpose
Top-level route pages for the web app, including public, auth, and v0 entry points.

## 🧱 Key Files
- `V0Page.tsx`
- `LandingPage.tsx`
- `LoginPage.tsx`
- `RegisterPage.tsx`

## 🔄 Data & Behavior
Pages parse route params and query string state to decide which surface to render.

## ⚠️ Notes & ToDo
- [ ] Audit page-level redirects for domain-first routing

## 📆 Update Log

### 2026-01-18 - Diagnostics frame wrapper
- Routed diagnostics through the v0 diagnostics frame wrapper to align with frame navigation.

### 2026-01-15 - Add diagnostics frame entry
- Enabled `/v0?frame=diagnostics` to render the unified Diagnostics frame.

### 2026-01-14 - Domain slug support on /v0
- Added `domain`/`domainSlug` query parsing so `/v0` Moment drafts include explicit domain context.
### 2026-01-14 - Add kept moments frame entry
- Enabled `/v0?frame=moments` to render a minimal kept-moments view.
