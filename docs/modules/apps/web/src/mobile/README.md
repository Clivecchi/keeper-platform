# Universal Mobile

## 📌 Purpose
**Universal Mobile** is the narrow-viewport shell for **Domain** and **Realm** Universal Boards — same backend and engagement pipeline as desktop, different layout patterns (tabs instead of Nav · Dialog · Chronicle).

This is not a separate app, not legacy frame routing, and not a parallel API surface.

## 🧱 Key Files
- `UniversalMobileShell.tsx` — tab shell + moment overlay + PWA prompt (authenticated Domain · Realm boards)
- `screens/RealmScreen.tsx` — cross-realm picker + composer (Domain Board mobile tab)
- `PublicGuestChrome.tsx` — Sign In / Get Started overlay for guest public story
- `public-story.css` — mobile-safe layout for Cover / Present (Phase 3.3)
- `hooks/useUniversalMobile.ts` — composes `UniversalBoardContext` + `UniversalMobileUIContext` + `V0Shell`
- `context/UniversalMobileUIContext.tsx` — mobile-only UI: tabs, Kip focus chip, World refresh, PWA
- `screens/RealmScreen.tsx` — Phase 4B cross-domain home: domain list + composer (Realm tab)
- `screens/RealmsRedirect.tsx` — `/realms` → first domain with `?board=realm`
- `screens/WorldScreen.tsx` — kept moments stream with pull-to-refresh
- `screens/KeepScreen.tsx` — `moment.create` via `useBoardEngagement` + `ChronicleActPresence`
- `screens/JourneysScreen.tsx` — journey list (Nav parity)
- `screens/KipScreen.tsx` — Dialog parity: `useAgentDialog` + `KeeperDialogFrame`
- `screens/MomentDetailScreen.tsx` — moment presence: read, `moment.update`, emotifs, Ask Kip
- `hooks/useMobileSurface.ts` — routes to Universal Mobile when auth + narrow viewport
- `mobile-shell.css` — full-height layout; Kip composer pinned above tab bar
- `pwa/` — installability

## 🔄 Data & Behavior

### State ownership
| State | Owner |
|---|---|
| Active journey, moment selection | `UniversalBoardContext` + `FrameContext` |
| Board identity (`domain` vs `realm`) | `V0Shell.workspaceBoardId` + `useUniversalMobile().boardDef` |
| Tab, Kip focus chip, World refresh key, PWA prompt, Realm composer draft | `UniversalMobileUIContext` |
| Screens | `useUniversalMobile()` hook |

### Same as Universal Board (desktop)
- Workspace: `?board=realm` (default on mobile) or `?board=domain` (admin-style mobile override)
- **Realm tab** (default home): cross-domain list + composer — not tied to a single domain's Nav
- Keep / edit: `useBoardEngagement` → `/api/engagement/execute` + `ChronicleActPresence`
- Kip: `useAgentDialog` + `KeeperDialogFrame` (lead agent + arrival greeting when `arrivalCompleted` pending)
- Moment open/close: `onMomentSelect` / `onMomentClear`
- Active journey: `onSetActiveJourney` (persisted in `FrameContext`)

### Not used
- Legacy standalone frames (`?frame=*`)
- `MobileKeeperContext` (removed — was duplicating board state)
- Duplicate mobile-only active-journey localStorage (uses `FrameContext` keys)

### Guest public story (Phase 3.3)
- **Unauthenticated** visitors on `/d/:slug` never mount `UniversalMobileShell` — V0Shell renders Cover / Present via `public-story-shell`.
- `?board=domain` (or any board) is stripped for guests; they land on Cover or preserved public `?frame=` (e.g. `present`).
- Cover forward CTA loads first public journey into `?frame=present&journeyId=…`.

### Manual verify (Phase 3.3)
1. Open DevTools → toggle device toolbar (iPhone / narrow viewport). **Sign out** or use incognito.
2. Visit `/d/default?board=domain` — expect **Cover** (no tab bar, no board chrome). URL should drop `board=`.
3. Visit `/d/default` — Cover with domain wordmark / forward CTA from frame JSON.
4. Tap forward (journey invitation) — lands on `?frame=present&journeyId=…` read-only narrative.
5. Direct link: `/d/default?frame=present&journeyId=<id>` — Present loads without auth.
6. Visit `/d/default/board` — redirects to `/d/default` (BoardToShellRedirect), then guest Cover path.
7. Sign in on mobile — should redirect to `?board=realm` and mount `UniversalMobileShell` with **Realm** tab active.
8. Visit `/realms` while signed in — lands on first domain with Realm tab.

## ⚠️ Notes & ToDo
- [x] **Realm mobile (Phase 4B.1):** Realm Screen tab — domain list + text composer; mic placeholder for talk mode
- [x] **Phase 4D.1–4D.2:** Talk mode STT on Realm Screen + mobile Kip (`useTalkMode` → composer confirm → send)
- [ ] **Phase 4B.3:** Quick capture from Realm composer without full board chrome
- [ ] Phase 3: offline draft queue, push notifications, app store wrappers

## 📆 Update Log

### 2026-07-01 — Phase 4D Talk mode (Realm + Kip)
- `useTalkMode` wired on `RealmScreen` composer mic and mobile `KipScreen` via `KeeperDialogFrame` `talkMode` prop.
- Listen → transcript fills composer → user confirms send (no auto-send). Unsupported browsers show mic tooltip only.

### 2026-07-01 — Phase 4C Mobile Domain Screen (in-realm)
- `UniversalMobileShell` mounts for `?board=realm` — same architecture as domain board mobile.
- In-realm tab bar: World · Moment · Journeys · Dialog (no cross-realm picker tab); Realm Screen tab stays on Domain Board mobile only.
- `MobileKipResponseToolbar` uses **Presence** label on realm board; Guided Arrival + lead agent on realm board.
- `workspaceBoardNav`: `isMemberMobileBoard` helper; Realm Screen navigates to `?board=realm`.

### 2026-07-01 — Phase 4B Mobile Realm Screen
- Added `RealmScreen` as first tab (default home); domain list via `fetchDomainSwitcherEntries`; composer → Kip tab.
- `/realms` route resolves first domain → `?board=realm`. V0Shell mobile default board is `realm`.

### 2026-07-01 — Phase 3.3 Present / public mobile hardening
- Added `PublicGuestChrome`, `public-story.css`, and V0Shell guest routing (`guestPublicStory.ts`).
- Guests strip `?board=*`; Cover forward CTA opens `?frame=present&journeyId=…`.
- Manual verify steps documented above.

### 2026-07-01 — Phase 2.1 Guided Arrival (mobile)
- `GuidedArrivalOrchestrator` focuses Kip tab on first owner visit; `KipScreen` uses lead agent + greeting + dismissible banner.

### 2026-06-30 — Realm mobile direction documented
- Product split locked: mobile/tablet = Realm primary; desktop = admin/dev boards.
- Two surfaces: **Realm Screen** (picker + composer + talk) and **Domain Screen** (staged Dialog + Chronicle, same Universal Board architecture).
- Full phase map in `docs/realm-development-plan.md`.

### 2026-06-25 — Mobile moment capture + install fixes
- Fixed **Invalid request** on moment submit — journey/keeper IDs are slug-style strings, not UUIDs; API validation updated.
- PWA install banner shows on mobile with Android/iOS instructions (above tab bar); no longer gated on first kept moment.
- Field labels on Moment form use readable theme tokens (not red-on-dark).

### 2026-06-22 — Mobile Kip UX polish
- Kip composer: Enter = new line on mobile; send only via send button.
- Horizon gradient hidden except during thinking stage.
- Tab renamed **Keep** → **Moment** (moment capture via `moment.create`).

### 2026-06-22 — Keeper turtle app icon
- Canonical source: `public/icons/keeper-app-icon.png` (cosmic turtle mark).
- Generated `favicon.ico`, PWA 192/512, maskable 512, and `apple-touch-icon` via `pnpm --filter keeper-web run generate:pwa-icons`.

### 2026-06-22 — Mobile Kip staged dialog (composing · thinking · response)
- Kip tab uses `dialogLayout="mobile-staged"`: full-screen composing, thinking reassurance, response with compact composer.
- Response toggle: **Text** (latest exchange) and **Chronicle** (action receipts via `MobileKipChronicleView`).

### 2026-06-22 — UniversalMobileShell + board context refactor
- Renamed `MobileKeeperShell` → `UniversalMobileShell`.
- Removed `MobileKeeperContext`; board state via `UniversalBoardContext`, UI via `UniversalMobileUIContext`.
- Added `useUniversalMobile()` compositor hook and `onMomentClear` on board actions.

### 2026-06-22 — Universal Mobile alignment
- Documented as Domain Board shell; mobile route strips legacy `?frame=`; `UniversalBoardProvider` wraps shell.

### 2026-06-22 — Phase 0–2
- PWA scaffold, tabs, Kip, edit, emotifs, pull-to-refresh.
