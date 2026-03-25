# DesignerFrame

## 📌 Purpose
Platform Admin–only three-panel surface where Kip and the domain owner author, preview, and publish domain JSON together. Accessible at `?frame=designer`.

## 🧱 Key Files
- `DesignerFrame.tsx` — Shell: holds all shared state, admin guard, publish handler
- `DesignerFrameNav.tsx` — Left panel: frame list with live/draft status dots
- `DesignerFrameKip.tsx` — Center panel: Kip conversation, Approve button, Publish button
- `DesignerFramePreview.tsx` — Right panel: rendered frame preview + audience switcher + JSON toggle
- `README.md` — This file

## 🔄 Data & Behavior

### Auth
- `useAuth().isAdmin` — if false, renders "Access restricted" (no redirect)
- Backend endpoint uses `authMiddlewareCompat` + `requireDomainWriteCompat`

### State (all lifted to DesignerFrame.tsx)
| State | Type | Description |
|---|---|---|
| `activeFrameKey` | `string \| null` | The V0 Frame currently being edited |
| `liveDomainFrame` | `DomainFrameJson \| null` | Live frame JSON; reloads after publish |
| `draftSpecJson` | `unknown \| null` | Kip's proposed JSON (not yet published) |
| `draftId` | `string \| null` | ID of the created `domain_json` draft |
| `messages` | `DesignerMessage[]` | Conversation history (local state only, not persisted) |
| `audience` | `'guest' \| 'keeper' \| 'admin'` | Preview audience context |
| `showRawJson` | `boolean` | Toggle between rendered frame and raw JSON |

### Interaction Loop
1. Owner selects a Frame in the left panel
2. Owner sends a message to Kip in the center panel
3. Backend calls Anthropic (conversation) + Together AI JSON Mode (structured output when a change is requested)
4. If Kip produces a JSON proposal, an **Approve** button appears
5. Approve → `KipApi.createDraft()` creates a `domain_json` draft → preview shows draft
6. Publish → `KipApi.publishDraft()` → `Domain.frame_json` updated → live frame reloads

### Two-Model Pattern
- **Anthropic** (`claude-sonnet-4-6`) — Kip's conversational reasoning
- **Together AI** (`mistralai/Mixtral-8x7B-Instruct-v0.1`, JSON Mode) — Guaranteed schema-compliant `DomainFrameJson` block output

### Backend Endpoint
`POST /api/domains/:domainId/kip/designer`
- Request: `{ message, frameKey, conversationHistory }`
- Response: `{ response: string, draft?: { spec_json: object } }`

## ⚠️ Notes & ToDo
- [ ] Domain Owner scope — currently Platform Admin only
- [ ] Persist conversation history across sessions
- [ ] "＋ New Frame" button is a placeholder — no action
- [ ] Frame preview uses `pointer-events: none` to prevent navigation within the preview panel
- [ ] Together AI JSON mode may occasionally produce malformed JSON for complex frames — the endpoint degrades gracefully (returns conversation only)

## 📆 Update Log
### 2026-03-25 — Design Board UX (see `apps/web/src/v0/boards/designer/README.md`)
- Display density (`keeper-density`, `data-density` on `<html>`, banner control, `index.css` + `index.html` bootstrap).
- Left list: no auto-collapse on frame select; center: focus mode rail + banner + Kip thread; right Preview: eye + audience dropdown.
- Source of truth for full module spec: `apps/web/src/v0/boards/designer/README.md`.
### 2026-03-10 - Initial implementation
- Created DesignerFrame shell (3-panel layout, admin guard, shared state)
- Created DesignerFrameNav (frame list, live/draft status dots, active highlight)
- Created DesignerFramePreview (frame rendering with V0ShellProvider override, audience switcher, JSON toggle, draft badge)
- Created DesignerFrameKip (conversation UI, Approve flow, Publish button)
- Created `apps/api/src/api/domains/kip-designer.ts` (Anthropic + Together AI JSON mode endpoint)
- Added `"designer"` to `V0FrameKey` and `FRAME_REGISTRY` in V0Shell
- Added `KipApi.publishDraft()` to kipApi.ts
- Created `frameRegistryMap.ts` (shared frame component map to avoid circular imports)
