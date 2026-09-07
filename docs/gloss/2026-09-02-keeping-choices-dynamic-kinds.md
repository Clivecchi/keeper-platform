Cursor · Keeping Choices + Dynamic Kinds — code truth (2026-09-02)

Gloss-only / not a build lock. Does not create Points. Investigation only.

Chuck asked how close Keeper already is to two related ideas: Keeping Choices (“Keep this as…” without eagerly creating every form) and Dynamic / Emerging Kinds (human vocabulary that grows without a new platform type for every form).

Code truth, not a design.

What Keeper already has

1. Agent output is `response` + `actions[]` + optional `card`. Actions execute on the turn. Card is display (items are strings, not buttons). One card per response.
2. “Proposal” in code means a proposed future state with a concrete payload — Point body, treatment JSON, or Document reorganize diff. Accept/Apply then mutates. It is not “I found something worth keeping this way.”
3. Closest Keep-as UI: `draft.update.propose` → Accept (Point already exists as `proposed`); image receipt “Keep as Moment →” (direct API, not an Agency re-turn); keeper-card items (read-only).
4. After click, existing paths are API shortcuts. There is no UI choice → Composer direction → reconstruct current Keeper truth → select capability → act/propose → receipt pipeline.
5. Multiple independent actions/receipts per turn already work. Nothing mutually excludes choices.
6. “Kind” is several systems, not one: EntityKind recipe, Chronicle unions, free `draft.kind` strings, Stage presence kinds, unused `entity_types` table.
7. Document, Point, Stage Story, and Present are composed — not Prisma EntityKinds. Journey is the hierarchy primitive. Story is the Stage filmstrip. Do not collapse them.
8. A Business Plan can live today as a Dialog Document (Sections + Points) or a custom `draft.kind` + `spec_json`. It cannot be a typed reusable Kind with schema, promotion rules, or an EntityKind cover.
9. Lightest emerging-Kind memory: `sole.save` (content + optional topic). Voice/Echo/Logbook schema exists; no agent write path.
10. SOLE can carry form preferences as prose. It cannot enforce “operating model ≠ Business Plan” as a rule.

Genuine gaps (extend, do not invent a parallel Agency)

- No envelope field for Label + semantic direction + source that does not execute on the turn.
- No click that becomes directed Agency using current state.
- No Kind hypothesis object — and none is needed yet; SOLE can track the hypothesis.
- Story-builder doctrine currently says: asking permission in prose is incomplete; emit the action; the card is consent. Keeping Choices are the opposite judgment: offer form-fitness first; create only when directed. These can coexist. They must not be collapsed.

Smallest coherent seam if we build later

Extend the existing `agent_output` envelope (sibling of `actions` / `card`) so Agency can offer deferred Keeping Choices. Click becomes Composer-directed input into a new Lead turn that then uses current capabilities. Form-fitness lives on Document sections, `draft.kind`, and SOLE — not a new Prisma Kind model and not EntityKind proliferation.

Keeper's job is to keep it right. We now know what it already has before teaching it that.
