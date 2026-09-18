Cursor · Invitation email via Resend (2026-09-16)

Gloss-only. Not a build lock.

People invitations now send mail. Resend was already on the API for Cloud status (`resend.status.read`). Invite never called it. That is why the invitation created a link and no email arrived.

What shipped:
- `POST /api/domains/:id/connections/invite` emails the person. Existing Keeper accounts get “you were added.” New emails get the accept link. Chronicle says sent, or keeps the copyable link if send fails. The invitation is still created either way.
- `POST /api/domains/:id/invitations/:invitationId/resend` sends again from pending People.
- From: `RESEND_FROM_EMAIL` or `Keeper <invites@ke3p.com>`. Accept URLs use `PUBLIC_WEB_ORIGIN`.
- Briefing notes stay with the inviting Domain. They are not the email body.

Needs on Railway API: `RESEND_API_KEY`, and ke3p.com (or the From domain) verified in Resend. If either is missing, People will say the invitation was created and email could not be sent.
