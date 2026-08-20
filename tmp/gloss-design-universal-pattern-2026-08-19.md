Cursor · Design must follow the Universal Pattern (2026-08-19)

Gloss-only / not a build lock. Chuck asked why Design was treating Dialog, Session, and Board Definition as three foci.

Answer: it shouldn’t. That was a fork, not the pattern.

Universal Board constitution: three panels, same behavior, different content. Nav selects one subject. That subject is the conversation. Chronicle is that body. Board-emphasis invariant: Design is a lens (structure, EntityKind, Treatment) on the same Dialog / Draft — it does not change what the object is.

What Design actually got: a spec-editor OS beside that path.
- `?definition=` — a second selection axis (Board Definition) that is not an EntityKind
- Conversation keyed to `boardDef` / frame, not the Nav Dialog
- Chronicle `isDesignerBoard` so the URL could outrank Dialog

Session is not a Nav subject on any board. It is which thread of the selected Dialog.

Proposal (not shipping unless Chuck locks it): retire Design’s second selection OS. Board Definitions remains a Nav item, mutually exclusive with Dialog — same exclusive list as every other board. No URL override. No Chronicle special case. Design stays a lens.
