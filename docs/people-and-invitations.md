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
8. The accept link keeps `?token=` through login and register. Login/register also redeem any pending invitations for that email, then land on the inviting Domain — not empty `/home`. Invited signups skip personal-domain creation.
9. Pending People shows when that email already has a Keeper account and has not arrived yet.

Cast Header / profile **Invite** opens Chronicle People. It does not open a modal.

## ⚠️ Later (not this slice)

- Custom Domain roles that persist
- Briefing becoming co-owned Library / Document
- File attachments from Library
- Ownership transfer Act
- Platform admin role-matrix bug (`GET /api/admin/roles/users`)

## 📆 Update Log

### 2026-09-17 — Invitation handoff
- Accept token is kept through login and register. Register/login redeem pending invitations by email and land on the inviting Domain. Pending People shows registered-not-arrived.

### 2026-09-16 — Invitation email
- Invite and granted-member mail go through Resend. Chronicle reports sent vs copy-link. Pending invitations can be resent.

### 2026-09-15 — People management first slice
- Chronicle invite panel replaces the collaborator popup.
- Origin Domain + invitation bundle + `invitedFromDomainId`.
- Accept uses role permission bundles. Pending invites can be revoked.
- Briefing notes/prompts/documents are inviter-held agent context.
