# Mobile Screens

## 📌 Purpose
Screen components for Universal Mobile shell tabs — Domains picker, Moment capture, Journeys, Kip/Dialog, and moment detail overlay.

## 🧱 Key Files
- `RealmScreen.tsx` — cross-domain picker + text composer (Domain board **Domains** tab)
- `RealmsRedirect.tsx` — `/realms` auth entry → first domain with `?board=realm`
- `KeepScreen.tsx` — moment.create engagement
- `JourneysScreen.tsx` — journey list
- `KipScreen.tsx` — staged dialog with lead agent
- `MomentDetailScreen.tsx` — moment presence overlay
- `WorldScreen.tsx` — **deprecated** (World tab removed)

## 🔄 Data & Behavior
- **RealmScreen** uses `fetchDomainSwitcherEntries` from `domainSwitcherData.ts` (same as DomainSwitcher). Tap domain → `/d/:slug/board?board=realm`. Composer send → Kip/Dialog tab with prefilled text via `UniversalMobileUIContext`.
- Other screens compose `useUniversalMobile()` for domain/board state.

## ⚠️ Notes & ToDo
- [x] Talk mode / STT on Domains composer mic (`useTalkMode`)
- [ ] Quick capture from composer without tab switch (Phase 4B.3)

## 📆 Update Log

### 2026-06-30 — Mobile naming
- RealmScreen copy uses **domain** language; World tab removed from shell.

### 2026-07-01 — Phase 4B Realm Screen
- Added `RealmScreen.tsx` — domain picker parity + bottom composer (text + mic).
- Added `RealmsRedirect.tsx` for `/realms` authenticated mobile entry.
