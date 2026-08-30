# SharedSrc

## 📌 Purpose
Core source files for the `@keeper/shared` workspace package. Provides shared logging utilities, role constants, and canonical board metadata consumed by both the API and web app.

## 🧱 Key Files
- `index.ts` – Barrel export for package consumers
- `logger.ts` – Minimal console logger
- `roles.ts` – Shared role identifiers
- `canonicalBoards.ts` – Canonical logged-in experience board slugs & helpers
- `universalBoardId.ts` – `build` Board id; `ide` is a URL/frame-JSON alias only
- `cloudMcpCeiling.ts` – Cloud MCP capability ceiling (shared by API + Build Board def)
- `keeperStage.ts` – Stage composition (references + contextual Agency)
- `draftHostTitle.ts` — Human-facing host name for Document vs Draft Point cards
- `pointProposeIdentity.ts` — Same-Point identity for `draft.update.propose` (Keeper-owned dedupe)
- `sessionActionLog.ts` — Session action receipts for the Lead prompt

## 🔄 Data & Behavior
- All exports are side-effect free utilities or type helpers.
- `canonicalBoards.ts` defines the `CanonicalBoardSlug` union plus helper guards. No runtime data is fetched here; it is pure metadata used to coordinate backend seeding and frontend routing.

## ⚠️ Notes & ToDo
- [ ] Backfill additional shared UI types as they stabilize
- [ ] Consider moving engagement template metadata here when API/web need the same constants

## 📆 Update Log
- 2026-08-29: `directorContinuity.ts` — offering a Point in prose is incomplete; emit `draft.update.propose`. The card is consent.
- 2026-08-26: `sessionActionLog.ts` — session action receipts (time / type / status) for the Lead prompt. Narration is not evidence.
- 2026-08-26: `pointProposeIdentity.ts` — same-Point identity for propose (identical body, or distinctive title + same opening). Cast Notes are not hosts.
- 2026-08-25: `documentReorganize.ts` — Lead may propose Document **title** and **Forward** (`payload.title`, `payload.forward`). Identity-only proposals are valid; they are not spine-only. Chronicle Proposed shows those fields; Apply writes Dialog `title` / `forward_title` / `forward_description`.
- 2026-08-25: `resolveChronicleActiveDraftId` — Chronicle Document focus (`null`) and foreign manuscripts do not become Working on.
- 2026-08-25: `resolveDraftPointRef` — UUID / 1-based number / title. `rewriteDraftPointInSpec` may omit content for title-only updates.
- 2026-08-24: `directorContinuity.ts` — Lead short-reply continuity (`Yes` / `propose`) and `isSupportEchoPrompt` so Echo scaffolds are not treated as the human's words.
- 2026-08-22: `documentReorganize.ts` — Coerces Lead payload shapes (string Sections, nested Points, title/body synonyms). Sections-only is a valid proposal; Keeper keeps every current Point.
- 2026-08-22: `documentReorganize.ts` — Keeper resolves Point numbers and titles to real ids. Unknown refs become New instead of failing the proposal.
- 2026-08-22: `documentReorganize.ts` — Review & Reorganize proposal contract. Lead proposes a future Document; Keeper fills omitted Points as unchanged so Proposed is always complete. Apply is a separate human action.
- 2026-08-22: `keeperStage.ts` — Stage composition contract (references + contextual Agency). `chronicleSubject` Working on (agent/journey/…) now wins over Talking in Dialog when both IDs are set.
- 2026-08-22: `documentAuthoring.ts` — Section add/rename/move/remove, Point placement, Document stage cycle. Author writes do not use the agent merge path.
- 2026-08-22: `document.ts` — every named Document resolves a Forward (Dialog directional objective). `DOCUMENT_OPEN_SECTION` is the quieter Section for unplaced Points. `talkingInWorkingOn` keeps a linked Dialog when title is still loading, names the Domain, and does not shout the Document title twice.
- 2026-08-19: `chronicleSubject.ts` — Board Def is Nav context (`selectedBoardDefId`). Design is a lens; URL does not route Chronicle.
- 2026-08-19: `universalBoardId.ts` + `cloudMcpCeiling.ts` — Build is the Board id; Cloud ceiling is Cloud's list, not an IDE identity.
- 2026-08-17: `markdownToDraftPoints.ts` — heading/section split for Dialog ingest (truncates at `INGEST_MAX_POINTS`). `dialog.rw` added to `DOMAIN_ACCESS_KEY_SCOPES`.
- 2026-07-25: `dialogParticipation` default is `voice` for every agent (including Cloud). `support_only` / `silent` only via Agent Config.
- 2026-07-24: `dialogParticipation.ts` — `voice` | `support_only` | `silent` on agent config. `redactForLog.ts` — JWT/token redaction for console/debug capture.
- 2026-07-19: `document.ts` — added `DocumentForward` / `DocumentStep` on the Document container (authored destination vs live tip).
- 2026-07-16: Renamed `chronicleDocument.ts` → `document.ts`; exported type `Document` (+ `Point` alias) replaces `ChronicleDocument`.
- 2026-07-13: Added `chronicleSubject.ts` — Layer-1 ChronicleSubject/ChronicleOverlay types, `resolveChronicleView`, and legacy ID compat helpers (see `docs/chronicle-document-architecture.md`).
- 2025-11-22: Added canonical board slug helpers to coordinate logged-in experience rendering.
