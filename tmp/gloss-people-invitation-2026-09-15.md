Cursor · People and invitation (2026-09-15)

Gloss-only. Not a build lock.

People on Keeper is the human relationship to a Domain — not an EntityKind, not a popup.

What we found
- Membership already lived on Domain.ownerId + DomainPermission. Invitation already existed. The live surface was Chronicle Config → People. The broken part was the invite popup, accept granting the wrong permissions, and no memory of which Domain invited the person.

What People is
- Identity is the users row.
- Relationship is per Domain: Owner (ownership), Admin, Member, Friend, Connection.
- Invitation is a pending relationship plus a briefing for the Domain lead.
- The Domain you stand in when you invite is the origin. That origin is kept even if they later join other Domains.
- First arrival onto Keeper is users.invitedFromDomainId — written once.

Roles
- Owner is displayed, not assigned by invite.
- Member is the stored `user` key, labeled honestly now.
- Custom Domain roles are stubbed. When they come, they will name a relationship and map onto these permission bundles — not a second engine.
- Domain-level user management belongs in Chronicle People. Admin/Owner.

Invitation, this slice
- Invite is a Chronicle panel. Cast Header and profile Invite open that panel.
- You can attach notes, prompts, and short documents so the lead knows the person. Held by the inviting Domain until co-ownership exists.
- You can also invite them onto other Domains you administer. Same briefing. Same bundle. Accept can join them all.
- Accept now grants the invited role’s real permissions. Pending invites can be revoked. Copyable link still — Keeper does not send email yet.

Later
- Email delivery.
- Custom Domain roles that persist.
- Briefing becoming co-owned.
- Ownership transfer as an Act.

Chuck: this is the first solid step. Invitation works in Chronicle. Roles are named. Origin is tracked.
