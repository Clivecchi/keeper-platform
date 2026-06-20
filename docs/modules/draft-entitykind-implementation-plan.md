# Draft EntityKind — Implementation Plan

**Status:** Canonical plan for Domain board Draft migration  
**Date:** 2026-06-19  
**Supersedes:** EntityKind portions of `docs/drafts-implementation-plan.md` (2026-02-12). Keeper scoping, versioning, and propose/accept are **already in code** — this plan covers Chronicle migration and collaboration UX.

**Test surface:** `/d/:slug?board=domain` only — not legacy `?frame=*`.

---

## 1. Product framing (locked)

> **Draft is Keeper's staging and collaboration surface** — a Project-like workspace where human and Kip shape precise accepted units before they become Journey, Moment, domain JSON, or build work.

| Layer | What | Phase |
|---|---|---|
| **Draft (EntityKind)** | Persistent `kip_drafts` — points, versions, Dialog link | **Phase 1** |
| **Collaboration** | Kip proposes → human Accept (chat + Chronicle) | **Phase 1** |
| **Gloss** | Selection → anchored Dialog (addressing) | Parked — prep only |
| **Render mode** | Live structure without persist commitment | Parked — Phase 4 |
| **Promote** | Graduation to Keeper structure / `frame_json` | Phase 3 |

**Rejected for this plan:** Draft as “only a state on every EntityKind” (June 17 external framing). Storage and Nav treat Draft as its own record; render/persist split is conceptual only until render mode ships.

---

## 2. Terminology (locked)

| Term | Meaning | Runtime |
|---|---|---|
| **Sequence** | Theatre.js / Present **motion** (Treatment) | `@theatre/core`, `buildPresentProjectState.ts` |
| **Keeper Pattern** | Glossary for universal shape + declared UI — **not a module** | EntityKind Recipe, Focus·Config·Act, Nav→Chronicle |
| **Engagement template** | Declared **workflow** Act (create, promote) | `engagement_templates` + `ChronicleActPresence` |
| **Layer 2 adapter** | Per-kind files plugging into universal Layer 1 | `{Kind}FocusPresence`, `{kind}CoverSchema`, etc. |

Do not call engagement lifecycles or Draft status flows “sequences” in code/docs — use **template**, **lifecycle**, or **pipeline** to avoid colliding with Presents.

---

## 3. Architecture

### 3.1 Universal Layer 1 (shared — no Draft-specific chrome)

- `UniversalNavPanel` — list, select, `+` trigger only  
- `UniversalViewPanel` → Focus presence  
- `EntityCoverPresence` — five fixed slots  
- `ChronicleConfigShell` + `useChronicleConfig` — Config + Save  
- `ChronicleActPresence` — Acts (not generic `EngagementForm`)  
- `PresentMotionProvider` — Theatre handoff (`CoverMotionValues`; names fixed in `coverTypes.ts`)  
- Existing API: `draft.create`, `draft.update.propose`, `draft.point.accept`, PATCH, versions, `setActive`

### 3.2 Layer 2 adapters (Draft — required by EntityKind Recipe)

| Adapter | Role |
|---|---|
| `draftCoverSchema.ts` | Map draft record → five cover slots |
| `DraftFocusPresence.tsx` | Cover ↔ Config orchestration (mirror `DialogFocusPresence`) |
| `DraftConfigPresence.tsx` | Title + status Save — **not** point blobs |
| `DraftChronicleBlocks.tsx` | Body: points, Dialog/sessions, later versions |
| `DraftPointsSection.tsx` | Point rows with stable `id` (extend for Accept + Gloss prep) |

These are **not bespoke UI** — they fill the same universal holes with Draft-shaped data (like `JourneyChronicleBlocks` for paths).

### 3.3 Target flow

```
Nav: list drafts · select · + → requestChronicleEngagement('draft.create')
Chronicle: DraftFocusPresence
  Cover: EntityCoverPresence + Present motion (slide or draft sheet)
  Body: accepted / under-consideration points · Accept · optional Dialog link
  Config: title, status
Dialog: DraftPointProposeCard + shared accept hook · open draft in Chronicle on success
API: existing kip-drafts + agent actions (no parallel pipeline)
```

---

## 4. Gloss-readiness (constraint, not feature)

Gloss is **not built**. Phase 1 must not require hover/long-press.

**PR checklist:**

- [ ] No single textarea holds all draft content  
- [ ] Each collaboratable unit has UUID in DB (`spec_json.points[].id`)  
- [ ] UI renders points as separate rows/cards with `data-point-id`  
- [ ] Dialog can receive anchor context `{ entityKind, entityId, nodeId? }` without Gloss gesture  
- [ ] Points-only writes (`canonicalizeDraftSpecJson`); no new `sections` from Domain board  

Phase 1b: export `GlossAnchor` type in `@keeper/shared`; optional “Discuss this point” stub passing `{ draftId, pointId }` to Dialog.

---

## 5. Phases

### Phase 0 — Content shape + URLs (~1 session, parallel)

| # | Task | Done when |
|---|---|---|
| 0.1 | Confirm/run `backfill-draft-sections-to-points.ts` if sections-only rows remain | Backfill run or N/A |
| 0.2 | Fix `buildDraftOpenUrl` → Domain board (`?board=domain`) + draft selection | Receipt links correct |
| 0.3 | Mark legacy `DraftCard` / `IDEDraftPanel` sections UI as legacy-only (not Domain board path) | No sections writes from Universal Board |
| 0.4 | Import Gloss spec to `docs/gloss-interaction-pattern.md` when docx available | Optional doc |

**Does not block Phase 1:** legacy Agent frame sections editor.

---

### Phase 1 — Draft EntityKind MVP (~2–3 sessions)

**Goal:** Usable on ke3p Domain board for real planning.

#### 1.0 Present / Treatment (universal motion)

- Wire `DraftFocusPresence` through `PresentMotionProvider`  
- **Default:** `present="slide"` OR add `draft` sheet to `buildPresentProjectState.ts` (unhurried workshop feel — tune in Theatre Studio dev-only)  
- Do **not** use Theatre for status lifecycle or propose/accept logic  

#### 1.1 Cover

- `draftCoverSchema.ts` — hero (status/kind), identity (title), traits (keeper, point counts, updated), credits (agent), actions (Manage, Set active)  
- `draftChronicleTitle()` shared with Nav label (pattern: `keyChronicleTitle`)  

#### 1.2 Focus orchestrator

- `DraftFocusPresence.tsx` — mirror `DialogFocusPresence.tsx`  
- `KeeperPresence.tsx`: route `objectType === "draft" && layout === "focus"` → `DraftFocusPresence`  
- **Remove** generic draft branch (inline fields + bolt-on `DraftPointsSection`)  

#### 1.3 Body / collaboration

- `DraftChronicleBlocks.tsx` — wraps enhanced `DraftPointsSection`  
- **Accept in Chronicle** — same API as chat (`KipApi.acceptDraftPoint`)  
- Shared **`useDraftPointAccept`** hook — used by `UniversalConversation` + Chronicle  
- After accept: `bumpDraftPresence` + `bumpDraftNav` + patch chat receipts when same session  
- **Accept-only v1** — no Reject API; dismiss in chat stays local  

#### 1.4 Config

- `DraftConfigPresence.tsx` — `title`, `status` (enum), `kind` read-only  
- **Explicit Save** via `useChronicleConfig` — not autosave metadata form  
- Post-save: `bumpDraftNav({ draftId, title })`, `onLabelResolved`  

#### 1.5 Nav + board context

- Nav `+` → `requestChronicleEngagement('draft.create', { domainId, keeperId, dialogId? })`  
- Add **`bumpDraftNav`** to `UniversalBoardContext` (mirror `bumpJourneyNav`)  
- Generalize `ChronicleEngagementSurface` onSuccess — bump draft nav for draft slugs (not only `bumpJourneyNav`)  

#### 1.6 Engagement template

Seed `draft.create`:

| Field | Notes |
|---|---|
| `title` | Required |
| `kind` | Default `journey_spec` |
| `keeperId` | Prefill from selection |
| `dialogId` | Optional — when created from Dialog focus |

Executor: POST `/kip/drafts` → select draft → `bumpDraftNav`.

#### 1.7 Dialog / Project linkage

- Set `dialog_id` on create when Dialog context present (column exists)  
- Chronicle block: linked Dialog + sessions with `active_draft_id` or matching `dialog_id`  
- Cover action: **Set active** for current session (`draft.setActive` / session endpoint)  

#### Phase 1 acceptance

- [ ] Nav lists drafts; `+` creates via Act  
- [ ] Chronicle shows EntityKind cover (not generic KeeperPresence form)  
- [ ] Accept works in **chat and Chronicle**  
- [ ] Config saves title/status; Nav label updates  
- [ ] Keeper scope on cover + Nav  
- [ ] Present motion on Draft focus  
- [ ] `pnpm run smoke` passes  
- [ ] Folder READMEs + `docs/modules/` sync per readme-policy  

**Suggested PR split:**

1. `DraftFocusPresence` + cover schema + Present wire + Accept on points  
2. Nav `+`, template seed, `bumpDraftNav`, engagement onSuccess  

---

### Phase 1b — Project depth + Gloss types (~1 session)

| Task | Deliverable |
|---|---|
| Dialog sessions block | Sessions tied to draft / dialog |
| “Discuss this point” | Pass `{ draftId, pointId }` to Dialog context (no Gloss gesture) |
| Version strip | Read-only last N from `GET .../versions` |
| `GlossAnchor` type | `@keeper/shared` — types only |
| Optional | `draft_points` in `integrationChronicleDeclarations.ts` + variant if block order should be DB-driven |
| Extract `PointRow` | Shared row with `data-point-id` for future Gloss |

---

### Phase 2 — Collaboration depth (~2 sessions)

| Task | Notes |
|---|---|
| Reject semantics | Product decision — default: `rejected` status, hidden from summary |
| `draft.addPoint` template | Human-authored point → proposed |
| Agent restructure | `draft.points.merge` / restructure — design after 1b usage (“waves not points”) |
| Env | `draftsDirectory` shows accepted/proposed counts |

**Out of scope:** render mode, Gloss gesture, Rendr live mapping.

---

### Phase 3 — Promote executors (~2–3 sessions)

| Kind | Target |
|---|---|
| `domain_json` | Unify Designer publish + Act `draft.promote.domain` → `Domain.frame_json` |
| `journey_spec` | Act → `journey.create` + map accepted points |
| Status gate | Default permissive on ke3p; tighten later |

---

### Phase 4 — Render mode + Gloss (gated)

**Prerequisites:**

1. Rendr jurisdiction decision (runtime Chronicle — not Design-board-only)  
2. Gloss spec in repo  
3. Draft v1 used on ke3p for real builds  

Work: Gloss gesture, render mode ephemeral UI, three-zone confidence, phrase selection → point.

---

## 6. Kip · Cloud · Rendr

| Phase | Kip | Cloud | Rendr |
|---|---|---|---|
| 1 | propose points; `draft.create` | adapters, template seed, hooks, URL fix | cover schema, blocks, Present sheet |
| 1b | anchor in Dialog | `GlossAnchor`, session queries | PointRow, version strip |
| 2 | restructure actions | reject API, add-point template | reject UI |
| 3 | promote prompts | promote executors | promote Acts |
| 4 | live mapping | render state bus | Gloss + confidence zones |

---

## 7. Files (Phase 1)

**New**

- `apps/web/src/v0/presence/cover/schemas/draftCoverSchema.ts`  
- `apps/web/src/v0/presence/cover/DraftFocusPresence.tsx`  
- `apps/web/src/v0/presence/integrationChronicle/DraftChronicleBlocks.tsx`  
- `apps/web/src/v0/presence/integrationChronicle/DraftConfigPresence.tsx`  
- `apps/web/src/hooks/useDraftPointAccept.ts` (or `apps/web/src/v0/boards/draft/`)  
- `packages/database/prisma/seeds/draft-engagement-templates.seed.ts`  

**Modify**

- `KeeperPresence.tsx`, `DraftPointsSection.tsx`  
- `UniversalNavPanel.tsx`, `UniversalBoardContext.tsx`, `UniversalBoard.tsx`  
- `ChronicleEngagementSurface.tsx`, `UniversalConversation.tsx`  
- `apps/api/src/api/domains/kip-drafts.ts` (`buildDraftOpenUrl`)  
- `buildPresentProjectState.ts` (optional `draft` sheet)  
- Relevant folder READMEs + `docs/modules/` copies  

---

## 8. Explicitly out of scope

- Render mode UI  
- Gloss hover/long-press  
- Draft as third Chronicle shell mode (Focus · Config · Act only)  
- Nav inline forms  
- Generic `EngagementForm` on board Chronicle  
- Theatre-driven status transitions  
- `journey_id` on drafts  
- Replacing `DesignerDraftContext` in Phase 1  
- Universal “Sequence Engine” unifying Theatre + templates  

---

## 9. Open decisions — defaults

| Decision | Phase 1 default |
|---|---|
| Reject | Defer; chat dismiss only |
| Kind at create | `journey_spec`; read-only in Config after |
| Dialog required | No |
| Promote | Phase 3 |
| Present | `slide` until `draft` sheet tuned |

---

## 10. Quality review — platform rules compliance

Reviewed against `AGENTS.md`, `docs/keeper-ui-experience.md`, `docs/entitykind-implementation-recipe.md`, and codebase (2026-06-19).

| Rule | Plan compliance |
|---|---|
| Universal Board only (`?board=domain`) | ✅ |
| Nav triggers, Chronicle renders | ✅ Nav `+` → Act; no Nav forms |
| Focus · Config · Act — no fourth shell | ✅ Collaboration in Focus body + Dialog |
| Declared UI — `ChronicleConfigShell` / `ChronicleActPresence` | ✅ |
| No `EngagementForm` on board Chronicle | ✅ |
| EntityKind Recipe seven layers | ✅ All layers addressed |
| Layer 2 adapters, not bespoke chrome | ✅ `EntityCoverPresence` + shared shells |
| Code wins over external session docs | ✅ Builds on existing API/actions |
| Sequence = Theatre/Presents only | ✅ Documented; lifecycle not Theatre |
| Gloss prep without Gloss UI | ✅ Checklist in §4 |
| SOLE vs Draft separation | ✅ Unchanged; drafts for specs not memory |
| readme-policy on implementation | ✅ Required on folder changes |
| `pnpm run smoke` before commit | ✅ When Chuck requests commit |

**Risks to watch during build:**

1. **`ChronicleEngagementSurface` hardcodes `bumpJourneyNav`** — must generalize for draft templates.  
2. **Legacy `KeeperPresence` autosave on draft title** — remove when routing to `DraftFocusPresence`.  
3. **`EntityCoverMode` includes `act` in `coverTypes.ts`** — Journey uses inline Act; follow Journey pattern for draft Acts via cover actions + board engagement, not a new mode family.  
4. **Do not flatten points into Config** — Chuck constraint; Config = metadata only.  

---

## 11. Success statement

Phase 1 complete when ke3p Domain board supports: create/select Draft, plan with Kip in Dialog, accept points in Chronicle and chat, and see a stable Project-like workspace — with Present motion, Gloss-ready point rows, and no dependency on render mode or Gloss gesture.

---

## 📆 Update Log

- **2026-06-19** — Canonical plan: EntityKind migration, collaboration framing, Sequence vs Keeper Pattern glossary, Theatre Present wire, Gloss-readiness, Anthropic/render-mode synthesis, quality review against platform rules.
