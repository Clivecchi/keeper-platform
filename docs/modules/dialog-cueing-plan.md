# Dialog Cueing — Rename + Behavior Plan

> Product language: **Director · Cast · Cueing**  
> Save **Staging** for a later umbrella (props, objects, presence).  
> Date: 2026-08-03

---

## Vocabulary (locked)

| Product | Meaning | Old code |
|---|---|---|
| **Director** | Lead who runs the Dialog (usually Kip) | `directorAgentSlug`, Lead |
| **Cast** | Agents available on the Dialog | `boardInstruments`, instrument chips |
| **Cue / Cueing** | Who is brought into the *visible* Dialog, and how | `dialogOrchestration`, engage/consult |
| **Cued (on stage)** | Selected Cast — may reply in the UI | `activeBoardInstruments` |
| **Offstage** | Not cued — Kip may consult privately; no voice card unless Kip elevates | unselected / `delegate.consult` |
| **Staging** | Reserved — future larger world | — |

### Cueing modes (`dialogCueing`)

| New value | Old value | Meaning |
|---|---|---|
| `monologue` | `solo` | One agent on stage (Agent board) |
| `directed` | `director` | Director runs scene; Cast enters when cued |
| `ensemble` | `roundtable` | Reserved — everyone weighs in |
| `featured` | `hot_seat` | Reserved — one specialist owns the mic |
| `aside` | `chorus` | Reserved — whispers under Lead |

---

## Behavior contract (Realm / Domain multi-select)

1. **Default = Director only** — no Cast auto-seeded as cued.
2. **Empty cues = Lead-only turn** — no Mechanism A cast consultation.
3. **Selected Cast = cued on stage** — Mechanism A runs those agents; voice cards in UI.
4. **Not selected = offstage** — Kip may still use Mechanism B (`delegate.consult`) for information without a UI voice (elevation to visible reply is a follow-up; not in this pass).
5. **Dialog header** shows Cueing mode (e.g. `Cueing: Directed`).

---

## Rename map (code)

### Board definition (`UniversalBoardDefinition.ts`)
- `DialogOrchestrationMode` → `DialogCueingMode`
- `dialogOrchestration` → `dialogCueing`
- `boardInstruments` → `boardCast`
- `BoardInstrumentSlug` → `CastMemberSlug`
- `directorAgentSlug` — keep (Director language already correct)
- `instrumentMultiSelect` → `castMultiSelect`

### Board context
- `activeBoardInstrument` → `activeCastMember` (single-pin IDE/Designer)
- `activeBoardInstruments` → `cuedCastMembers` (multi Domain/Realm)
- `onToggleBoardInstrument` → `onToggleCastCue`
- `onSetActiveBoardInstrument` → `onSetActiveCastMember`
- `onSetActiveBoardInstruments` → `onSetCuedCastMembers`

### UI components
- `BoardInstrumentsBar` → `CastCueBar`
- `BoardInstrumentChip` → `CastMemberChip`
- Props: `activeSlug(s)` → keep or `cuedSlug(s)`; eyebrow stays **Cast**
- `DirectorCastHeader` — show Cueing mode label

### Dialog config (`directorDialog.ts` / `useAgentDialog`)
- `consultInstruments` → `cuedCastSlugs`
- `instrumentLabels` → `castLabels`
- `instrumentParticipation` → `castParticipation`
- `activeInstrument` → `activeCastMember`
- Send phase `"instrument"` → `"cast"`
- API payloads: rename `instrumentSlug` → `castMemberSlug` in web+api together; accept legacy key one release if needed

### Docs
- Rewrite `docs/universal-board-dialog-orchestration.md` → `docs/universal-board-dialog-cueing.md` (leave stub redirect note in old file)
- Update board/realm READMEs + `docs/modules/` copies

---

## Out of scope (this pass)

- Kip “elevate offstage Cast into UI” action (design next)
- Renaming every API log string / Railway historical logs
- Full AGENTS.md rewrite beyond a short pointer
- Prisma / DB migrations (none required — runtime board defs only)

---

## Deploy

1. `pnpm run smoke` (or at least `quick:web` + api typecheck)
2. Commit + push to trigger Vercel (web) + Railway (api)
3. Smoke-check Realm: no Cast selected → Lead only; select Cloud → Cloud voice appears

---

## Success criteria

- [x] No user-facing “orchestration” / “instrument” on Dialog chrome
- [x] Code identifiers use Cue/Cast (grep-clean for old board-def fields)
- [x] Realm does not auto-cue full Cast *(Directed Style, 2026-08-30 — Vibe still auto-cues when that Style is chosen)*
- [x] Empty cues → plain Lead turn
- [x] Header shows Cueing mode
- [x] Production deploy live

---

## Follow-up — Cast Management (2026-08-30)

> Chuck, after the Directed Style deploy. Not a build lock. Do not start this as the next slice.

The Style / Cueing split is real in the header (`Style: Directed · Cueing: Directed`) and still weak as a contract. **Vibe + Directed Cueing fought:** Vibe auto-cued Cloud and Rendr on every turn, then the Lead prompt told Kip not to direct the Document. Kip reported Cast instead of directing. That is a Cast Management problem, not a one-off prompt bug.

### Three things that must stay distinct

| Term | Means | Must not secretly do |
|---|---|---|
| **Cueing** | Who is on stage this turn | Change how anyone speaks |
| **Dialog Style** | Room rhythm (Directed vs Vibe) | Auto-cue Cast, or forbid the Director from directing |
| **Voice** | How *this* agent speaks | A second room Style, or a shared Cast essay voice |

Vibe may remain a Style. It must not override Cueing. Directed Cueing means: Director only until the human cues Cast.

### What to build (later)

**Cast Management** — a real Config surface for who is in the room and how they behave. Not a new board. Chronicle Config / existing Agent Manage family. Review what already exists before inventing primitives: `boardCast`, `DialogCastMember`, Agent Config (`kip_agents`), SOLE, Agency control plane.

Config that belongs here:

1. **Roster** — who may be Cast on this Dialog / Domain / Board
2. **Style vs Cueing contract** — Style cannot silently change who is cued
3. **Per-agent voice** — each Cast member should have a unique voice style (Kip, Cloud, Rendr are not the same speaker). Room Style is shared; voice is personal
4. **Director obligation** — when asked to review / rearrange the Document, Lead proposes; Cast is evidence, not the answer — even if they are already cued

### What we will not do in this chapter

- Invent Stage/Cast contract primitives before Cloud reviews existing Agent governance (same hold as Stage Slice 5)
- Treat Vibe as broken and delete it — it is a Style; it needs a contract
- Start Cast Management before Stage Slice 2–4 unless Chuck switches tracks

### Parked with this chapter

- Elevate offstage Cast into the UI (already out of scope on the 2026-08-03 pass)
- Unique voice as data on the agent (not a hardcoded prompt branch per slug)
