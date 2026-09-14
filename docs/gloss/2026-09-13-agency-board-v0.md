Cursor · Agency Board V0 (2026-09-13)

Gloss-only. Not a build lock. Does not create Points or mutate the Document.

Question: what is the smallest truthful Agency Board we can open on ke3p, now that Domain Cover-as-map exists and Training has been shown not to be Agency.

Lock used: Agency is Domain-contextual. Not a new Keeper object. Agency → Agents → Kip. Agency → People → Chuck. No Agency · Kip. Cover = Place + judged Terrain + few Reaches + Return. Nav reveals what is available. Chronicle Cover reveals what matters.

What is true today

- `?board=agent` is Universal Board with `idleSubject: "domain"`. Idle Chronicle is ke3p Domain Cover. That is the wrong Place.
- Live Nav already has Agents as a domain-scoped roster (`GET /api/domains/:id/kip/agents` — lead + Kip + Cloud + Rendr). Config also lists AI Access and External Access. People is not on this board. People already lives as Domain Configure frame (`DomainPeopleSection`).
- Selecting Kip loads `AgentFocusPresence`: identity card, Configure, Train, and Performance Inspection when a Dialog is selected. Training frames are `voice_prompt` slices. They are not contracts.
- Agent Board selection grammar is reusable: Agent stays Chronicle subject; Dialog is performance context.
- `AgentBoardIdlePanel` and legacy `AgentBoardNav` are unused by Universal Chronicle.

Proposed Agency Board Nav (V0)

Keep the three-pane shell.

- Universal — unchanged: Dialogs, Drafts, Chatter, Library. Dialogs remain available performance rooms.
- Keepers — unchanged and quiet. Agency is not a Keeper warehouse.
- Agency pane (today's Agent Config pane) — only what is entrusted and available: People, Agents. Recede AI Access and External Access to Build. Do not add Roles, Authority, Contracts, Capabilities, Governance, or Performance as Nav lists.

Proposed Agency Cover / Place

Idle Chronicle is Agency Place of this Domain — same Domain record, different Cover. Not Domain Cover. Not Kip's card. Not a Prisma Agency.

Place (five slots): chrome title Agency; name is this Domain's Agency (ke3p); identity says who is entrusted to act here; traits are live facts (Lead, people count, contract mode) not a dashboard; two Reaches only — People and Agents. Configure stays off this Cover. Training stays off this Cover.

Terrain is one living path, same roles Domain just proved: Now, Needs you, Becoming, Present. Judgment, not eight tiles.

ke3p Terrain that could qualify now

- Now — Kip as Lead of this Domain; last recorded performance that actually bound Agency (Lead Judgment / Cast Honesty layers).
- Needs you — a pending invitation; or Kip `voice_prompt` silencing Domain Lens (Training winning over environment).
- Becoming — a newly entrusted person or agent who has not yet acted.
- Present — Keeper Agent Contract v1.1 in warn; Cast Honesty ready because a domain roster exists; Chuck as owner, quiet unless something needs him.

Nav still holds the rest of the roster. TypeAgent / PlatformAgent / CodeAgent / CodeCoordinator stay off Cover. CeoX as a second seeded Lead stays off Cover unless ke3p actually entrusted him.

Agents → Kip

Existing Agent Cover. Configure and Train remain reaches from Kip, not Agency tiles. Dialog stays performance overlay. Performance Inspection stays under Kip + Dialog. Return is Trail / clearSelection back to Agency Place. Do not invent Agency · Kip.

People

Nav People, or the People Reach, opens the already-deployed `DomainPeopleSection` as a Chronicle room — not Domain Configure warehouse, not a Person EntityKind, not a People Board. Presence is not ownership. Domain Cover may keep a People reach later; V0 does not steal membership truth. Selecting Chuck highlights the entrusted person inside that room. A future People Board remains possible.

Contracts, Capabilities, Governance, Performance — reach, do not categorize

| What | Where it lives now | How Agency reaches it |
|---|---|---|
| Lead Judgment | Code constant `leadJudgmentContract.ts`, injected when `role === 'Lead'` | Terrain or Kip Role → read-only inspect of the live contract + last performance `lead_judgment` layer |
| Cast Honesty | Runtime prompt from domain roster + `dialog_participation` | Terrain when roster exists; inspect roster + rule; performance `cast_honesty` layer |
| Domain Contract | `AgentContract` + `DomainAgentPolicy` (default v1.1, warn) | Terrain Present/Needs you by enforcement mode; inspect loaded policy, not a text field |
| Capability / action policy | `DomainPolicy` + golden path. Training Capabilities list is display-only | Performance `action_policy`. Capability warehouse stays on Build |
| Lens / environment | `kip_lenses`, unless `voice_prompt` replaces it | Terrain if Lens is silent; inspect the lens record |
| Expression / cards | Pipeline on Lead turns | Performance Inspection only |
| Orchestration | env-v1, board, Dialog, Stage, cueing | Performance `orchestration` / `board_cueing` / `stage` |
| People authority | Domain membership roles (admin / user / friend / connection) | Inside People room |
| Agent voice | `config.voice_prompt` via Training | Train on Kip. Not Agency Terrain |

Do not move these into old text fields. Documents vs code constants can wait.

Code fate

- Reuse: UniversalBoard, domain-scoped Agents fetch, `AgentFocusPresence`, Configure, Training, Performance Inspection, `agentBoardSelection`, `DomainPeopleSection` + invite dialog, `EntityCoverPresence`, Domain Cover terrain pattern, provenance layers.
- Rename: displayName Agent Board → Agency Board. Accept `?board=agency`; keep `?board=agent`. Config pane label on this board → Agency.
- Change: `idleSubject` from domain to agency Place; Agency Cover schema + judged terrain; People as Chronicle room; drop AI/External Access from this Nav.
- Retire from the story: unused `AgentBoardIdlePanel`, unused legacy `AgentBoardNav`. Do not retire Training or Agent Config.

Smallest slice to experience it

Open Agency Board · ke3p and see Agency Place, not Domain Cover. Terrain names who is entrusted now and what is binding. People and Agents are the only new Nav truths. Kip and People rooms reuse what already works. One contract (Lead Judgment or Lens-silenced-by-Training) is inspectable from Terrain. That is enough to feel Agency. The rest can wait.
