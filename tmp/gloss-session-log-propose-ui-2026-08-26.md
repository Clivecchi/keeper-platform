Cursor · Session action log · Propose as UI (2026-08-26)

Gloss-only / not a build lock.

Chuck's correction: assuming "Yes" is a Point is the wrong fix. If Ceox offers a Gloss and Chuck says yes, that is Gloss. The deeper miss is that agents still ask whether they may add a Point. They should not ask. They should propose the Point as a card in the same response. The human Accepts there. That is what solves duplicate, yes-vs-Gloss, and "I talked about adding it."

**What shipped:**
- Session action log in the Lead prompt — UTC time, action type, success/skip, Point title. Receipts already lived on the message; the Lead can now read them. Narration is not evidence. "No receipts yet" is honest.
- Points land as proposed. Keeper shows a card with Accept. Dialog Documents are no longer auto-kept. Chronicle Accept was already there; Dialog Accept is wired.
- Agents are instructed not to ask "want me to add that as a Point?" If they ask anyway, Keeper follows up and emits the propose.
- "Yes" after a Gloss offer is Gloss.

This is the audit object without an Audit agent. The record is Keeper-owned. The Lead reads it. The human Accepts.
