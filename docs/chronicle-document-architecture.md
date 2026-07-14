# Chronicle — Selection, Routing, and ChronicleDocument

**Status:** Layer 1 shim + Layer 2 registry (Library pilot) + ChronicleDocument pilot implemented on feature branches. Layer 3 unchanged (`resolveChronicleDeclaration.ts`).

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

## ChronicleDocument — settled name, scoped deliberately

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

### Explicit scope boundary — what ChronicleDocument is *not*

EntityKinds own more than read presentation: Cover ↔ Config orchestration, PATCH save via `useChronicleConfig`, feed loading, assignment fields, credential ops, Act mode (`ChronicleEngagementSurface`), nav label sync, optimistic row patches. `ChronicleDocument` does not replace any of that. `ChronicleDocumentView` sits inside Focus mode — alongside `EntityCoverPresence`, above/below declaration blocks — not instead of the EntityKind stack. Mode stays an explicit axis (`focus | config | act`); Config is not a variant of Document.

### Gloss anchor — decided (2026-07-13)

| Content | Anchor | Survives session? |
|---------|--------|-------------------|
| Real LibraryItem | `{ entityKind: "library", entityId }` via `buildLibraryGlossAnchor` | Yes |
| Synthetic / diagnostic (roadmap, audit) | `{ entityKind: "message", nodeId: "synthetic-{stableKey}" }` via `buildEphemeralSyntheticGlossAnchor` | Session only |
| Synthetic that must persist | Promote to `LibraryItem` first, then library anchor | Yes |

Helpers live in `packages/shared/src/chronicleDocument.ts`. Synthetic Chronicle content without promotion is discussable in Dialog for the session but not guaranteed across sessions.

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
