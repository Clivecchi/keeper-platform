# Universal Board — Dialog Cueing

> **Scope:** `UniversalBoardDef.conversation` — how the center panel (Dialog) coordinates the **Director** and **Cast**.  
> **Shell:** Universal Board = Nav · Dialog · Chronicle (unchanged).  
> **Plan:** `docs/dialog-cueing-plan.md`

**Staging** is reserved for a later umbrella (props, objects, presence). This doc is Dialog-only: **Cueing**.

---

## Vocabulary

| Term | Meaning |
|---|---|
| **Director** | Lead who runs the Dialog (usually Kip) |
| **Cast** | Agents available on the Dialog |
| **Cue / Cueing** | Who is brought into the *visible* Dialog, and how |
| **Cued (on stage)** | Selected Cast — may reply in the UI |
| **Offstage** | Not cued — Director may consult privately; no voice card unless elevated |

Code field: `dialogCueing` (formerly `dialogOrchestration`).  
Code Cast roster: `boardCast` (formerly `boardInstruments`).  
Cued set: `cuedCastMembers` (formerly `activeBoardInstruments`).

---

## Cueing modes

```ts
type DialogCueingMode =
  | "monologue"  // one agent on stage (Agent board)
  | "directed"   // Director runs scene; Cast enters when cued
  | "ensemble"   // reserved — everyone weighs in
  | "featured"   // reserved — one specialist owns the mic
  | "aside"      // reserved — whispers under Lead
```

| Mode | You talk to | Cast participation | Board today |
|---|---|---|---|
| **monologue** | Selected agent | Optional Lead echo | `agent` |
| **directed** | Director (Lead) | Only **cued** Cast speak in UI | `ide`, `domain`, `realm`, `designer` |
| **ensemble** | Board (one prompt) | All in order | reserved |
| **featured** | Specialist on mic | Lead as scribe | reserved |
| **aside** | Lead | Collapsed whispers | reserved |

---

## Directed cueing — contract

1. **Default = Director only** — no Cast auto-cued on mount.
2. **Empty cues = Lead-only turn** — no multi-Cast consultation.
3. **Selected Cast = cued on stage** — Mechanism A runs those agents; voice cards in UI.
4. **Not selected = offstage** — Kip may still `delegate.consult` for information without a UI voice.
5. **Header** shows Cueing mode (e.g. `Cueing: Directed`) next to Cast.

### Two mechanisms (do not conflate)

| | Mechanism A | Mechanism B |
|---|---|---|
| **Name** | Cast cue consultation | Lead-initiated `delegate.consult` |
| **Trigger** | User cues Cast chips before send | Lead emits `delegate.consult` |
| **UI** | Voice cards for cued Cast | Usually private unless Lead surfaces |
| **When idle** | Skipped if no Cast cued → plain Lead | Optional |

---

## Board presets

| `boardId` | `dialogCueing` | Notes |
|---|---|---|
| `agent` | `monologue` | `agentEcho: true` |
| `ide` | `directed` | Single-pin Cast (`cloud`, `rendr`) |
| `domain` | `directed` | `castMultiSelect` |
| `realm` | `directed` | `castMultiSelect` + Cast header |
| `designer` | `directed` | Rendr Director; Kip in Cast |

---

## Related

| Doc | Covers |
|---|---|
| `docs/dialog-cueing-plan.md` | Rename + behavior plan; Cast Management follow-up (2026-08-30) |
| `docs/universal-board-dialog-orchestration.md` | Legacy name — see stub |
| `apps/web/src/v0/boards/UniversalBoardDefinition.ts` | Board def source of truth |

**Style vs Cueing:** they are separate fields. Style must not auto-cue Cast. See the Cast Management follow-up on the plan — unique voice per agent is planned there, not as a second room Style.

---

## Changelog

| Date | Change |
|---|---|
| 2026-08-30 | Domain/Realm Style → Directed. Cast Management follow-up: Style/Cueing contract + unique agent voice. |
| 2026-08-03 | Renamed Orchestration/Instruments → Cueing/Cast; empty cues = Lead only; header Cueing label |
