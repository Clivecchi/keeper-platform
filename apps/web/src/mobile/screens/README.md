# Mobile Screens

## 📌 Purpose
Screen components for Universal Mobile shell tabs — Realm home, World, Moment capture, Journeys, Kip/Dialog, and moment detail overlay.

## 🧱 Key Files
- `RealmScreen.tsx` — Phase 4B cross-domain home: domain list + text composer (talk placeholder)
- `RealmsRedirect.tsx` — `/realms` auth entry → first domain with `?board=realm`
- `WorldScreen.tsx` — kept moments stream
- `KeepScreen.tsx` — moment.create engagement
- `JourneysScreen.tsx` — journey list
- `KipScreen.tsx` — staged dialog with lead agent
- `MomentDetailScreen.tsx` — moment presence overlay

## 🔄 Data & Behavior
- **RealmScreen** uses `fetchDomainSwitcherEntries` from `domainSwitcherData.ts` (same as DomainSwitcher). Tap domain → `/d/:slug/board?board=realm`. Composer send → Kip tab with prefilled text via `UniversalMobileUIContext`.
- Other screens compose `useUniversalMobile()` for domain/board state.

## ⚠️ Notes & ToDo
- [ ] Talk mode / STT on Realm composer mic button (Phase 4B.2)
- [ ] Quick capture from Realm composer without tab switch (Phase 4B.3)

## 📆 Update Log

### 2026-07-01 — Phase 4B Realm Screen
- Added `RealmScreen.tsx` — domain picker parity + bottom composer (text + mic placeholder).
- Added `RealmsRedirect.tsx` for `/realms` authenticated mobile entry.
