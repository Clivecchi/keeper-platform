# V0 Stores

## 📌 Purpose
Provides lightweight client-side state for V0 frames without introducing global dependencies.

## 🧱 Key Files
- `trailStore.ts`

## 🔄 Data & Behavior
Stores a domain-scoped trail of the last five navigation or action events and exposes a hook for subscribing to updates.

## ⚠️ Notes & ToDo
- [ ] Confirm which additional frames should record trail events.

## 📆 Update Log
### 2026-01-18 - Add domain trail store
- Added a small in-memory store for last-five navigation/action events.
