# Moment Frame

## 📌 Purpose
Renders the Moment authoring surface, including draft load, autosave, and keep actions.

## 🧱 Key Files
- `MomentBody.tsx`
- `KeptMomentsBody.tsx`

## 🔄 Data & Behavior
Loads draft content by ID or creates a draft when missing, debounces autosave updates, keeps drafts, and lists kept moments for the domain.

## ⚠️ Notes & ToDo
- [ ] Confirm keep flow when draft ID is missing

## 📆 Update Log

### 2026-01-14 - Pass domain context to draft actions
- Added domain-scoped headers for load, autosave, and keep requests.
### 2026-01-14 - Add draft creation and kept moments list
- Moment authoring now creates a draft when missing and exposes a kept-moments list body for verification.
