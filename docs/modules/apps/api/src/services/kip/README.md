# Kip Services

## 📌 Purpose
Shared server-side helpers for Kip agent runtime — environment resolution, dialog lifecycle, and draft persistence glue.

## 🧱 Key Files
- `buildKipEnvironmentContext.ts` — Session-bound environment payload for agent runs
- `resolveAgentEnvironment.ts` — Per-agent capability and policy resolution
- `linkDraftToSessionDialog.ts` — Sets `kip_drafts.dialog_id` from the active session's Dialog (first link wins)
- `actionFollowUp.ts` — Second model turn after read-only actions (`draft.read`, etc.) so Kip answers with live results
- `modeConfig.ts` — Kip mode configuration helpers
- `mockAgents.ts` — DB-disabled development agents

## 🔄 Data & Behavior
- Draft mutations during agent runs call `ensureDraftLinkedToSessionDialog` so Chronicle Sessions blocks can load linked Dialog sessions.
- Linking is idempotent: existing `dialog_id` on a draft is never overwritten.

## ⚠️ Notes & ToDo
- [ ] Consolidate dialog find/create helpers with `kipDialogLifecycle.ts` if duplication grows

## 📆 Update Log

### 2026-06-22 — Auto-link draft to session Dialog
- Added `ensureDraftLinkedToSessionDialog` — invoked from Kip draft actions, draft intent pipeline, and `POST .../active-draft`.

### 2026-06-22 — Read-action follow-up synthesis (Lead agents)
- Added `actionFollowUp.ts` — when a turn is read-only (`draft.read`, `journey.read`, etc.), the server runs a second model call with action results so Kip completes the engagement instead of stopping at "Reading the draft now."
