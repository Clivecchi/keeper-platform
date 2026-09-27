# People and Invitations

## 📌 Purpose
How Keeper knows humans: identity, Domain relationship, invitation, and the briefing that teaches the Domain lead who they are. People is Domain Config in Chronicle — not an EntityKind, not a popup.

## 🧱 What People is

People are not a hierarchy object. They are humans with a relationship to a Domain.

| Layer | Where it lives | What it is |
|---|---|---|
| Identity | `users` | The Keeper account |
| Membership | `Domain.ownerId` + `DomainPermission` | Relationship on **this** Domain |
| Invitation | `DomainInvitation` | Pending relationship + briefing for the lead |
| First arrival | `users.invitedFromDomainId` | The Domain that brought them to Keeper |

Do not conflate with:

- **Platform roles** (`roles` / `user_roles`) — super-admin, support. Keeper-the-platform, not Domain People.
- **Agent cast** (`DialogCastMember`) — agents, not humans.
- **DomainAccessKey** — machine access.

## 🧱 Domain roles (platform-wide, per Domain)

Owner is ownership (`Domain.ownerId`). It is displayed as a role. It is not assigned by invite.

Assignable relationships (stored on `DomainPermission.role`):

| Key | Label | Permissions |
|---|---|---|
| `admin` | Admin | manage People, Config, invite |
| `user` | Member | read, write, share |
| `friend` | Friend | read, write |
| `connection` | Connection | read |

Custom Domain roles are stubbed. When they arrive they will **name** a relationship and map onto these permission bundles — not a second permission engine.

Domain-level People management belongs in Chronicle Config → People. Admin/Owner only.

## 🔄 Invitation

One invite form in Chronicle People.

1. Inviter stands on a Domain. That Domain is the **origin**.
2. Identifier is email (new person) or display name (existing account).
3. Relationship is Admin / Member / Friend / Connection.
4. Briefing (name, belonging, about, notes/prompts/documents) seeds the Domain lead. Not email body. Held by the inviting Domain until co-ownership exists.
5. Optional: also invite onto other Domains the inviter owns or administers. Same briefing, same bundle.
6. Existing accounts receive membership immediately and get a “you were added” email. New emails receive an invitation from Keeper (`RESEND_API_KEY` on the API). The accept link is still copyable if send fails. Pending invitations can be resent.
7. Accept grants the invited role's real permissions (not a hardcoded read/write). Bundle siblings accept together. First origin Domain is written to `users.invitedFromDomainId` once.
8. The accept link is a public arrival page. The invited email is locked. A new person creates an account there; someone who already has an account signs in there. Membership is granted on that page, then they enter the inviting Domain. Login and register do not accept invitations by themselves.
9. An invited signup does not also create a personal Domain. A home Realm is still ensured when they arrive, named after them.
10. Pending People shows when that email already has a Keeper account and has not arrived yet. A member who never finished arrival can be returned to a pending invitation. That emails a new link and removes membership until they sign in.
11. Wrong password is recoverable. The arrival page and sign-in offer a reset link. The link can return them to the same invitation.

Cast Header / profile **Invite** opens Chronicle People. It does not open a modal.

## Locked arrival (2026-09-26)

She lands on **her Realm**. That home lists the Domains she was invited onto, and the Dialogs the inviter assigned from those Domains. Opening a Dialog enters the Domain that owns it. Stages will assign the same way later.

The **origin lead** — Ceox, when the invite starts on Chuck’s Domain — is the prominent guide. That lead represents the Domain that initiated the invitation and is there to direct and guide. Kip is available beside them for support and additional direction. Both guide. The origin lead is the more prominent of the two. Her Realm’s own lead remains the lead of her Realm.

Each Domain on the invite has its own role. The default is **Member** (`user`: read, write, share). The inviter can change it per Domain, using that Domain’s role list. Admin on Livecchi.biz and Mother on Generation are two choices on one invite. Named roles stay on the Domain that defined them.

The people of the invitation are in those places. The inviter is included, and so is everyone else brought in. Keeper is social: human and AI. An assigned Dialog stays on the Domain that owns it, and those humans share that one conversation. Each person is present as themselves. Their lead stands with them — Ceox with Chuck, her lead with her. The origin lead remains the prominent guide. Kip stays beside them. Stages follow the same pattern later.

Accept opens her Realm (`/home?domain={her slug}&dialogId=`). That Dialog is a directory: the origin lead named as guide, Kip beside them, and doors into the invited Domains and assigned Dialogs. Opening a door enters the Domain that owns it. The shared conversation stays on that Domain. The inviter and the invitee are both human members of it, and of any Dialog assigned on the invite. Each extra Domain on the invite has its own role, defaulting to Member. People can also be added on a Dialog after arrival.

The form still records one role on the origin Domain. Extra Domains default to Member and can be changed. Assigned Dialogs are chosen on the invite. Stages are still later.

## ⚠️ Later (not this slice)

- Custom Domain roles that persist
- Briefing becoming co-owned Library / Document
- File attachments from Library
- Ownership transfer Act
- Platform admin role-matrix bug (`GET /api/admin/roles/users`)

## 📆 Update Log

### 2026-09-27 — Arrival on her Realm, people in the Dialog
- Accept lands on her Realm Dialog with doors. Inviter and invitee share the Dialog on the owning Domain. People can be added later. Mobile keeps that Dialog in front and does not run the owner welcome over it.

### 2026-09-27 — Humans in the room
- The inviter and everyone else brought in belong on the assigned Dialog, sharing one conversation. Leads stand with their people. Built on accept and on the Dialog itself.

### 2026-09-26 — Arrival lock
- She lands on her Realm. Origin lead is the prominent guide; Kip is available beside them. Role defaults to Member and is chosen per Domain. Assigned Dialogs stay on the inviting Domain. Stages follow later.

### 2026-09-26 — Invitation arrival
- Membership is granted on the public accept page after sign-in, not as a side effect of creating an account.
- Accepted links still open sign-in and password reset. People can return a member to a pending invitation.

### 2026-09-17 — Invitation handoff
- Accept token is kept through login and register. Register/login redeem pending invitations by email and land on the inviting Domain. Pending People shows registered-not-arrived.

### 2026-09-16 — Invitation email
- Invite and granted-member mail go through Resend. Chronicle reports sent vs copy-link. Pending invitations can be resent.

### 2026-09-15 — People management first slice
- Chronicle invite panel replaces the collaborator popup.
- Origin Domain + invitation bundle + `invitedFromDomainId`.
- Accept uses role permission bundles. Pending invites can be revoked.
- Briefing notes/prompts/documents are inviter-held agent context.
