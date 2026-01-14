# Moment Frame

## 📌 Purpose
Renders the Moment authoring surface, including draft load, autosave, and keep actions.

## 🧱 Key Files
- `MomentBody.tsx`

## 🔄 Data & Behavior
Loads draft content by ID, debounces autosave updates, and keeps drafts via v0 API calls using domain context.

## ⚠️ Notes & ToDo
- [ ] Confirm keep flow when draft ID is missing

## 📆 Update Log

### 2026-01-14 - Pass domain context to draft actions
- Added domain-scoped headers for load, autosave, and keep requests.
