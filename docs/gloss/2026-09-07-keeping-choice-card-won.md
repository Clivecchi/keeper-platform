Cursor · Keeping Choice first live test — card won (2026-09-07)

Gloss-only / not a build lock. Investigation only. Does not create Points.

Chuck’s first live Keeping Choice test (ke3p · Finding the Plot, session Document Gloss, 2026-09-07T23:29Z) did not emit keepingChoices.

Code truth: this is not a transport or UI miss. Railway and Vercel are on c0fcf5fb. Kip (gpt-4o) returned a valid agent_output with card type summary — Lock / Open / Next Step — and actions []. The raw model string has no keepingChoices field. Parser and persist did not drop offers. Mechanism was plain_lead; no Cast consult. No Point. draftIntent null.

The standing winner is buildKeeperCardRenderingPrompt: operational/decision language plus the DECISION / CAST CONSULT SYNTHESIS example (Lock / Open / Next Step, actions [], no keepingChoices). That block is always injected. Its stated trigger (human asked for a lock, or multi-cast Document synthesis) was not met. The model used the template anyway because it is the most concrete JSON shape, and “lists the user must act on” classifies a principle + first performance as a decision card.

KEEPING CHOICES vs DIRECTED KEEPS is present later, optional, and never names Lock / Open / Next Step as the competing inert form. “What do you think?” could have stayed prose-only under the relational rule.

Recommendation (not implemented): a bounded prompt/contract edit in the same helper. Tighten when the decision card is required. Say that an optional future keeping act is keepingChoices, not an inert Next Step / Lock item. Do not convert every Lock/Open/Next Step. Do not add a keyword router. Do not force choices.
