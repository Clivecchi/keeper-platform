# Components

## 📌 Purpose
Shared UI building blocks that are reused across pages, frames, and layouts.

## 🧱 Key Files
- `AuthForm.tsx`
- `ErrorBoundary.tsx`
- `DebugButton.tsx`

## 🔄 Data & Behavior
Components here focus on reusable UI state, composition, and cross-feature interactions (auth, debug helpers, layout primitives).

## ⚠️ Notes & ToDo
- [ ] Confirm which shared components should be migrated into v0-specific folders.

## 📆 Update Log
- 2026-06-24: Default post-login redirect is now `/d/default?board=domain` (Domain Board) instead of Commons, matching V0Shell authenticated landing behavior.
- 2026-01-25: Added component-level README and made auth form headings optional for login layout refresh.
- 2026-01-25: Updated auth form default redirect to the Commons board.
