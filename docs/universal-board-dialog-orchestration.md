# Universal Board — Dialog Orchestration

> **Scope:** `UniversalBoardDef.conversation` — how the center panel (Dialog) coordinates agents.  
> **Not:** IDE vs Agent as products. Those are **board presets** (`boardId`) that *choose* an orchestration mode.  
> **Shell:** Universal Board = Nav · Dialog · Chronicle (unchanged).

---

## Core idea

One Universal Board shape. Many boards. **Dialog orchestration** is declared on the board definition — who owns the composer, who may speak, and in what order.

```ts
// Conceptual — future fields on ConversationPanelDef
dialogOrchestration: DialogOrchestrationMode
directorAgentSlug?: string              // default "kip" when mode needs a Lead
boardInstruments?: string[]             // agent slugs + tool ids on this board, e.g. ["cloud", "rendr"]
agentEcho?: boolean                     // solo / chorus-adjacent — Lead whispers after others
```

```ts
type DialogOrchestrationMode =
  | "solo"       // implemented (Agent board preset)
  | "director"   // target (IDE / Dev preset) — near-term build
  | "roundtable" // option — remember for later
  | "hot_seat"   // option — remember for later
  | "chorus"     // option — remember for later
```

---

## Orchestration modes

### `solo` — Agent studio

**Use when:** Training or improving **one** agent; config, voice, capabilities.

| | |
|---|---|
| **Composer** | Selected agent (from Nav) |
| **Others** | Optional **echo** from Lead (Kip today on Agent board via `agentEcho: true`) |
| **You** | Speak directly to that agent |

**Board preset today:** `agent` (`AGENT_BOARD_DEF`, `agentEcho: true`).

---

### `director` — Board collaboration *(near-term target)*

**Use when:** Building together — infra, code, canon, presence — on a board with multiple instruments.

| | |
|---|---|
| **Composer** | **Lead only** (Kip) — you never swap identity in the input |
| **Instruments** | Cloud, Rendr, … — invoked **by Kip** (delegate actions / sub-turns), not by replacing the composer |
| **Thread** | One session; handoffs visible as action cards (“Cloud opened PR #12”, “Rendr proposed treatment…”) |
| **External** | Cursor via Cloud handoff (`docs/build-handoffs/schema.md`) — not a board persona |

**Board preset today:** `ide` / `designer` / `domain` / `realm` — **partially wired** (shared `BoardInstrumentsBar` Agents chips pin instruments; composer still may follow pin — not true director delegation).  
**Board preset target:** `ide` / future `dev` with `dialogOrchestration: "director"` (Kip-only composer; instruments as delegated sub-turns).

**Territory routing (Kip delegates):** see build handoff schema — Cloud mechanical vs Cursor reasoning vs Rendr treatment.

---

### `roundtable` — Ordered multi-voice *(option — not building now)*

**Use when:** You want **every instrument to speak once** on the same prompt — decision reviews, design critiques, “everyone weigh in.”

| | |
|---|---|
| **Composer** | You → Lead or board (one user message) |
| **Flow** | Fixed order per board def, e.g. Cloud → Rendr → Kip summary |
| **Output** | Sequential agent turns in one thread; Lead closes with synthesis |

**Remember for:** Architecture decisions, canon promotion reviews, “should this ship?”

---

### `hot_seat` — Rotating specialist *(option — not building now)*

**Use when:** One instrument owns the mic for a **session or stretch**, Lead stays scribe/coach.

| | |
|---|---|
| **Composer** | Active **hot seat** agent (e.g. Cloud-only session) |
| **Lead** | Visible but subordinate — summaries, risk flags, “switch hot seat?” |
| **Rotate** | User or Lead moves hot seat across `boardInstruments` without changing board preset |

**Remember for:** Deep infra days (Cloud on mic), design sprints (Rendr on mic), still within one collaboration board.

**Contrast:** `solo` = train *that* agent. `hot_seat` = *use* a specialist fully while Lead watches the board.

---

### `chorus` — Multi-whisper *(option — not building now)*

**Use when:** One thread, many **inline perspectives** under a single Lead reply — no full agent swaps.

| | |
|---|---|
| **Composer** | Lead (Kip) |
| **Others** | Collapsed beats under Lead message: Cloud on feasibility, Rendr on feel, etc. |
| **Feel** | Agent Board `agentEcho`, extended to multiple board instruments |

**Remember for:** Fast iteration where you want nuance without a roundtable length thread.

---

## Mode comparison (quick)

| Mode | You talk to | Others participate | Best for |
|---|---|---|---|
| **solo** | Selected agent | Optional Lead echo | Agent training |
| **director** | Lead (Kip) | Delegated instruments | Build collaboration |
| **roundtable** | Board (one prompt) | All in order | Group decisions |
| **hot_seat** | Specialist on mic | Lead as scribe | Deep specialist sessions |
| **chorus** | Lead | Whispers under Lead reply | Rich single-thread feedback |

---

## Board presets (examples — not the architecture)

| `boardId` | Intended orchestration | Status |
|---|---|---|
| `agent` | `solo` | Working |
| `ide` | `director` | Tool swap only — needs director spec |
| `domain` | `solo` or Lead-domain (product voice) | Kip domain dialog — separate product surface |
| `designer` | `director` or `hot_seat` (Rendr) | TBD |

New boards = new `UniversalBoardDef` entries — pick orchestration + instruments, not new UI.

---

## Director mode — implementation notes (Phase 1)

When implementing `director` on IDE/Dev preset:

1. Composer **always** Lead (`directorAgentSlug: "kip"`).
2. Cloud / Rendr chips → **pin Chronicle / delegate**, not `effectiveAgentSlug` swap.
3. Kip actions: `delegate.cloud`, `delegate.rendr` (or MCP) with results as action cards.
4. One session id; sub-runs attributed in message metadata.
5. Do **not** seed a Cursor `kip_agent` — Cloud → Cursor SDK / handoff file.

**Anti-pattern today:** `invokedToolSlug` replacing Kip in `UniversalConversation` — treat as migration source, not target behavior.

---

## Related docs

| Doc | Covers |
|---|---|
| `docs/build-handoffs/schema.md` | Cloud → Cursor handoff; territory routing |
| `docs/keeper-heart-mind.md` | Kip Lead, agents framework |
| `apps/web/src/v0/boards/UniversalBoardDefinition.ts` | Board def source of truth |
| `AGENTS.md` | Build agents: Cloud, Rendr, Cursor (external) |

---

## Changelog

| Date | Change |
|---|---|
| 2026-07-23 | **Shipped lead-initiated cast consultation:** `delegate.consult` action + Domain/Realm multi-select consults engaged cast members for real minimal replies; synthesis attributes only real text or says plainly it got nothing back (no fabrication). Invite second human via Cast Header + `/invite/accept`. |
| 2026-07-22 | **Shipped `kip-roster-dialog-cast-sync`:** Kip's prompt roster merges `DialogCastMember`-enabled agents (via `resolveAgentEnvironment` + session `dialog_id`) into `domainAgents` — additive only; no per-agent turn delegation. |
| 2026-07-22 | **Shipped `realm-home-chronicle-routing`:** `/home?board=realm` Chronicle reaches `DomainRealmStory` when a Dialog is selected; idle home shows a visible empty/feed state instead of an `aria-hidden` node. |
| 2026-07-22 | **Shipped `stop-eager-dialog-creation`:** board mount/prefetch resume-only via `resumeBoardSession`; Dialog+session create deferred to first `sendMessage`. Dead IDE bootstrap in `useAgentDialog` removed. Curtain no longer requires a session id. |
| 2026-07-22 | **Live-testing punch list:** four gaps found post-Phase-1 — (1)–(3) shipped above; (4) Nav duplication fixed directly. Full detail in `docs/chronicle-document-architecture.md`. |
| 2026-07-22 | **Cross-domain cast membership (Phase 1):** users who administer another domain can **Add** that domain's lead onto the current Dialog via Cast Header. Persisted as `DialogCastMember` (join table — not `CrossDomainShare`). Admin re-checked server-side every request. Platform baseline `cloud`/`rendr` unchanged. Real lead-initiated delegation remains Phase 2. |
| 2026-07-22 | Header cast identity + composer invoke split (all director boards). Domain/Realm: `instrumentMultiSelect` engages multiple non-lead instruments; IDE/Designer keep single-swap. Dialog stamps engaged collaborators on the lead reply. Full multi-delegation pipeline still future work. |
| 2026-07-20 | Presentation unification: `BoardInstrumentsBar` is the shared Agents roster for every director board; Realm header `DialogCastBar` retired to trailing access actions only. Full director delegation (Kip-only composer) remains future work. |
| 2026-06-17 | Initial spec — five orchestration modes; director near-term; roundtable, hot_seat, chorus reserved |
