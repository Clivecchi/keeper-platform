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

### 2026-01-14 - Domain slug support on /v0
- Added `domain`/`domainSlug` query parsing so `/v0` Moment drafts include explicit domain context.
