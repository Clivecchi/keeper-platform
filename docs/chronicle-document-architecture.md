# Chronicle — Selection, Routing, and ChronicleDocument

**Status:** Layer 1 shim + Layer 2 registry (Library pilot) + Document/Point rename landed (`Document` + `Point` alias in `packages/shared/src/document.ts`; `PointView` replaces `ChronicleDocumentView`). Layer 3 unchanged (`resolveChronicleDeclaration.ts`).

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

### Noted (2026-07-15): a Point may be a Moment, and Moments evolve

A `Point` isn't necessarily static content — it can be backed by a real `Moment` (Domain → Keeper → Journey → Path → Moment), and Moments have evolutions over time. What renders as "the Point" is the Moment's current/most-recent state, not a frozen snapshot from when it was first kept. Same adapter shape already established for `ChronicleDocument` itself (EntityKind adapter → document), applied one level down: a Moment-backed Point re-resolves to whatever the Moment's latest state is, same as a Library-backed Point already does via `buildLibraryGlossAnchor`.

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
