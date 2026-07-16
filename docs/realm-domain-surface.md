# Realm — Domain Surface

**Status:** implemented on `feat/realm-domain-surface` branch (July 2026). Companion to `docs/chronicle-document-architecture.md` (ChronicleDocument, shipped) and `docs/library-shared-context-roadmap.md` (Library roadmap, in progress).

---

## What this is

Realm currently exists in code as a per-user home/arrival experience (`RealmHomeChronicle`, `RealmArrivalContext`, the `boardId === "realm"` branch in `UniversalViewPanel`). This document is about generalizing it: **every domain gets a Realm**, and it becomes that domain's primary surface — not a side view, the front door.

The reasoning that got us here: a domain's Nav today is hand-built categories waiting to be filled (see ke3p's own Domain board — eighteen "Domain JSON" drafts, a category literally named "TRUE," fifty drafts total, most from testing). A Realm's Nav should hold only what's real — built by `ChronicleDocument` accumulation, not pre-built by a developer guessing what categories might someday matter.

A working prototype of the interaction model exists ("Ke3p — Library — Becoming" artifact, this session). It proved the *structure*. It did not decide the *look* — see Treatment compliance below.

---

## The three-panel shape

**Nav** — staged, not flat. Content moves through stages as it matures: **Drafts** (in progress) → **Kept** (settled — matches the product flow language `Capture → Shape → Keep → Show`) → **Presented** (public-ready, matches the Present surface). Each stage shows only what's actually there. Empty stages say so plainly rather than showing nothing or a fake placeholder.

**Dialog** — one Dialog is the entry point, not a list of many. Its header carries the **cast**: everyone (agent or person) who's part of this domain's Realm, with status (active / present / access-unconfirmed), and light actions — invite, get a key, manage. This is the existing agent-selector bar (`Cloud | Rendr | Services | Railway | Vercel | GitHub`, seen live on the ke3p IDE board) doing more, not a new surface next to it.

**Chronicle** — the domain's cover, then a growing **Story**: one `ChronicleDocument` frame per thing that's actually happened, in order. Not a dashboard of everything that could be shown — a sequence of what was actually done, glossable individually.

---

## Treatment compliance — the constraint that matters most

Realm is meant to become **the primary surface for a domain.** That means it has to render every domain's actual configured identity, not one fixed look. The prototype's dark, amber-accented aesthetic was interaction-model scaffolding — it should not be read as a proposal for what Realm looks like in production, on any domain, ever.

The real build must route through the same mechanism `SoleMemoryPresence` already does:

```tsx
treatment ? (
  <ChronicleTreatmentShell treatment={treatment}>{body}</ChronicleTreatmentShell>
) : body
```

`ResolvedDomainTreatment` (`resolveDomainTreatment.ts`) is the source of truth. Nav, Dialog's cast bar, and every Chronicle frame need to render *through* a domain's treatment, not around it. This is a Rendr decision, not a Cloud or Cursor one — treatment is decided before code, per the existing `rendr-then-cursor` territory routing already defined in `docs/build-handoffs/schema.md`. Nothing in this document should be read as pre-deciding what Rendr determines.

---

## Open dependency

`gloss_write_turn` (shipped, commit `129f514b`) requires a carrier `kip_messages` row to attach a Gloss turn to. Chronicle currently has no guaranteed path that creates one when a Gloss is started fresh from a Chronicle card rather than as a reply to an existing Dialog message. Cursor flagged this as the next logical task. Realm's Chronicle frames will hit this directly — every frame's Gloss star assumes a Dialog to land in. This should land before or alongside the Realm build, not after.

---

## Related

- `docs/chronicle-document-architecture.md` — ChronicleDocument contract, Gloss anchor rules, Gloss-write capability
- `docs/library-shared-context-roadmap.md` — Library roadmap, still in progress in parallel
- `docs/build-handoffs/schema.md` — `rendr-then-cursor` territory routing
- Prototype: "Ke3p — Library — Becoming" artifact — interaction model only, not a treatment proposal
