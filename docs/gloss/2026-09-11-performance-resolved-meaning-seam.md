Cursor · Performance resolved-meaning seam (2026-09-11)

Gloss-only / not a build lock. Investigation only. Does not create Points. Does not design a SemanticOutput system. Does not redesign Composer, Stage, or Agent contracts.

Chuck locked: Composer is the Human Instrument for Directing Life. Emerging flow is Composer → Kip/Lead + Cast Performance → resolved semantic output → Rendr composition → Frame → Experience. Rendr must not receive the raw transcript and reinterpret it.

Code-truth at the Cast → Lead → persist seam:

Today’s live path is not that flow. It is Composer chips + prose → client Cast consults (Mechanism A) → Lead synthesis prompt of flattened Cast prose/cards → Lead `agent_output` → parse/execute → `message.content` = Lead prose. Rendr is a Cast performer before Lead synthesis, not a composer after it.

What Kip receives from Cast is already a reduction: `instrumentSlug`, `instrumentReply` (prose), `status`, optional `instrumentCard`, optional `actionResults`. Cast `keepingChoices`, the Cast `agent_output` envelope, and unused Cast structure are dropped before synthesis. The synthesis prompt then asks Lead to talk like a person in the room — 1–3 sentences — and not re-quote Cast.

What Kip produces before `message.content` is the existing envelope: `response`, optional `card`, optional `keepingChoices`, optional `actions`. Persist writes `response` to `message.content` and parks the rest on metadata (`card`, `keepingChoices`, `castVoices`, `actionResults`, `orchestration`). `castVoices` is the raw performance, not resolved meaning.

Nothing today is the resolved meaning of the performance separately from prose. `keepingChoices.meaning` is a deferred optional keep. `card` is human-facing advisory. `actions` are mutations (`stage.story.layout` is Lead writing filmstrip text; `treatment.propose` is Rendr’s Chronicle look during its own Cast turn). Stage Now reads last user + Lead `content` only.

Composer carries enough to run the turn, not enough to persist the directing act: human direction is prose; cued Cast is runtime chips recovered later as `castVoices`; selected objects and Stage live on `Domain.settings.keeperStage` / `agentContext.workspaceSurface`, not on the user message.

Smallest missing contract, if one exists: a structured sibling on the Lead persist/result that is the resolved meaning of this performance for a post-Lead composer — plus the missing call site after Lead synthesis. Do not hand Rendr `castVoices` or `message.content` and ask it to reinterpret the night.
