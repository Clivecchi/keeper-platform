Cursor · First Introduction is live (2026-09-17)

Gloss-only. Not a TypeSafe lock. Not a second Invitation model.

The locked First Introduction slice is in the platform:

- Param-scoped Domain routes no longer grant every signed-in person `viewer` read. Access is owner, unexpired DomainPermission, keeper-in-domain, or public Domain.
- Every registered Keeper gets a home Domain and Lead, including invitees. Invitation adds DomainPermission. It does not replace that Realm.
- Accept/redeem is idempotent: grant → home Realm → invitation-linked Dialog → invitee Lead on Cast → structural Chronicle.
- DomainInvitation.seed is inviter direction for the origin Lead (`context.arrival.introductionPurpose: lead-direction`). It is not the first Dialog message. Public invitation copy can later be a sibling field on the same invitation.
- Landing is `/d/{slug}?board=domain&dialogId=`. Universal Board honors `dialogId` the way it already honors `draftId`.
- Connection / read-only roles still cannot speak. Write was not bypassed.
- TypeSafe is not coupled. That spike stays parallel.

What to watch when we walk Sheyenne through it: migrate `Dialog.invitationId` on the live database, then accept again. If her Lead does not appear on Cast, the home Realm provision failed and the Dialog should still exist.
