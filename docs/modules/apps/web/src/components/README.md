# Components

## 📌 Purpose
Shared UI building blocks that are reused across pages, frames, and layouts.

## 🧱 Key Files
- `AuthForm.tsx`
- `HostnameSlugGuard.tsx` — on brand hosts, strips legacy `/d/:slug` to `/`
- `RealmRoot.tsx` — `/` renders brand realm shell or platform redirect
- `ErrorBoundary.tsx`
- `PanelErrorBoundary.tsx` (re-export path: `v0/components/PanelErrorBoundary.tsx` — Universal Board panels)
- `DebugButton.tsx`

## 🔄 Data & Behavior
Components here focus on reusable UI state, composition, and cross-feature interactions (auth, debug helpers, layout primitives).

## ⚠️ Notes & ToDo
- [ ] Confirm which shared components should be migrated into v0-specific folders.

## 📆 Update Log
- 2026-07-24: **AuthForm JWT redaction** — login success logs userId/email only; never logs `data.token`.
- 2026-07-07: **Brand login path** — `AuthForm` normalizes legacy `/d/:slug` returnTo to `/?board=domain` on brand hosts; shows API error text instead of generic connection failure.
- 2026-07-07: **Post-login landing** — `AuthForm` awaits async `resolveLandingPathAfterAuth`; brand hosts resolve hostname before route (no cold-cache fallthrough to `/home`).
- 2026-07-06: **Clean brand URLs** — `RealmRoot` + `BrandRealmShellPage`; `livecchi.us` renders at `/` (HostnameSlugGuard strips `/d/*` on brand hosts).
- 2026-07-04: **keeper.domains hostname routing** — `HostnameSlugGuard` redirects `/d/:wrongSlug` to tenant slug from hostname; `AuthForm` post-login uses `resolvePostAuthPath` (tenant host → `/d/:slug?board=domain`, platform → `/home`).
- 2026-07-03: Post-login and register redirect to `/home` (user Home shell); honors `returnTo` when present. Root `/` sends authenticated members to `/home`.
- 2026-07-02: Post-login redirect uses `resolvePostLoginDomainSlug` → `/d/:primarySlug?board=domain` (was hardcoded `default`).
- 2026-06-22: Universal Board panel isolation lives in `v0/components/PanelErrorBoundary.tsx` (Nav · Dialog · Chronicle).
- 2026-01-25: Added component-level README and made auth form headings optional for login layout refresh.
- 2026-01-25: Updated auth form default redirect to the Commons board.
