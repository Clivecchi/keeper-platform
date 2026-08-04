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

- [ ] No user-facing “orchestration” / “instrument” on Dialog chrome
- [ ] Code identifiers use Cue/Cast (grep-clean for old board-def fields)
- [ ] Realm does not auto-cue full Cast
- [ ] Empty cues → plain Lead turn
- [ ] Header shows Cueing mode
- [ ] Production deploy live
