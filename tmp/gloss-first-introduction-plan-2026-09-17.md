Cursor · First Introduction — locked decision and build plan (2026-09-17)

Gloss-only until Chuck locks the plan on the Document. Not coded this turn.

Locked: every registered Keeper gets a personal/home Domain and Domain Lead, including invitation signups. An invitation adds DomainPermission relationships. It does not replace the invitee’s home Realm.

First Introduction slice (extend, do not replace):
DomainInvitation → accept → provision invitee home Domain/Lead → DomainPermission on origin (and bundle) → arrival Dialog on origin Domain with durable invitationId + typed context.arrival → origin Lead hosts → invitee Lead enabled as DialogCastMember → Chronicle structural event.

Authorization first: remove ensureDomainContext’s “any authenticated user gets read.” Correct order: owner → DomainPermission → existing keeper-in-domain relationship → public Domain read → else none. Do not invent KAM grants.

Dialog identity: Dialog.invitationId FK, not a new Invitation model. Typed context.arrival (not context.subject) holds the structured snapshot. Merge, do not replace, board/frame/subject.

available_to: add member. Arrival Dialog is domain-level (user_id null), available_to member. Visible to people with read on that Domain. Not guest chat. Do not tighten existing admin Dialogs in this slice.

Cast conflict: listDialogCastMembers currently hides a foreign Lead unless the requester admins that home Domain. Chuck would not see Sheyenne’s Lead. Slice must list invitation-enabled Cast for anyone with read on the arrival Dialog’s Domain. Enable still requires the invitee as owner of their home Domain (server does this on accept).

Do not build: new Invitation model, A2A protocol, KAM grant engine, Manifest, TypeSafe.
