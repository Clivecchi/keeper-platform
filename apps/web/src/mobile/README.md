# mobile

## 📌 Purpose
Mobile-first Keeper experience and Progressive Web App (PWA) infrastructure. Phase 0 adds installability, service worker caching, and install prompt hooks for the future mobile shell.

## 🧱 Key Files
- `pwa/PwaProvider.tsx` — registers service worker and exposes install state
- `pwa/usePwaInstall.ts` — `beforeinstallprompt` hook + iOS Safari detection
- `pwa/PwaInstallPrompt.tsx` — optional install banner (wired in Phase 1)
- `pwa/registerPwa.ts` — Workbox registration via `vite-plugin-pwa`
- `pwa/types.ts` — PWA install types

## 🔄 Data & Behavior
- `PwaProvider` wraps the app in `AppProviders` and registers the service worker on production builds.
- `usePwaInstall` listens for `beforeinstallprompt`, tracks standalone mode, and stores dismiss timestamps in `localStorage`.
- `PwaInstallPrompt` is exported but not mounted globally yet — Phase 1 will show it after a user keeps their first moment.
- App shell assets are precached by Workbox; `/api/*` uses network-first runtime caching.

## ⚠️ Notes & ToDo
- [ ] Phase 1: `MobileKeeperShell` with World / Keep / Journeys tabs
- [ ] Phase 1: mount `PwaInstallPrompt` after first kept moment
- [ ] Replace placeholder keeper-mark icon with final brand asset

## 📆 Update Log

### 2026-06-22 — Phase 0: PWA scaffold
- Added `vite-plugin-pwa`, web manifest, service worker, install hooks, and placeholder icons under `/public`.
