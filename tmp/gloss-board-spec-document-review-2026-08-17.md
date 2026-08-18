Cursor · Board spec Document Review (2026-08-17)

Gloss-only / not a build lock. Independent code-verify of the August 2026 Board Rename, Universal Rendering Invariant, Glossary Nav spec. No code was changed in this pass.

## Verdict vs Section 7 self-report

The prior pass's checkmarks hold for Tasks 1–3 with one already-flagged partial (Design Glossary save) and Task 4 still not started.

**Complete**
- Soft rename: internal key stays `ide`; display is Build / Build Board; URLs write `?board=build`; `?board=ide` still parses. Confirmed in `workspaceBoardNav.ts`, `domainWorkspaceBoards.ts`, `boardCapabilityCeilings.ts`, session `dialogBoard: def.boardId`.
- Top-bar and sidebar board labels: Realm · Domain · Build · Design · Agent. No user-facing "IDE" strings remain.
- Board-emphasis invariant + per-board lens table live in `docs/keeper-object-glossary.md` as governing-tier content. Standing exceptions for Draft / Moment / Library / Domain-idle are documented and still present in code (`UniversalViewPanel` Realm Document fork, `CHRONICLE_ENTITY_REGISTRY` library-only, domain-idle synthetic Document panel). Fork was not patched.
- Domain sidebar has a top-level Glossary `SidebarCard` (not nested in Library). Chronicle renders `GlossaryPresence` from the bundled markdown.

**Partial**
- Design board is the definition-ownership surface (`glossary: true`, Chronicle `layout: "config"`), but there is no in-product save. Source of truth remains `docs/keeper-object-glossary.md`. Matches Board Definitions (read-only code spec, no PATCH).

**Not started**
- Task 4 ingestion bridge. Existing near-misses are the wrong objects: LibraryItem upload, Kip file attachments (inlined into the model, not a Document), and `gloss-cursor-to-dialog.ts` (Gloss turns onto Becoming Together — this message — which does not create Points or a new Dialog). `POST /api/domains/:domainId/kip/dialogs` creates empty Dialogs from title + scope only.

## Follow-ups (not decided here)

- Re-run `deploy-object-glossary-read-access.ts --execute` — script source already includes the invariant; live Training Mode injection is not verifiable from the repo.
- This Gloss thread is attached to the existing Becoming Together Dialog. That is a useful signal for Task 4 (attach to an existing Dialog vs create a new one), not a substitute for building the ingestion path.
- Task 4 needs its own Cursor pass: ingest external markdown as Dialog + linked Document Points, attach-if-dialog-present else create-new, never as Library.
