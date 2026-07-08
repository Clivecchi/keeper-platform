# Gloss

## 📌 Purpose
Universal gesture for focused Dialog exchange on discrete chat content — hover (desktop) or long-press (mobile) reveals a quiet affordance; the resulting conversation builds inline inside the parent message.

## 🧱 Key Files
- `GlossProvider.tsx` — context, send handler, metadata persistence
- `GlossSurface.tsx` — wraps glossable nodes; hover/long-press affordance
- `GlossThreadPanel.tsx` — inline mini-conversation UI
- `gloss.css` — affordance styling
- `index.ts` — public exports

## 🔄 Data & Behavior
- `GlossAnchor` + optional `GlossContentSnapshot` identify the selected node
- Threads stored on `kip_messages.metadata.glossThreads` via `KipApi.updateMessageMetadata`
- Gloss sends use `runAgent` with `agentContext.glossMode: true` (sub-turns do not pollute main session)
- Wired from `KeeperDialogFrame` → `DialogueMessageList` → `ActionReceiptCard` (image/moment receipts)

## ⚠️ Notes & ToDo
- [ ] Phrase-level selection (`selectionText` on anchor)
- [ ] Chronicle / DraftPointRow — migrate Discuss button to GlossSurface
- [ ] Journey / Path receipt cards

## 📆 Update Log
- **2026-07-07** — Message/caption gloss uses overlay affordance only (no in-flow row above content) — hover shows green outline + corner button without layout jump.
- **2026-07-04** — Message hover tooltip shortened to "Discuss message"; text affordance sits above content (images stay overlay).
- **2026-07-04** — Scrollbar gutter fixed (no layout jump); green-only gloss frame; stronger Gloss affordance pill with label.
- **2026-07-04** — Deepest-hover wins single affordance; highlight border + instructive tooltip per gloss target.
- **2026-07-03** — Initial Gloss MVP: GlossSurface, inline GlossThread, chat receipt wiring, API gloss prompts + metadata persistence.
