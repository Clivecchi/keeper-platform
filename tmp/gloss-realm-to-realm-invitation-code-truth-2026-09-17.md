Cursor · Realm-to-Realm invitation — code truth (2026-09-17)

Gloss-only. Not a build lock. Audit only. Does not implement.

Chuck asked for the live invitation-to-onboarding path before a vertical slice: Invitation Object → delegated KAM relationship → seeded Dialog → inviting Domain Lead hosts arrival → invited member’s Lead can participate.

Do not invent a replacement. Extend what exists. Flag conflicts.

What is live
- Invitation object is DomainInvitation (domainId, originDomainId, bundleId, email, role, token, seed). People UI + accept + redeem-on-auth.
- Relationship after accept is DomainPermission on the inviting Domain(s). Owner is Domain.ownerId. There is no DomainMember table.
- First authenticated experience after redeem is /d/{slug}?board=domain. Invited register skips creating a personal Domain.
- Inviting Lead is settings.primaryAgentId (frame_json.kip.agent_id is the mirror). Invitation seed becomes peopleNotes in that Lead’s environment — not a Dialog.
- Dialog can be created with context { board, frame, subject }. DialogCastMember can put another Domain’s Lead onto a Dialog (admin of that home Domain; enablement, not full delegation). Cast consult / delegate.consult is how one agent addresses another.
- Public domain metadata exists as by-slug, frame, audience, agency-place — not a single manifest.

Conflicts with Realm-to-Realm (do not paper over)
- Invited members currently have no Domain and therefore no Lead. The last handoff slice skipped personal-domain creation on invite. “Invited member’s Lead can participate” cannot happen until they have a Realm/Domain with a Lead. That fights the skip.
- KAM is not a relationship protocol. Canonical auth is inline JWT in apps/api/src/index.ts. packages/kam login/register are stale. DomainAuthManager is partial. DomainAccessKey scopes are MCP (dialog.ro, gloss.rw), not person-to-person delegation. The delegated relationship that exists is DomainPermission.
- Dialog available_to is only admin | keeper. There is no People Dialog kind. Cast members are agents, not humans.
- No ChronicleEvent or Realm feed event is written on invite or accept.
- realmInvitations.ts is /home UI doors. Not this invitation.
- Viewer leak: any authenticated user gets read on any domainId in middleware. Invite accept uses DomainPermissionService and does not use that leak.

Smallest extension (if locked later)
- Keep DomainInvitation as the object. Put invitationId + seed into Dialog.context on accept. Create that Dialog on originDomainId. Open it on landing.
- Treat DomainPermission as the KAM-facing relationship. Do not add a second grant engine.
- Host with the origin Lead (already the runAgent default on that Domain). Enable the invitee Lead via DialogCastMember only after they have a home Domain — that provision is the blocking product decision, not a missing table.
