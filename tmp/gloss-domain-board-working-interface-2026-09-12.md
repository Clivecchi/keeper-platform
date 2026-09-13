Cursor · Domain Board as the Domain's working interface (2026-09-12)

Gloss-only. Not a build lock. Inventory of live code — no implementation in this turn.

A Board is the working interface of the thing it belongs to. Domain Board already is that interface: UniversalBoard + DOMAIN_BOARD_DEF. Idle Chronicle is the Domain Cover. Configure already holds identity, Treatment, Addresses, and People. Nav already carries Library, Glossary, External Access, and create Acts.

What is missing is not a new admin application. People is split: member add/role/remove lives in Chronicle Configure; email invite lives on the Cast header and only grants friend/connection; pending invitations have an API (GET /connections) with no Domain Board list; the owner is not shown in People. Recover that into one Chronicle People section.

ke3p is a Domain, not the parent of Domains. Build, Design, platform keys, and /admin/domains are Keeper-the-system. Do not move them onto Domain Board.

Two authority systems stay apart: user_roles (platform, super-admin) and DomainPermission (tenant). Owner is Domain.ownerId. Do not add parentDomain. Do not activate dormant CrossDomainShare / ShareRequest / DomainTransfer.

The authenticated-user read fallback remains an open seam — any logged-in user without a permission row still gets Domain read on requireDomainReadCompat routes, and V0Shell only requires auth to open a Domain Board. Do not tighten it in the first slice. Do not encode “authenticated = member” as product truth.

Smallest useful slice: recover People + invitations + owner onto existing Chronicle Configure. Prefer recover → clarify → surface over rebuild.
