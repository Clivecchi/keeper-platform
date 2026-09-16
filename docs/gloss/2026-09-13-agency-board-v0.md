Cursor · Agency Board V0 (2026-09-13)

Gloss-only. Not a build lock. Does not create Points or mutate the Document.

Question: what is the smallest truthful Agency Board we can open on ke3p, now that Domain Cover-as-map exists and Training has been shown not to be Agency.

Lock used: Agency is Domain-contextual. Not a new Keeper object. Agency → Agents → Kip. Agency → People → Chuck. No Agency · Kip. Cover = Place + judged Terrain + few Reaches + Return. Nav reveals what is available. Chronicle Cover reveals what matters.

What is true on ke3p today (live)

- `?board=agent` is Universal Board. Idle Chronicle is ke3p Domain Cover (`idleSubject` is declared `"domain"` and is unused at runtime; idle always falls back to Domain). That is the wrong Place for Agency.
- Entrusted Agents (`GET /api/domains/:id/kip/agents`): Kip (Lead, primary) → Cloud (System, voice) → Rendr (System). CeoX is a seeded second Lead in `kip_agents` and is not on this Domain's roster.
- People (`GET /api/domains/:id/members`): Chuck Livecchi is owner and the only member (admin). No pending invitations.
- Domain policy: Keeper Agent Contract v1.1, enforcement `warn`. ke3p has no `kip_lenses` of its own; runtime falls back to the platform `default` Domain Lens.
- Kip `voice_prompt` is empty. Last ke3p Kip performance (Finding the Plot, 13 Sep, Realm, directed) recorded Lead Judgment, Cast Honesty, Domain Lens, Domain Contract, orchestration, and action policy. Voice prompt was not recorded. A cross-domain Lead (`chuck-livecchi-lead`, attributed to Ceox) spoke on that turn; CeoX is not entrusted on ke3p's Agency roster.
- Cloud has a full Training-shaped `voice_prompt` (silences Lens when Cloud speaks). Last ke3p Cloud turn: 7 Jun. Rendr has a short `voice_prompt`. Last ke3p Rendr turn: 30 Aug.
- Selecting Kip still loads `AgentFocusPresence`: identity card, Configure, Train, Performance Inspection when a Dialog is selected. Training frames are `voice_prompt` slices. They are not contracts.
- Agent Board conversation is still `monologue` + agent Echo. Domain and Realm are directed. That leftover is Agent Studio, not Agency. Leave it out of the first slice.
- Unused: `AgentBoardIdlePanel`, legacy `AgentBoardNav`. Live Nav is `UniversalNavPanel`. Config pane on this board is Agents + AI Access + External Access. People is not on this Nav.

Proposed Agency Nav (V0)

Keep the three-pane shell.

- Universal — unchanged: Dialogs, Drafts, Chatter, Library. Dialogs remain available performance rooms.
- Keepers — unchanged and quiet. Agency is not a Keeper warehouse.
- Agency pane (today's Agent Config pane) — only what is entrusted and available: People, Agents. Recede AI Access toward Build Keys. External Access already lives on Domain. Do not add Roles, Authority, Contracts, Capabilities, Governance, or Performance as Nav lists.

CeoX stays off this Nav until ke3p actually entrusts him. Cloud and Rendr stay on it: they are available Agency territory.

Proposed Agency Cover / Place

Idle Chronicle is Agency Place of this Domain — same Domain record, different Cover, chosen because `boardId` is Agency. Not Domain Cover. Not Kip's card. Not a Prisma Agency. Not a new Chronicle kind.

Place (five slots): chrome title Agency; name is this Domain's Agency (KE3P); identity says who is entrusted to act here (Chuck · Kip as Lead); traits are live Place facts (Lead, one person, Contract v1.1 warn) not a dashboard; two Reaches only — People and Agents. Configure stays off this Cover. Training stays off this Cover. Domain tagline and journey purpose stay on Domain Cover.

Terrain is one living path, same roles Domain just proved: Now, Needs you, Becoming, Present. Judgment, not six category tiles. Empty roles are allowed.

ke3p Terrain that actually qualifies now

Judged from ke3p-scoped facts. Do not use Kip's latest global turn (that was Chuck Livecchi · Agent Board). Do not tile People / Agents / Contracts / Capabilities / Governance / Performance.

- Now — Finding the Plot. Kip as Lead of this Domain, last binding performance. Lead Judgment, Cast Honesty, Domain Lens, and Domain Contract actually recorded. The path item is the performance, not a Kip portrait.
- Needs you — nothing pending. No invitation. Kip is not silencing Lens. Leave the slot empty rather than invent. The only live tension (a Ceox-attributed Lead spoke on Finding the Plot while CeoX is not on this roster) is real, but it is cross-domain Agency. Do not promote it on V0 Cover.
- Becoming — nothing newly entrusted and unused. Cloud and Rendr are platform-merged onto every domain, not becoming. CeoX is not entrusted here. Leave empty.
- Present — the environment that held: default Domain Lens and Contract v1.1 warn actually applied on Finding the Plot. Chuck as owner, quiet. This is a judged fact you can inspect, not a Contracts warehouse tile.

Nav still holds Cloud, Rendr, and Chuck. Available is not prominent.

Agents → Kip

Existing Agent Cover. Configure and Train remain reaches from Kip, not Agency tiles. Dialog stays performance overlay. Performance Inspection stays under Kip + Dialog. Return is Trail / `clearSelection` back to Agency Place. Do not invent Agency · Kip.

What survives on Kip: `AgentFocusPresence`, identity card, Configure, Train as voice storyboard, Performance Inspection, Agent-stays-subject selection grammar.

What does not become Agency: Training frames named like contracts; Agent Studio idle copy; chrome that still says the Domain story.

People

Nav People, or the People Reach, opens the already-deployed `DomainPeopleSection` as a Chronicle room — same `GET /api/domains/:id/members`, not Domain Configure warehouse, not a Person EntityKind, not a People Board. Presence is not ownership. Domain Cover may keep its People reach; both open the same membership truth. Selecting Chuck highlights the entrusted person inside that room. A future People Board remains possible.

Contracts, Capabilities, Governance, Performance — reach, do not categorize

| What | Where it lives now on ke3p | How Agency reaches it |
|---|---|---|
| Lead Judgment | Code constant `leadJudgmentContract.ts`. Recorded on Finding the Plot | Terrain Now → read-only inspect of the live contract + that performance's `lead_judgment` layer |
| Cast Honesty | Runtime prompt from domain roster + `dialog_participation`. Recorded on Finding the Plot | Inspect roster + rule from that performance. Do not Cover-tile the Ceox mismatch in V0 |
| Domain Contract | `AgentContract` + `DomainAgentPolicy` (v1.1, warn). Recorded on Finding the Plot | Terrain Present → inspect loaded policy, not a text field |
| Capability / action policy | `DomainPolicy` + golden path. Recorded on Finding the Plot | Performance `action_policy`. Capability warehouse stays on Build |
| Lens / environment | Platform `default` Domain Lens (ke3p has none). Applied on Kip's last turn. Cloud/Rendr `voice_prompt` would replace it if they spoke | Terrain Present → inspect the lens record. Cloud/Rendr Train remains their voice, not Agency Terrain |
| Expression / cards | Pipeline on Lead turns | Performance Inspection only |
| Orchestration | Recorded on Finding the Plot (Realm, directed) | Performance `orchestration` / `board_cueing` |
| People authority | Domain membership (Chuck: owner / admin) | Inside People room |
| Agent voice | Kip: none. Cloud/Rendr: `config.voice_prompt` via Training | Train on that Agent. Not Agency Terrain |

Do not move these into old Training fields. Documents vs code constants can wait.

Code fate

- Reuse: UniversalBoard, domain-scoped Agents fetch, `AgentFocusPresence`, Configure, Training, Performance Inspection, `agentBoardSelection`, `DomainPeopleSection` + invite dialog, `EntityCoverPresence`, Domain Cover terrain pattern, provenance layers, members API.
- Rename: displayName Agent Board → Agency Board. Accept `?board=agency`; keep `?board=agent`. Config pane label on this board → Agency. Top-bar / workspace label Agent → Agency.
- Change: when this board is idle, render Agency Cover on the same Domain record (board-aware, not a new subject kind). Agency Nav = People + Agents. Drop AI/External Access from this Nav.
- Leave for a later slice: Agent Board `monologue` cueing; unused `AgentBoardIdlePanel` / `AgentBoardNav` deletion; Kip Cover chrome cleanup.
- Do not retire Training or Agent Configure.

Smallest slice to experience it

Open Agency Board · ke3p and see Agency Place, not Domain Cover and not Kip. Terrain names Finding the Plot as Now and the loaded Lens/Contract as Present. People and Agents are the only new Nav truths. Kip and People rooms reuse what already works. Lead Judgment (or the Domain Lens that actually applied) is inspectable from Terrain. Empty Needs you and Becoming are the honest map. That is enough to feel Agency. The rest can wait.
