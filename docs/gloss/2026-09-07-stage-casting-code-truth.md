Cursor · Stage / Casting code-truth diagnostic (2026-09-07)

Gloss-only / not a build lock. Does not create Points or mutate the Document.

Chuck asked for a map of Agent → Casting → Loop → Frame → Stage → Graph against the live repo and database. No redesign. Existing names stay.

The short truth: Keeper already has the pieces. They are parallel systems that do not yet meet. The smallest next build is a bridge, not a new agent framework.

Live database (queried this session)

- 27 `kip_agents` rows. Roles: 20 Lead, 2 System (Cloud, Rendr), 3 Standard stubs, 2 Coordinators. No Persona rows.
- Platform agents that matter: Kip (Lead, gpt-4o, public), Cloud (System, claude-sonnet-4-6, infra capabilities), Rendr (System, claude-sonnet-4-6, voice_prompt + treatment.propose). Domain leads exist (Ceox, liv, vecch.io, plus smoke-test leads).
- One AgentContract: Keeper Agent Contract v1.1. All 27 domains bind it in warn mode. enforceAction is stored false and unused.
- Capability registry: 22 display/config slugs. Runtime actions do not gate on this table. 11 grant rows (Cloud infra + Kip legacy tools/permissions).
- DialogCastMember: one live row — Ceox enabled on ke3p · Becoming Together. Membership only.
- Stage compositions exist on three domains. chuck already has Kip (Lead), Cloud (Technical Authority), Rendr (Design / Presence), and Ceox on Stage, plus a 6-slide filmstrip. ke3p has Kip with direction “Direct the story” and no slides. livecchi-biz has a domain-lead presence and 3 slides.
- Prisma FrameConfig / FrameInstance / Board rows exist in volume (111 / 366 / 168). Those are Board Studio leftovers. They are not Keeper Stage and not the conceptual Frame.

What already corresponds

- Base Agent = `kip_agents`. Identity, purpose, role, model, config, memory flag are stored. Runtime environment is assembled by `resolveAgentEnvironment`. Kip’s Keeper-specific behavior is mostly golden-path actions + prompt contracts, not a special Agency table.
- Casting is not one abstraction. Closest stored form is Stage presence `contextualRole` + `direction` (“Base Agency” vs “On this Stage”). Closest turn form is Dialog Cueing (CastCueBar chips). Closest membership form is DialogCastMember. They are not linked.
- Loop / Performance = one HTTP `runAgent` turn: observe context → reason → batch actions → optional hardcoded follow-up. Enough for a first cooperative performance. Not a durable Loop primitive.
- Cooperative graph = Mechanism A (client cues Cast, parallel consult, Lead synthesizes) + Mechanism B (`delegate.consult`) + propose→Apply (Points, Review & Reorganize, Treatment). No graph framework. Chronicle events do not trigger work.
- Stage = `Domain.settings.keeperStage` + `workspaceSurface`. Already a shared environment for humans, agents, objects, and a filmstrip. Capable of hosting a Cast without restructuring.
- Frame, in this model, should mean the Chronicle review/act surface while On Stage. Do not invent a fourth Frame type. Do not reuse Prisma FrameInstance.

Smallest coherent slice

Reuse Stage composition, Stage Agency fields, `runAgent`, Cast consult, `treatment.propose` → human Apply. Small extension: when On Stage, the cued Cast is the agents already on Stage, and each consult receives that presence’s role/direction as their Casting for the turn. Do not build a Loop table, graph engine, Casting join table, or new Frame model.

Best first performance: On Stage, cue Kip + Rendr. Rendr proposes Treatment for the current story. Kip synthesizes. Chuck Applies. Chuck’s Stage already has that Cast placed.

Parked: Agency Composer as a new object (the strip already exists), ensemble/featured/aside cueing, Persona class, Standard-agent AI, event-driven re-entry, renaming kip_agents / Dialog / Stage.
