Cursor · Point contract is content-only (2026-08-21)

Gloss-only / not a build lock.

Finding the plot still failed after the UI work because the action contract required the model to send a draft UUID. The model omitted it. Keeper answered “Draft id required for propose” and painted that contract line onto every Point card.

Agency correction: `draft.update.propose` now requires `payload.content` only. Keeper resolves or creates the Dialog manuscript at write time. Point wording is the beat — not Domain Contract, not schema rules, not Prisma.
