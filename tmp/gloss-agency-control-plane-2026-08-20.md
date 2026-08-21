Cursor · Agency Control Plane (2026-08-20)

Gloss-only. Not a build lock. Does not create Points or mutate the Document.

Finding: Keeper already has the beginnings of a model-independent agency control plane — scattered, not missing. It strongly controls what may execute. It weakly controls what should execute. The unused pieces are contracts, not features.

1. Gloss is not a Point. Cursor `gloss_write_turn` writes `kip_messages.metadata.glossThreads` only. Document Points are `kip_drafts.spec_json.points`. External Point writes use `dialog_ingest` / `draft.update.propose`, not Gloss. Chronicle sections (Progress, Known Issues, Development, Cast & Orchestration, Document Architecture) are `Dialog.document_paths` + `DraftPoint.pathGroupId`.

2. Obligation machinery already exists: `detectDraftIntent` (pre-create), `detectDraftTrigger` + `preExecGovernanceCheck` (require `draft.create` in strict mode), allowlists, Lead `mcp.call` block, silent/nested consult blocks, mutation-deferral follow-up, read/consult follow-up, `coerceWorkingDraftKind`. `AgentContract.enforceAction` is in the schema and unused.

3. `agent_output` is `{ response, actions[], card? }`. No required vs optional actions, no confidence, no consultation-required flag. Keeper already inspects the envelope before execution — it just rarely imposes obligations except draft-trigger.

4. Turn context is rich server-side (`dialogDocument`, roster, drafts, governance) and poor on board/Chronicle/kipMode (client-known, not in `AgentRunSchema`). Specialist authority is slug + purpose + capabilities + boardCast — not a queryable expertise map. `kip_agents.context_scope` is unused for routing.

5. Smallest strengthening: extend existing governance (detectors → `preExecGovernanceCheck` violations → regenerate/follow-up) so a turn can carry Keeper-owned obligations (`delegate.consult`, skip unsolicited `draft.create`, inject Cast object card). Do not invent a new agent framework. Do not unify Gloss and Points until the Document decides they should meet.
