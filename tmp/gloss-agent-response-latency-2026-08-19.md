Cursor · Agent response latency (2026-08-19)

Gloss-only / not a build lock. Diagnostic of why Agent Dialog replies feel slow.

Finding: the wait is not one slow model. A send waits until the entire turn finishes as one JSON HTTP response. Nothing streams. The browser cannot show the first sentence until env resolve, the model, optional follow-up model calls, actions, and a session refetch all complete.

Typical turn (plain Lead, no cast cues):
1. Client binds/resumes session (extra HTTP).
2. POST action=run — resolveAgentEnvironment (KAM + many DB reads: policy, drafts, domain index, Dialog Document, roster).
3. callAIModel rebuilds a large system prompt every time (compact env, contract, SOLE, draft/image/web rules, keeper-card, Document, MCP tools when System).
4. Provider chat is non-streaming. Budgets: Anthropic ~110s, OpenAI/Together ~90s.
5. Lead must emit a JSON envelope (type/response/actions), then server parses/executes.
6. Common second model call: read-action follow-up (draft.read, dialog.read, glossary.read, web.search, delegate.consult). Mutation-deferral follow-up and governance retries (up to 2) can add more.
7. Client then GET all session messages before painting the reply.

When Cast chips are on: each cued member is a full runAgent first (parallel among members), then Lead synthesizes. Felt time ≈ slowest cast + Lead (+ follow-ups). Echo / domain collaboration can add another run after the Lead reply.

Phase 1 timings already exist on lead/system `data.timings` and `[AgentTurnTiming]` logs (envResolveMs, modelCalls, actionsMs). Use those before guessing.

Options (recommendation first):
A. Stream the user-facing `response` so first tokens appear in seconds. Largest felt-speed win. Still need a way to attach actions after the envelope is complete.
B. Reuse the composed prompt within a turn; skip follow-up when the first reply already used the results; do not refetch the full transcript after run.
C. Treat Cast cueing as an explicit cost — keep current “empty cue = Lead only”; surface “consulting N members” more honestly.

Recommend A then B. Do not lock a build until Chuck chooses.