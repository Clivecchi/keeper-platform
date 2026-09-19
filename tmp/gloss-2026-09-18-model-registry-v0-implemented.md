Cursor · Model Registry V0 is in code (2026-09-18)

Chuck locked this. It is now implemented — not a proposal.

Agents keep identity, Agency, voice, and context. Stored model fields (`kip_agents.model`, `model_provider`, `model_settings.model`) and `frame_json.kip.model` are execution preferences. They no longer choose a private execution path.

The in-code Registry distinguishes Model Identity from Provider Offering. `resolveExecutionPlan()` sits in front of both member Agent turns and guest companion turns. Sonnet 5 is an Anthropic offering and the sibling of Sonnet 4.6 — not a Ceox-specific patch.

Shared executor: `executeRegisteredChat`. TypeSafe is not a chat provider. `typesafe.evaluate` remains the tool.

INVALID_MODEL is now a genuine “this model ID is not accepted” classification. Only that (or a 404 unavailable) may trigger one visible sibling-offering fallback. Both attempts are logged. The original failure is kept if the sibling also fails. Turn provenance and diagnostics record the actual provider, model, offeringId, and fallbackUsed.

Out of this slice, as locked: no TypeSafe routing, no Prisma Registry tables, no live provider discovery, no pricing optimizer, no new provider abstraction.
