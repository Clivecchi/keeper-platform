# Home Pages

## 📌 Purpose
User-scoped Home routing at `/home` — one Home per user, decoupled from domain slug URLs. Realm board experience lives here instead of `/d/:slug?board=realm`.

## 🧱 Key Files
- `HomeShellPage.tsx` — mounts `V0Shell mode="home"` inside `KipChatDrawerProvider`
- `RealmBoardRedirect.tsx` — legacy redirect helper (`?board=realm` → `/home`)

## 🔄 Data & Behavior
- `/home` is protected (`ProtectedRoute` in `App.tsx`)
- `V0Shell` resolves anchor domain slug via `resolvePostLoginDomainSlug` for API/session context
- Workspace board is always `realm` (Home shell) without `?board=` in URL
- Legacy `/d/:slug?board=realm` redirects to `/home` (also via `BoardToShellRedirect`)

## ⚠️ Notes & ToDo
- [ ] User-renamable Home label — `userHomeSettings.ts` uses localStorage until API persistence
- [ ] Confirm Home naming UX with Kip

## 📆 Update Log
- **2026-07-03** — Added `/home` route, `HomeShellPage`, and legacy realm URL redirect helpers.
