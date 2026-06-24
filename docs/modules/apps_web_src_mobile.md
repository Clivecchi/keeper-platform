# mobile

## 📌 Purpose
Mobile-first Keeper experience and Progressive Web App (PWA) infrastructure. Phase 0 adds installability, service worker caching, and install prompt hooks for the future mobile shell.

## 🧱 Key Files
- `MobileKeeperShell.tsx` — full-screen mobile shell with tab navigation
- `screens/WorldScreen.tsx` — kept moments stream with pull-to-refresh
- `screens/KeepScreen.tsx` — `moment.create` engagement via `ChronicleActPresence`
- `screens/JourneysScreen.tsx` — journey list with expandable moments
- `screens/KipScreen.tsx` — mobile Kip dialog via `useAgentDialog` + `KeeperDialogFrame`
- `screens/MomentDetailScreen.tsx` — moment detail, edit, emotifs, Ask Kip
- `context/MobileKeeperContext.tsx` — tab state, active journey, Kip focus, install prompt
- `hooks/useMobileSurface.ts` — mobile vs desktop routing (`?surface=` override)
- `hooks/usePullToRefresh.ts` — touch pull-to-refresh for World tab
- `pwa/PwaProvider.tsx` — registers service worker and exposes install state
- `pwa/usePwaInstall.ts` — `beforeinstallprompt` hook + iOS Safari detection
- `pwa/PwaInstallPrompt.tsx` — optional install banner after first kept moment
- `pwa/registerPwa.ts` — Workbox registration via `vite-plugin-pwa`
- `pwa/types.ts` — PWA install types

## 🔄 Data & Behavior
- Authenticated users on the domain board (`?board=domain`) with viewport ≤767px get `MobileKeeperShell` instead of `UniversalBoard`.
- Override with `?surface=mobile` or `?surface=desktop` on any `/d/:slug` board route.
- Four tabs: **World** (kept moments + pull-to-refresh), **Keep** (`moment.create`), **Journeys**, **Kip** (domain dialog with optional moment focus).
- Moment detail supports read, edit (`moment.update`), emotifs (`MomentEmotifBar`), and **Ask Kip** (opens Kip tab with focus).
- Active journey syncs with `FrameContext` and `localStorage` per domain slug.
- `PwaProvider` wraps the app in `AppProviders` and registers the service worker on production builds.
- After the first successful Keep, `PwaInstallPrompt` may appear (stored in `localStorage`).
- App shell assets are precached by Workbox; `/api/*` uses network-first runtime caching.

## ⚠️ Notes & ToDo
- [ ] Phase 3: offline draft queue, push notifications, app store wrappers (TWA/Capacitor)
- [ ] Replace placeholder keeper-mark icon with final brand asset

## 📆 Update Log

### 2026-06-22 — Mobile routing + Kip composer layout
- Authenticated mobile users auto-route to `?board=domain` (no manual URL needed); `?surface=desktop` or admin boards override.
- Kip tab: composer pinned above tab bar; dialog fills remaining height; duplicate shell header hidden on Kip.

### 2026-06-22 — Phase 2: Kip tab, edit, emotifs, refresh
- Added **Kip** tab with `KipScreen` — reuses `useAgentDialog` + `KeeperDialogFrame` (no Universal Board context required).
- Moment detail: **Edit** via `moment.update` + `ChronicleActPresence`; **MomentEmotifBar**; **Ask Kip** opens Kip with moment focus.
- World tab: pull-to-refresh via `usePullToRefresh`.
- `MobileKeeperContext` syncs `activeJourneyId` with `FrameContext`; Kip focus clears when leaving Kip tab.

### 2026-06-22 — Phase 1: MobileKeeperShell
- Added `MobileKeeperShell` with World, Keep, and Journeys tabs for narrow viewports on the domain board.
- Wired `V0Shell` to render mobile shell when authenticated on mobile (`?surface=desktop` overrides).
- Keep flow uses `moment.create` via `ChronicleActPresence`; install prompt surfaces after first kept moment.

### 2026-06-22 — Phase 0: PWA scaffold
- Added `vite-plugin-pwa`, web manifest, service worker, install hooks, and placeholder icons under `/public`.
