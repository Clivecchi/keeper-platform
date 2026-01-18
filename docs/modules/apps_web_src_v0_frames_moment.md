# Moment Frame

## 📌 Purpose
Renders the Moment authoring surface, including draft load, autosave, and keep actions.

## 🧱 Key Files
- `MomentBody.tsx`
- `KeptMomentsBody.tsx`

## 🔄 Data & Behavior
Loads draft content by ID, debounces autosave updates, keeps drafts, and lists kept moments for the domain. Draft creation and buffer priming are handled by the parent frame.

## ⚠️ Notes & ToDo
- [ ] Confirm keep flow when draft ID is missing

## 📆 Update Log

### 2026-01-18 - Extract moment feedback rail
- Introduced a reusable feedback rail component and wired moment actions into a domain trail.

### 2026-01-14 - Pass domain context to draft actions
- Added domain-scoped headers for load, autosave, and keep requests.
### 2026-01-14 - Add draft creation and kept moments list
- Moment authoring now creates a draft when missing and exposes a kept-moments list body for verification.
### 2026-01-17 - Align moment body with draft bootstrap
- Removed in-body draft creation now that the frame bootstraps drafts before rendering.
### 2026-01-17 - Support buffered editing before draft exists
- Synced buffered content when a draft ID becomes available and exposed save status to the frame.
