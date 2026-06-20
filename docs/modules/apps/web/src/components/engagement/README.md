# Engagement

## 📌 Purpose
Provides the engagement template system — fetching template definitions, rendering form fields, validating inputs, and executing engagement actions against the API.

## 🧱 Key Files
- `EngagementButton.tsx` — Button that fetches a template and either opens a modal, delegates to an inline handler via `onActivate`, or executes immediately.
- `EntityEngagementBar.tsx` — Renders KeeperType-linked templates for a story-surface entity context (Journey, Path, Moment).
- `EngagementForm.tsx` — Standalone form component (no Dialog wrapper) with field rendering, validation, and submit/cancel. Used inline by the Build workspace and wrapped by `EngagementModal`.
- `EngagementModal.tsx` — Thin Dialog shell wrapping `EngagementForm` for modal-based flows.
- `EchoWriter.tsx`
- `IdentityLogbook.tsx`
- `MemoryCardManager.tsx`
- `ReflectionJournal.tsx`
- `VoicePanel.tsx`

## 🔄 Data & Behavior
`EngagementButton` fetches template definitions from `/api/engagement/templates/:slug`. If the template has fields:
- **Default (no `onActivate`):** Opens `EngagementModal` as a centered Dialog overlay.
- **With `onActivate`:** Calls the parent-provided callback with the template and context, allowing inline rendering (e.g. CommonsFrame Build workspace).

`EngagementForm` manages input state, prefills from `dataSource`/context, validates, and calls `onSubmit`. It renders field types: text, textarea, select, email, password, and custom patterns.

Execution hits `/api/engagement/execute` with `templateSlug`, `context`, and `inputs`.

`EntityEngagementBar` loads templates via `useKeeperTypeTemplates`, filters by entity `targetType`, and renders themed action buttons for authenticated members on story surfaces.

## ⚠️ Notes & ToDo
- [ ] Replace `alert()` calls with toast notifications across all engagement components.
- [ ] Consider supporting multi-step engagement templates.

## 📆 Update Log
- **2026-06-19** — Added `EntityEngagementBar` for KeeperType template actions on Journey/Moment story surfaces.
- 2026-02-09: Extracted `EngagementForm` from `EngagementModal` to support inline rendering. Refactored `EngagementModal` to wrap `EngagementForm`. Added `onActivate` callback to `EngagementButton` for Build workspace integration. Exported shared types (`EngagementTemplateDefinition`, `EngagementContext`, `TemplateField`).
