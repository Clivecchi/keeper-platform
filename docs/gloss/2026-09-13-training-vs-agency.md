Cursor · Training is not Agency (2026-09-13)

Gloss-only. Not a build lock. Does not create Points or mutate the Document.

Question: is Agent Training still a truthful representation of Agency, before we redesign the UI.

Finding: no. Training is a structured editor for one Agent-intrinsic string — `kip_agents.config.voice_prompt`. The five frames (Currently, Identity, Behavior, Capabilities, Governance) are markdown headings inside that string. Save always PATCHes the whole prompt as `lensSystemPrompt`, which the API writes to `config.voice_prompt`. At runtime that string replaces Domain Lens. It is not Lead Judgment, not Cast Honesty, not Domain Contract, not action policy, not card rules, and not orchestration.

What Training actually shows

- Currently / Identity Voice+Character / Behavior rules / Capabilities list / Governance prose: slices of `config.voice_prompt`. Unsectioned prompts dump into Currently.
- Header name / avatar / status: `kip_agents` row. Read-only here.
- Platform chips (Domain, Model, Status, Visibility, Memory): agent record + current Board domain. Domain is Board context, not an assignment.
- Active capabilities chips: `kip_agents.tools` + `permissions`. Display only. Runtime allowlist is DomainPolicy + golden path.
- Proposal scaffolds: fake UI. Not persisted.
- Dialog while Training is on: Performance overlay (`agentContext.agentTraining`) that asks Kip to help edit the focused frame. Human Saves.

Where the real Agency contracts live

- Lead Judgment — Role (`Lead`). Code constant. Every Lead turn.
- Cast Honesty — Environment roster + `dialog_participation`. Lead turns with a cast.
- Domain Contract — Environment. `AgentContract` + `DomainAgentPolicy`. Action governance, not voice.
- Lens — Environment (`kip_lenses`) unless `voice_prompt` is set, in which case Training wins and Lens is silent.
- Capability / action policy — Environment. `DomainPolicy` + golden path. Not the Training Capabilities list.
- Card / expression — Pipeline, every Lead turn. Performance-shaped (when a card is owed).
- Orchestration / environment — Environment + Performance (`env-v1`, board, Dialog, Stage, cast mechanism).

August 22 already said the split: Training stays for voice; Agency fields are the update surface. This inventory confirms it against live code. Redesigning Training as if it were Agency would keep the lie.

Decision on the table (not locked): keep Training as a voice storyboard and stop naming its frames like contracts — or give Agency its own Chronicle surface that shows Role / Environment / Performance as they actually apply. Do not grow Behavior / Capabilities / Governance inside `voice_prompt`.
