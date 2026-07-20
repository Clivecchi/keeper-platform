# Chronicle — Selection, Routing, and ChronicleDocument

**Status:** Layer 1 shim + Layer 2 registry (Library pilot) + Document/Point reconciliation landed on `cloud` (`Point` atomic / `Document` container; Dialog.document_status; Point→Moment identity keep; DocumentShell; Dialog DELETE; Forward/Step header). Layer 3 unchanged (`resolveChronicleDeclaration.ts`). Realm's Chronicle still flattens across all Dialogs and has no Path grouping wired — see `realm-chronicle-dialog-scoped` handoff, not yet built.

---

## Why

Chronicle (`UniversalViewPanel` — the Universal Board right panel) decides what to render through three layers with three different levels of health:

1. **Selection arbitration** — which of the current selections wins
2. **Entity → component routing** — which component renders for that selection
3. **Block declaration** — what extra content blocks show beneath the main cover

Layer 3 is a real, working, declarative pattern (`resolveChronicleDeclaration.ts` — DB value first, shared default fallback, per-record overridable). Layers 1 and 2 are not. This document describes what's actually wrong with them and the agreed shape of the fix.

---

## What's actually wrong

### Layer 1 (`resolveKindId()` in `UniversalViewPanel.tsx`)

Looks like "13 mutually exclusive selections." Is actually three different models collapsed into one hardcoded if-chain:

- **Mutually exclusive peers** — dialog, draft, agent, library, key, capability, service, keeper. Nav picks one; handlers clear the rest.
- **Hierarchical context** — journey → path → moment can coexist. `onPathSelect` clears moment but keeps journey. The if-chain isn't arbitrary priority — it's picking the deepest active node in a hierarchy it never names as one.
- **Overlay exception** — `soleMemory` clears nothing and is checked first, so it hijacks display while the underlying selection persists. Overlay behavior, implemented as a priority hack.

A fourth, separate representation of the same concept already exists: trail history in `UniversalViewPanel` stores `{ kind, id }[]` independently — selection state and trail state can drift from each other.

### Layer 2 (`KeeperPresence.tsx`, ~1,900 lines)

Not one problem — three responsibilities stapled into one file:

- Legacy generic presence (schema fetch, field editors, debounced save) — pre-dates the EntityKind recipe
- EntityKind dispatch — the `if (objectType === "library" && layout === "focus" && record)` chain, one branch per kind, growing every time a new EntityKind ships
- Shared enrichment logic

The EntityKind recipe already extracted clean per-kind modules (`LibraryItemFocusPresence`, `resolveLibraryChronicleBlocks`, `libraryItemCoverSchema`, `chroniclePatch.ts`, `libraryItemChronicleTitle`, etc.). The router never caught up to its own pattern.

---

## Agreed shape of the fix

### Layer 1 — explicit subject + optional overlay, not flat nullable IDs

```ts
type ChronicleSubject =
  | { kind: "domain" }
  | { kind: "library"; id: string }
  | { kind: "keeper"; id: string }
  | { kind: "journey"; id: string }
  | { kind: "path"; id: string; journeyId: string }
  | { kind: "moment"; id: string; pathId?: string; journeyId?: string }
  // ...one variant per kind, parent refs typed explicitly, not inferred from which other IDs happen to still be set

type ChronicleOverlay =
  | { kind: "soleMemory"; id: string }
  | { kind: "engagement"; intent: ChronicleEngagementIntent } // already exists as chronicleEngagement
  | null
```

Render rule: `overlay ?? primary ?? domain idle`. Nav actions become `dispatch({ type: "focus", subject })` — one write path, no copy-paste clearing across a dozen handlers. Trail history should share the same `ChronicleSubject` type instead of maintaining a parallel shape — trail navigate becomes `dispatch({ type: "focus", subject: entry.subject })`.

**Explicitly rejected:** replacing the if-chain with a priority-ordered table. That's the same bug in a tidier shape — it still allows impossible states (library + draft both set) and still hides the hierarchy/overlay/exclusivity distinction instead of naming it.

### Layer 2 — registry + thin host, `KeeperPresence` becomes the fallback

```ts
const CHRONICLE_ENTITY_REGISTRY: Partial<Record<EntityKind, ChronicleEntitySpec>> = {
  library: { focus: LibraryItemFocusPresence, config: LibraryItemConfigPresence,
             fetchRecord, resolveBlocks: resolveLibraryChronicleBlocks,
             coverSchema: libraryItemCoverSchema, patchEndpoint, navLabel: libraryItemChronicleTitle },
  key: { /* ... */ },
  // new kind = one registry entry, not another if-block in a 1,900-line file
}
```

Thin router (~50 lines): look up `subject.kind` in the registry, render `focus` or `config` component based on mode. `ChroniclePresenceView` already almost does this shape for `soleMemory` — the move is inverting so the registry is the default path and `KeeperPresence` (legacy generic presence) is the fallback for what hasn't migrated yet, not the other way around.

Layer 3 does not get folded into the router — registry entries reference the existing per-kind block resolvers, they don't replace them.

---

## Naming reversal — decided 2026-07-15, NOT yet in code

Everything below this line up to "Related" was written when `ChronicleDocument` meant the atomic card. Chuck's mental model was the opposite — he expected `ChronicleDocument` to mean the whole container (cover + every entry), with each entry called a **Point** (reusing Draft's existing "points" language). Working through it against the real, shipped interface confirmed the mismatch was real, not a misunderstanding to correct away.

**Decided:** his model wins, going forward.

- **`ChronicleDocument`** = the container. Cover + every Point inside it. A Journey/Dialog (e.g. "Becoming Together") produces one `ChronicleDocument`. "Known Issues" is a second, separate `ChronicleDocument`.
- **`Point`** = the atomic entry. One identity, one title, one body, one status, one Gloss. This is everything the interface below currently calls `ChronicleDocument`.

**What has NOT happened yet:** the real shipped code — `packages/shared` interface, `ChronicleDocumentView` component, `apps/web/src/v0/realm/realmNavGrowth.ts` (`RealmNavEntry.document`), `DomainRealmStory.tsx`, and every doc section below — still uses `ChronicleDocument` in the OLD (atomic/Point) sense. Renaming that is real, multi-file work, scoped as a Cursor task, not done inline here. Until that PR lands: **if you're reading code, `ChronicleDocument` still means what this doc calls `Point` today.** Don't trust this doc section's terminology against current code without checking which side of the rename you're on.

### Verified finding (2026-07-15): the container shell is a Realm one-off, not universal

Checked against real code, not assumed: `ChronicleDocumentView` (the atomic-card renderer — what this doc now calls `Point`) is genuinely reused across three unrelated real contexts — `LibraryItemFocusPresence.tsx` (a real Library item), `LibrarySharedContextRoadmapPanel.tsx` (synthetic content, no DB record), and Realm's story loop. That part is universal, confirmed.

The piece that takes *many* entries and renders them as a sequence under one cover — the actual container-level `ChronicleDocument` as now defined — only exists once: inside `DomainRealmStory.tsx`, hardcoded to Realm's own data hook (`useRealmNavGrowth`), named with words outside this vocabulary ("Story," not "ChronicleDocument"). No other board has needed this shape yet, so it was never extracted into something reusable. This is a real gap, not a false alarm.

**Fix shape (not yet built):** extract a universal container shell — `cover` + `Point[]` in, rendered sequence out — so it can be reused wherever a board needs to show one ChronicleDocument's Points. `DomainRealmStory` (or its renamed successor) shrinks to a thin Realm-specific adapter: fetch Realm's nav-growth data, hand it to the shared shell. Same registry-over-if-chain move already agreed for Layer 2, one level higher. Candidate for a second, separate Cursor PR from the pure rename — different risk, different size.

### Decided (2026-07-15): "Known Issues" is not a second ChronicleDocument

The prototype briefly split "Known Issues" into its own container next to the Story ChronicleDocument. Wrong — an unreviewed layout choice, not a decision, and it broke the rule already settled above: one Dialog produces one ChronicleDocument. Both the Story Points and the Known Issues Points came out of the same "Becoming Together" dialog. A known issue is just a `Point` with `status.tone: "error"` (the interface already has this field) — not a reason for a second container. Merged back into one sequence.

**Parked, real, not this:** a higher-level container holding Points from *multiple different* Journeys/Dialogs together — e.g. Realm showing two separate Journeys' ChronicleDocuments side by side — is a genuine future need (tentatively `ChronicleIndex`). Do not build it to solve a single-dialog case like this one; it solves a different problem (combining documents across dialogs, not organizing Points within one).

### Corrected (2026-07-15): Path, not "tone," is the grouping structure inside one ChronicleDocument

Merging Known Issues into one sequence (previous section) was right, but flattening it into an undifferentiated scroll distinguished only by a status color (`tone: "error"`) was wrong in the other direction. A single Journey/Dialog can legitimately be tracking more than one thread at once — that's not a visual variation, it's **Path**, the real structural concept already in the platform's hierarchy (Domain → Keeper → Journey → Path → Moment). `ChronicleDocument.Points` should be grouped by Path when more than one exists, each Path visibly headed and independently addressable — not merged into one list and told apart by border color. `status.tone` stays a real, separate, per-Point field (solid/pending/error); it answers "what state is this Point in," not "which thread does it belong to." Prototyped in the mockup: two Paths ("Progress," "Known Issues") under one ChronicleDocument, each with its own header and a jump-nav row above the sequence.

### Decided (2026-07-17): Present is a separate rendering system, not a Document status — Rendr's read

Present (the JSON UI Frame system — `Domain.frame_json`, public, unauthenticated, `apps/web/src/v0/slides/`) is architecturally separate from the Universal Board. It renders `SlideType`s, not Documents or Points. Two exist (`companion`, `journey_invitation`); four are planned and unbuilt, including `moment_card` and `path_index` — already-named, not invented today.

Rendr's answers (relayed by Chuck, 2026-07-17), on what `moment_card`/`path_index` should actually do, in experience terms:

1. **Pacing:** not a diary (private, sequential-by-necessity) — a curated exhibition. "Each card is a room you enter, not a page you turn." Chronicle's internal PointView needs no breathing room because the authenticated user already has context; a moment_card meets a stranger cold, so the transition is part of the content, not decoration. Chronicle = density and continuity. Present = sparsity and arrival.
2. **path_index is a choosing surface, not an archive.** Strong curation, not a flat scroll. A visitor doesn't know what they're looking for yet — they pick a thread, they don't inherit the keeper's order.
3. **Path, publicly, is a declared thread, not a working one.** Inside Chronicle a Path can be open/still-forming. In path_index it needs to present as a coherent arc — title, a signal of contents, implied resolution. "Chapter menu," not "table of contents" — a TOC implies reading everything, a chapter menu implies choosing one.
4. **moment_card needs a threshold signal a Point never needed** — something (hero image, short frame line, duration hint) that tells a stranger why this moment matters *before* they read it, because a moment_card has no inherited navigation context the way an internal Point does. Rendr's framing: "less about data model and more about which fields get promoted to first-class visibility."

**Checked against real schema, 2026-07-17 — Rendr's guess was right for Path, not for Moment:**
- `Path.prelude` already exists in the schema, already real, currently unsurfaced anywhere in Chronicle (the Path pills built this session show only name + count). Exactly the "already there, just not promoted" case Rendr predicted.
- `Moment` has only `title` and `narrative` — no hero image, no frame-line, no duration field. The threshold signal Rendr described does not already exist for Moment; it's a real gap, not a surfacing problem. Options, not yet decided: add a real field, derive a frame-line from `narrative`, or reuse Library's existing `resolveLibraryHeroAvatar` hero-image mechanism (confirmed real, already used elsewhere) when a Moment traces back to a Library-sourced Point.

**Not yet done:** no code changes from this — this is design input recorded ahead of any handoff. The pipeline connecting real Moments/Paths into `moment_card`/`path_index` doesn't exist yet; today those SlideTypes aren't even built.

**Parked hypothesis (2026-07-18, Chuck):** a Moment is never actually context-free — the moment it's kept it already has a `journeyId`/`pathId` (confirmed real in schema). So the threshold signal may not need new data on Moment at all — it could be derived from the Path/Journey it's already related to (e.g. `Path.prelude`, already real and unsurfaced) rather than a new field or a borrowed Library hero image. A fourth option alongside the three above, probably the leading one, not decided. Chuck wants to sit with this once `moment_card`/`path_index` are actually visible in UI rather than resolve it in the abstract now.

### Decided (2026-07-18): Forward — three layers, and it replaces Objective, not sits beside it

Grew out of Chuck asking for a "You Are Here" marker in the Document — not a Path (too topical, cross-cutting work touches several at once), not the Cover (identity should stay stable, this needs to be volatile). Turned out the answer already existed on both counts.

**`Journey.forward` is real, already shipped, already load-bearing** — a required `String` field on `Journey`, used across many real surfaces (`JourneyCard.tsx`, `KeeperJourneyPanel.tsx`, Kip's own agent messages, `ActionReceiptCard.tsx`, and more). It is not a new concept. What's missing is a capability, not a field.

**Already real: `publicJourneyCache.ts` → `mapPublicJourneyToNarrative` bridges Journey/Path/Moment into a public Frame**, and its own comment says "Cover Forward, Present, and Journeys browse share one fetch." `Path.prelude` already ships through this pipeline publicly — correcting an earlier note in this doc that called it "unsurfaced anywhere"; that was true only for Chronicle, not for Present.

**Three layers of Forward:**
1. **Authored** — real today. Static text, set once, unconnected to live state.
2. **Walks the next Moment** — for a public/static journey, advancing through already-kept Moments in sequence. Not built; a natural extension of the existing public pipeline.
3. **Shows the next self-organized Point** — the internal, Document-side "You Are Here." Not built; requires the self-organizing capability that's still parked.

**Point vs. Moment for Forward's target — resolved as context-dependent, not either/or:** Present-side Forward should target a **Moment** (kept, vetted, matches Rendr's "declared, coherent" guidance for public content). Document-side "You Are Here" should target a **Point** (the live edge of work, often not yet kept — pointing only at Moments would make it lag behind what's actually happening). Same internal/public split this whole document already runs on, applied to what Forward resolves to.

**Per-user state — resolved the same way, for the same reason:** Present-side Forward should be per-visitor (a bookmark/resume position — different visitors are legitimately at different points in public content). Document-side "You Are Here" must stay singular and shared — personalizing it per agent would recreate the exact problem this whole effort exists to prevent: five agents holding five different pictures of where things stand.

**Structural decision: Forward replaces the Objective card, not a new slot next to it.** The Objective card was already sitting in the right place — after the cover meta, before the Paths, always visible, never collapsed — and was already doing Forward's authored-layer job (stating the expected outcome) without the evolving layer. Same card, same position, renamed. Content stays substantively the same for now; it becomes dynamic once the self-organizing mechanism (Layer 3) is actually designed and built — not yet.

### Decided (2026-07-19): Back/Forward as a nav pair, anchored to the real evolution lineage

Caught a real conflation in the decision above: if the Forward card's content just keeps getting overwritten by whatever the current step is, the authored destination (Layer 1) disappears — a live position tracker replaces the North Star instead of sitting next to it. Fix: keep the evolving step content and the stable authored destination visually separate, not merged into one card.

**Layout:** step content stays prominent at top of the Forward card (unchanged). A new row sits directly beneath it, before the Path list: **Back** (left) and **Forward** (right), not a continuation of the card's prose.

**Not two arbitrary buttons — one lineage, two directions.** Moments already carry `evolvedFromMomentId`, a real lineage chain (decided 2026-07-15/16). **Back** walks to the Moment/step this one evolved from. **Forward** advances toward the current tip of that chain — and when already at the tip, Forward is what's anchored to the authored `Journey.forward`, the overall destination, not just "next." The authored destination is the far end of the same lineage, not a competing card.

**Prototyped in the mockup, honestly non-functional:** both buttons render disabled with a tooltip explaining why — there's no real evolution lineage to walk yet since Layer 3 (self-organizing "You Are Here") isn't built. Not faked.

**Worth noting:** this structure — a lineage with Back/Forward navigation — is the same shape Present will eventually need for its own filmstrip (moving between Moments/slides). Internal Document and public Present ending up with structurally compatible navigation isn't a coincidence to design around later; it's the same underlying lineage serving two audiences, matching the "must work universally, not just for this build" requirement.

### Decided (2026-07-19): Step is a role, not a new type — and it needs to visually read as "now," not as the destination

Caught a real gap in the previous decision: Back/Forward existed as labels with nothing to walk, because no Step existed yet. Fixed by prototyping one real Step in the mockup, with real content describing the actual current state of this design conversation — not filler.

**"Step" checked against real code before adopting it** — `Step` already exists as a word in the codebase (`ProcessStep`, `SetupStep` for onboarding wizards; `ShareWorkflowStep` for an unrelated sharing feature). Close enough in meaning to be fine, not identical enough to collide the way "Frame" did. Adopted.

**A Step is not a new entity.** It's a Point or Moment, specifically when it's the one currently sitting at the tip of Forward's lineage. Same underlying thing as everywhere else in this document — a role/context, not a fourth type alongside Point/Moment/Path/Document.

**Placement:** inside the Forward card, directly beneath Forward's title, above Forward's own body text. Not a separate card — "inhabits that space" rather than sitting beside it.

**Visual treatment: deliberately different from Forward, on purpose — a glass/frosted look** (translucent background, backdrop blur, soft inset highlight) distinct from the flat opaque cards used everywhere else in the Document. The visual difference is the signal that a Step is "now," not "the destination" — Forward stays plain prose; the Step reads as its own distinct surface floating inside that space.

**Back/Forward now honestly disabled, not just unbuilt-disabled.** With exactly one Step (the first), there is genuinely no prior step (Back correctly has nothing) and no next step yet (Forward correctly has nothing beyond the authored destination). Tooltips updated to say this precisely, rather than reading as a broken/unfinished feature.

### The lesson (2026-07-19): the first Step went stale within the same conversation that built it

Real thing that happened, worth keeping on record because it's the clearest evidence this whole feature exists to address. The Step card's content was written, then several more rounds of real design work happened (collapse-by-default, brightness hierarchy, the glass treatment) — and the Step's own text never got updated to reflect any of it. It sat there describing an earlier version of itself while the conversation moved on. Chuck caught it directly: *"We lost the step we were on."*

Fixed by re-verifying real state (git log, `DraftFocusPresence.tsx`) and rewriting the Step honestly — including the fact of its own staleness, not papering over it. Also dropped the visible word "Step" from the UI (title + text only now, no badge) and set the Step's title color to match its own outline (`--moss`) rather than a separate tone.

**Why this matters beyond a copy fix:** a hand-maintained "current step" cannot stay current by itself — the exact gap Layer 3 (self-organizing Forward) was meant to close, and still hasn't been built. This incident isn't a side note to that design decision. It's the first real data point for it.

### Verified (2026-07-19): Realm's Story never actually scoped to one Dialog — Chronicle still shows everything, always

Chuck compared the real board (`/d/ke3p?board=realm`) against the reference mockup directly and called it: doesn't read as one Document, reads as noise. Checked against real code, not assumed:

- `DomainRealmStory.tsx`'s `storyEntries` flattens every Dialog group's kept/drafts/presented into one combined `points` array, unconditionally. The flattening problem `realm-nav-dialog-scoped` fixed for Nav was never applied to the Document body itself — Nav shows Dialog-scoped groups, Chronicle ignores them and always renders the full domain. Contradicts this doc's own settled model: "Each Dialog has exactly one Document."
- `DocumentShell`'s `paths` prop (built specifically for Path grouping — see "Path, not tone" above) has never been fed real data by Realm; `DomainRealmStory` doesn't pass it at all. Root cause confirmed by reading the backend route directly: `Moment.pathId`/`Path.name` are real Prisma fields (`schema.prisma:262,282,296-298`), but `apps/api/src/routes/v0/moments.ts`'s Prisma `select` never included them, so they never reach the frontend's `KeptMomentSummary` type. Not a rendering bug — the data never left the database.
- `draftToRealmNavEntry`/`momentToKeptNavEntry` (`realmNavGrowth.ts`) set `lede` and `body.text` to the identical string whenever a summary exists — `PointView` renders both fields, so the same text visibly repeats under every Point that has one. A real bug, not a design choice — found by tracing the screenshot back to the mapping function, not by inspecting the doc.

**Decided (2026-07-19), asked directly before scoping the fix:**
1. **How Chronicle learns which Dialog to show:** both mechanisms, not either/or — clicking any draft/moment/library item (already sets real selection state) derives its owning Dialog; a new click handler on the Dialog's own Nav group header also jumps straight to that Dialog's Document. Mutually exclusive, the same "pick one, clear the rest" pattern already used for existing selection state. This does **not** attempt the full Layer 1 `ChronicleSubject` rewrite described above — it adds one more selection kind to the existing pattern, deliberately smaller in scope.
2. **What shows before anything is selected:** an explicit prompt ("Select a Dialog to see its Document"), not an auto-picked default and not the current flattened everything-feed — consistent with this project's standing preference for an honest not-yet-built state over a guessed one.

Scoped as handoff `realm-chronicle-dialog-scoped`.

### Noted (2026-07-15): a Point may be a Moment, and Moments evolve

A `Point` isn't necessarily static content — it can be backed by a real `Moment` (Domain → Keeper → Journey → Path → Moment), and Moments have evolutions over time. What renders as "the Point" is the Moment's current/most-recent state, not a frozen snapshot from when it was first kept. Same adapter shape already established for `ChronicleDocument` itself (EntityKind adapter → document), applied one level down: a Moment-backed Point re-resolves to whatever the Moment's latest state is, same as a Library-backed Point already does via `buildLibraryGlossAnchor`.

### Decided (2026-07-15): Draft and Document reconcile into one thing — Point = Moment, not Point-becomes-Moment

Big reframe:

- **Drop "Chronicle" from the name.** It's the render surface, not an entity. Container → **`Document`**. Atomic card → **`Point`**.
- **Draft is not a separate type from Document — it's a status on Document.** `Drafts → Kept → Presented` is lifecycle status, not three models requiring conversion.
- **Each Dialog has exactly one Document.** Points live inside it; the Document crystallizes the Dialog's conversation into structure.
- **A Point becomes a Moment when kept** — identity carries through (same id or explicit lineage), not delete-and-recreate of a disconnected row.
- **A kept Moment keeps evolving.** Later Points can target an existing Moment; keeping one evolves that Moment.
- **Path assignment happens at keep-time when known;** Moments may be kept without a Path and assigned later. Extends `DraftPathEmergence`, does not replace it.
- **Self-organization is the real gap** — named, not built in this pass.

**Schema decisions (Cursor, 2026-07-17, on `cloud`):**
1. **Document↔Dialog:** Dialog is the Document's durable identity (1:1). `Dialog.document_status` (`drafts`|`kept`|`presented`) is the lifecycle field. No separate Document table.
2. **kip_drafts:** Repurposed as the Document's Point manuscript store (not migrated/renamed). `dialog_id` links the manuscript; Points stay in `spec_json.points`.
3. **Point→Moment identity:** `Moment.id = Point.id` for the primary moment on first keep; `Moment.sourceDraftId` + `Moment.sourcePointId` for queryable lineage; evolution updates the existing Moment row.

### Noted (2026-07-17): rename landed — container types next

`Point` is the atomic card interface; `Document` is the container type in shared. `PointView` renders Points. Universal `DocumentShell` + keep-with-identity land in subsequent commits on this handoff.

---

## ChronicleDocument — settled name, scoped deliberately (pre-reversal — atomic-card meaning, superseded above)

**Naming note:** the platform already overloads "Frame" (`V0FrameKey`, `jsonframe`, board frames, `resolveChronicleFramePatchEndpoint`). The working name "Chronicle Frame" used earlier in this investigation would have collided with all of that — caught before it shipped anywhere. Settled name: `ChronicleDocument`.

The presentation shell prototyped during this investigation (identity label, title/lede, clamped expandable body, status, a Gloss action into Dialog) turned out to render identically whether content came from a real database entity (a Library item) or synthetic content with no database backing (diagnostic findings, a project roadmap). That's a real, demonstrated read/presentation contract — not a new EntityKind, and not a replacement for one.

```ts
interface ChronicleDocument {
  identity: { label: string; subtitle?: string; voice?: string }
  title: string
  lede?: string
  body: { text: string; clampLines?: number; expandable?: boolean }
  status?: { label: string; tone: "pending" | "active" | "error" }
  gloss?: { anchor: GlossAnchor; snapshot?: GlossContentSnapshot }
  hero?: CoverHeroContent  // reuse existing cover types
}
```

Two producers, one consumer:
- **EntityKind adapter** — real record → fetch → cover schema + blocks (layer 3) → `ChronicleDocument`
- **Synthetic provider** — roadmap steps, audit findings → `ChronicleDocument` directly, no DB

### One card, not the whole page — a distinction that wasn't written down until it caused real confusion

A `ChronicleDocument` is the atomic unit — one identity, one title, one body, one status, one Gloss. It is not a container and does not hold a list of other things.

What holds a list of `ChronicleDocument`s is the **Story** — a sequence of them, rendered together, one per thing that actually happened. A Journey or Dialog (e.g. "Becoming Together") is not itself a `ChronicleDocument` — it's the source that *produces* a Story. Each Moment, Library item, or Draft that gets promoted into that Journey becomes its own separate `ChronicleDocument`, shown in sequence with the others.

This is a different relationship than a Draft's Points: Points are sub-fields of *one* record — one Draft, several Points, still one document. A Story is *many separate records*, each its own document, shown together. Similar shape at a glance, different relationship — worth being precise about, since conflating them is exactly how "is the whole page one ChronicleDocument, or is each card one" becomes genuinely ambiguous instead of just underspecified.

### Explicit scope boundary — what ChronicleDocument is *not*

EntityKinds own more than read presentation: Cover ↔ Config orchestration, PATCH save via `useChronicleConfig`, feed loading, assignment fields, credential ops, Act mode (`ChronicleEngagementSurface`), nav label sync, optimistic row patches. `ChronicleDocument` does not replace any of that. `ChronicleDocumentView` sits inside Focus mode — alongside `EntityCoverPresence`, above/below declaration blocks — not instead of the EntityKind stack. Mode stays an explicit axis (`focus | config | act`); Config is not a variant of Document.

### Gloss anchor — decided (2026-07-13)

| Content | Anchor | Survives session? |
|---------|--------|-------------------|
| Real LibraryItem | `{ entityKind: "library", entityId }` via `buildLibraryGlossAnchor` | Yes |
| Synthetic / diagnostic (roadmap, audit) | `{ entityKind: "message", nodeId: "synthetic-{stableKey}" }` via `buildEphemeralSyntheticGlossAnchor` | Session only |
| Synthetic that must persist | Promote to `LibraryItem` first, then library anchor | Yes |

Helpers live in `packages/shared/src/chronicleDocument.ts`. Synthetic Chronicle content without promotion is discussable in Dialog for the session but not guaranteed across sessions.

### Gloss-write for external tools — shipped (2026-07-15)

External MCP callers (Claude-in-chat, Cursor, future Cowork sessions) had `library.ro` only — read-only on Library records. That stays correct: no external tool gets write access to Library entities.

**Narrow write path:** `gloss_write_turn` MCP tool with capability `gloss.rw` (distinct from `library.ro`). Appends one turn to `kip_messages.metadata.glossThreads` for a domain-bound dialog message. **Never** mutates the anchored `LibraryItem`, Draft, Moment, or any other entity — read-only existence checks only.

**Auth:** Reuses domain access key / scoped MCP pattern from `library.ro` (`DomainAccessKey.scopes`, `KAM_LIBRARY_MCP_KEYS`, platform key `*`).

**Preconditions (met):** `GlossAnchor` shape in `@keeper/shared`; MCP capability gate via `requiredCapability` + merged scopes.

**Service:** `apps/api/src/services/GlossWriteService.ts` — `appendGlossTurn()`.

**Example:**
```json
{
  "name": "gloss_write_turn",
  "arguments": {
    "messageId": "<kip_message_uuid>",
    "anchor": { "entityKind": "library", "entityId": "<library_item_id>", "nodeId": "card" },
    "content": "Question from external agent",
    "role": "user"
  }
}
```
Requires `gloss.rw` scope on the access key and matching `x-domain-id`.

**Chronicle Gloss → Dialog carrier (2026-07-15):** `ChronicleDocumentView` Gloss button calls `requestDiscussDraftPoint` with the document's `gloss.anchor` + snapshot. After the user's first Dialog exchange, `ensureGlossThreadCarrier` seeds an empty gloss thread on the user message — that `messageId` is the MCP write target for external agents annotating the same anchor.

---

## How the three layers fit together (target picture)

```
Nav click
  → dispatch(focus subject)              [Layer 1: single subject + optional overlay]
  → registry[subject.kind]               [Layer 2: lookup, not if-chain]
  → FocusPresence orchestrator
      → EntityCoverPresence              [cover slot — already shared]
      → adapter → ChronicleDocumentView  [optional shared read shell]
      → DeclarationChronicleBlocks       [Layer 3: resolveBlocks(record)]
      → ChronicleConfigShell             [when mode = config]
```

Synthetic content skips fetch/registry and mounts `ChronicleDocumentView` directly, but goes through Dialog/Gloss the same way real entities do.

---

## Related

- `docs/library-shared-context-roadmap.md` — companion document; Library's read/search work (steps 3–5) and this registry work touch the same Chronicle presence layer.
- Prototype: "Library — Now Showing" artifact — Dialog + Chronicle mockup, demonstrated the ChronicleDocument shape working across a real entity and synthetic content before this document existed.
