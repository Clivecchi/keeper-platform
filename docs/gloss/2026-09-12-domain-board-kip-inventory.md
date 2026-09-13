Cursor · Domain Board + Kip inventory (2026-09-12)

Gloss-only / not a build lock. Does not create Points or mutate the Document.

Chuck asked for two inventories before any relational-authority design: what the Universal Domain Board already is, and how Kip becomes Kip — including why coordination succeeds and then collapses into generic summarization.

This is a map. It is not a proposal to build.

Track A — what already exists

The live member surface is Universal Board. Auth landing is Realm (`?board=realm`), not Domain. AGENTS.md is stale on that point. Domain Board is the same shell with a different board def: directed Kip, cast multi-select, idle Chronicle on the Domain cover, Configure for Treatment / People / Addresses. Realm is a board mode, not a parent of Domains. There is no Realm table and no parentDomain foreign key. Domains are peers.

Membership is real and separate from login. KAM is identity. `DomainPermission` is tenancy. `Domain.ownerId` is the owner — not a permission row, not a steward field, not super-admin. Invites work; email send does not. Cross-domain tables already exist (`CrossDomainShare`, `ShareRequest`, `CrossDomainCollaboration`, `DomainTransfer`) and are mostly unmounted. That is a door, not dead weight.

ke3p-specific: platform slug, Build/Design boards, Cloud and Rendr injected into every roster, platform keys, super-admin domain list. Universal: the board shell, owner/permission/invite, frame_json, brand-host `/`.

The assumption that most implies Keeper authority over Domains is not ownership in the schema. It is the MVP leak: any authenticated user gets domain read. Next to that: platform agents merged into every Domain, and Kip hardcoded as director on Domain and Realm board defs even though `primaryAgentId` already exists.

Local Store has no architecture. The phrase appears only as a Keeping Choice test fixture. Closest live precedents: Domain isolation, `SoleMemoryScope` (default no cross-domain), Library as a domain index, domain-local `frame_json` / settings. Nothing yet forces a Domain’s store through Keeper as warehouse — unless today’s work starts treating ke3p as parent.

Track B — how Kip becomes Kip, and why the voice drops

Kip the Lead is a `kip_agents` row (`role === 'Lead'`). Kip the framework is the run pipeline. Runtime voice is lens `systemPrompt` plus optional `voice_prompt`, overlaid on name / purpose / tagline. Seeded personality — “Experience Director. I think alongside the people building this.” — is display and envelope metadata. It does not enter the model.

Cast coordination works because Cast runs get a real task and the UI shows their voice cards. The collapse is then instructed: the Lead’s user message is replaced with a synthesis brief (“1–3 short sentences… not a committee report… do not repeat Cast”). A second call after reads says “Synthesize for the user.” Domain Lens also trains “summarizing platform state.” On a foreign-lead Domain, Kip is told he is platform support.

Identity is still in the system stack. It is outranked. Kip is asked to report the room after successfully being in it.

Doors this session must not close

Do not add a parent Domain. Do not make ke3p the owner of other Domains. Do not merge platform roles into domain roles. Do not delete the dormant cross-domain tables. Do not treat Kip as the Domain lead by default when a Domain already has one. Do not encode the MVP read-leak as product truth.

Next is a decision, not a build: whether Universal Domain Board is Domain Board, Realm Board, or a treatment of both — and whether Lead `response` after Cast stays in voice while the brief lives in a structured field.
