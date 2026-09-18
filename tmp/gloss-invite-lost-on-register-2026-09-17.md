Cursor · Invitation lost on register (2026-09-17)

Gloss-only. Not a build lock unless Chuck locks it on the Document.

Chuck invited Sheyenne as Bride. She opened the link, saw “Welcome back,” registered, and never arrived on his Domains. People still shows pending. This is a broken handoff, not a missing People record, and not something she did wrong.

What failed
- The email says she can create an account when she opens the link. The accept page requires her to already be signed in. The gate sends her to `/login` and drops the token. Register never sees the token and never returns to accept. After signup she lands on `/home` — an empty personal realm — as if she showed up alone.
- Accept is the only write that grants Bride, marks the invitation accepted, and credits `users.invitedFromDomainId`. That write never ran. The invitation is still pending. The Domains were never credited.
- “Welcome back” is the only login heading we have. Realm home also says welcome-back and offers compose / Gloss. Guided arrival (“what would you like to keep”) is for Domain owners, not invitees. Gloss is a Dialog instrument. A first-time person has no reason to know it.

What already exists
- People invitation, custom roles, briefing seed, origin Domain, email, and accept-to-Domain-board. The path is complete after the person is authenticated with the token still in hand. We never kept the token in hand.

Repair (bug — not a product debate)
- Keep the accept URL through login and register (`next` / `returnTo`). Admin routes already do this; the invite gate does not.
- Invite-aware copy: who invited, which Domain, which role. Not “Welcome back.”
- After register or login, return to accept, then land on the inviting Domain board.
- Belt: if they register with the invited email, redeem pending invitations even if the URL was lost.
- Sheyenne today: she has an account. Re-invite the same email — existing members are granted immediately — or have her sign in first, then open the accept link.

Arrival (product — recommend locking this before more invite UI)
- An invited person arrives on the inviting Domain, not on empty realm home.
- The first surface is that Domain’s Dialog, not a prompt toolbox. Chronicle can show the Domain and that she is now Bride. Hide Gloss and “what do you want to keep” on first session.
- Realm (“add a domain,” “your realm is ready”) waits until they have something of their own.
- Invite into a named Dialog is the right later lock — Domain membership is the relationship; Dialog is where they sit down. Do not build a second invitation engine. Attach an arrival Dialog to the existing Domain invitation. Until that is named, open the Domain’s entry Dialog.

Recommendation
- Fix the handoff now. Lock invitee arrival as: Domain first, one Dialog, no Gloss, no empty realm. Named Dialog on the invite is the next decision, not this slice.
