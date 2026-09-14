Cursor · Chronicle Cover is a card, not a map (2026-09-13)

Gloss-only. Not a build lock. Does not create Points or mutate the Document.

Question: before Agent Board becomes Agency Board, what is the current Chronicle Cover actually, and what smallest universal Cover grammar can we reuse so Cover is a map, not a warehouse.

Finding: Chronicle already has a universal Cover. It is an identity card. It is not yet a Board map. Domain idle and Agent idle share the same subject — Domain. Agency as a Board subject does not exist. Training is a voice room off that card, not Agency terrain.

What currently renders

- One Chronicle path for every Board: `UniversalViewPanel` → `resolveChronicleView` → `ChroniclePresenceView` → `KeeperPresence` → kind-specific `*FocusPresence`.
- Idle on every Board, including Agent Board, is `idleSubject: "domain"`. That loads `DomainFocusPresence` + `domainCoverSchema` + `EntityCoverPresence`.
- Selecting Kip on Agent Board loads `AgentFocusPresence` + `agentCoverSchema` + `EntityCoverPresence`.
- `AgentBoardIdlePanel` (“Agent Studio / Select an agent”) is unused. Schema mentions it; Universal Chronicle does not mount it.

Two Covers, do not mix

- Public Cover Frame (`apps/web/src/v0/frames/cover`, `cover-frame.tsx`) is guest landing. Not this work.
- Chronicle Cover (`EntityCoverPresence`) is member right-panel presence. This is the Board Cover we mean.

Universal vs Board-specific

Universal already: five cover slots (hero, identity, traits, credits, actions); Cover ↔ Config ↔ Act; `ChronicleConfigShell` back + save; TrailBar history; `RelatedSection` lists below the card; Journey’s tappable Paths/Moments.

Board-specific: Nav panes and Config lists; Domain Configure inner frames (Domain · People · Addresses · Presence · Build); Agent-only Training + Performance Inspection; Agent Board keeps Dialog as performance context when an Agent is selected.

How you move, how you return

- Cover → Config: cover action. Return: Config back arrow. No Trail change.
- Cover → Training: Train action. Return: Dialog prelude “Exit Training”, not a Chronicle back arrow.
- Cover → Act: engagement request. Return: close Act to current presence.
- Cover → another object: Nav select, or Journey terrain clicks. Domain’s Recent Moments / Moving / Present are enriched with `navigateKind` but rendered as dead paper — no click. Return: TrailBar or `clearSelection` back to Domain.
- Agent Board + Dialog: Agent stays Chronicle subject; Dialog is performance overlay under the card.

Domain · ke3p today

Place works: name, tagline, purpose, cover image, Active, Primary Agent, Configure + People. People is a reach into a Configure frame, not a new Chronicle subject. Terrain is already judged (Recent Moments, Moving, Present) but not reachable. Configure rooms are warehouse, correctly off Cover.

Agency · Kip today

Idle Agency Board shows ke3p Domain Cover. That is the wrong subject. Selecting Kip shows an Agent identity card (Role, Domain, Model, Status, Visibility, tool chips, Configure + Train). Performance appears only with a Dialog. Training frames are slices of `voice_prompt`. They are not Role, Environment, Contract, or governance.

V0 Cover grammar (reuse, do not invent a dashboard)

Cover = Place + judged Terrain + few Reaches + Return.

- Place: keep `EntityCoverPresence` five slots. Who/where I am. Not the warehouse.
- Terrain: few live, tappable `RelatedSection` blocks under Place. Journey already does this. Domain already computes it and does not wire clicks. Do not list every Nav item.
- Reaches: two cover actions, plus terrain clicks, plus optional deep-link into a Config frame (`onPeople` already exists).
- Return: Trail for object changes; Config/Act back arrow for rooms; Training needs the same Chronicle back, not Dialog-only exit.

Agency Board implication

Do not grow Training or Agent Config into Agency. Agency is broader than one Agent’s voice or metadata. The missing primitive is Board Cover subject: Domain Board idle = Domain; Agency Board idle should be Agency place, not ke3p Domain card and not Kip Training. Selecting Kip then enters Agent Agency of one agent through the existing Agent Cover.

Smallest next build (not locked): make Domain Cover terrain tappable with existing `navigateKind` + board select actions. That proves Cover-as-map before designing Agency Cover.
