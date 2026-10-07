Cursor · Agency core and composition (2026-10-06)

Chuck locked ACT / ADVANCE / STOP on this date. The instruction is the lock. This note does not create a Point.

The desk question, inspected. Not a build. Offers were not given more context.

Cloud is already one platform row. `kip_agents.slug` is unique. Purpose, role, a capabilities string list, personality, and `config.voice_prompt` live there, not on a Domain. When voice_prompt is set it replaces the Domain lens. That string is unbounded markdown. It is voice, and today it is also where identity gets stored. That is the opposite of a small versioned core.

A versioned contract already exists: `AgentContract` (version, supersedes, immutable after publish). It is a Domain's prose rules, one per Domain through `DomainAgentPolicy`. It is not who Cloud is. A Capability registry and `AgentCapability` grants also exist. The turn's allowlist is still the golden path plus that Domain's policy, not the registry.

A turn composes by concatenation for the one active Domain. `resolveAgentEnvironment` loads that Domain's index, up to 25 of the human's Drafts, people, and Stage refs, then JSON-stringifies a compact view into the prompt. Dedicated blocks add the Dialog Document, the Domain contract text, Talking in / Working on, and the Stage prompt when the surface is Stage. The client adds `agentContext` (board, profile, Cast room). Conversation profile is the one existing thinner. Agency profile still receives the long stack. Nothing retrieves a slice. The performance includes the pile.

Draft is the work product inside one Domain. It is not the Agency core, and it is not a cross-domain desk. A Draft is `domain_id` + `owner_id` (the human), with optional `agent_id`, `dialog_id`, and `keeper_id`. The prompt's draft list does not even select `agent_id`. Loading "open Drafts that name Cloud" would still be this human's Drafts in this Domain. Across thousands of Domains that list cannot be what Cloud always carries, and it must not be pasted into some other Domain's turn.

Three layers, three existing stores, one prompt:

- Keeper/Realm Agency — the global agent row. Small, same on every Domain. Today it is purpose plus a voice essay.
- Domain context — already resolved per turn, already too wide (index, 25 drafts, full Document, contract prose).
- Stage/Composer — already a pass (`agentContext` + `keeperStage`). It adds to the pile. It does not choose the pile.

Keeper building itself is a different performance. Work stays Domain-scoped. An aggregate is a retrieved index (domain, title, status, agent) for that performance only. Bodies stay in their Domain.

Decision on the table, not locked. The durable core is a versioned JSON on the existing agent row, separate from voice_prompt: who, purpose, responsibilities, principles, relationship to Lead, capability slugs. Voice stays voice. Do not put the core in a Document, in AgentContract, or in a Draft. A performance then carries the core always, and retrieves one Domain slice, one work item, and Stage only when the surface is Stage. Do not make Draft-on-the-offer the next step.
