# Web App

## 📌 Purpose
Vite + React frontend for the Keeper Platform, deployed on Vercel.
// TODO: Verify and describe assumptions about framework and deployment.

## 🧱 Key Files
- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.cjs`
// TODO: Verify key files and adjust list accordingly.

## 🔄 Data & Behavior
Client-rendered UI using React. Styling via Tailwind CSS. Built with Vite. Integrations and state management specifics TBD.
// TODO: Verify routing, state libraries, and data flow specifics.

## ⚠️ Notes & ToDo
- [ ] Pending issues or improvements
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2026-06-22: Keeper turtle app icon — source `public/icons/keeper-app-icon.png`; run `pnpm --filter keeper-web run generate:pwa-icons` to regenerate favicon.ico and PWA assets.
- 2026-06-22: Phase 0 mobile PWA scaffold — `vite-plugin-pwa`, manifest, service worker, install hooks under `src/mobile/pwa/`.
- 2026-01-19: Added build-time stamp injection via Vite define for v0 shell stamp.
- 2025-09-30: Added `.npmrc` to stabilize npm registry access during Vercel builds.
