Cursor · Mail From is Domain identity (2026-09-17)

Gloss-only. Corrects the earlier “one platform sending domain” note. Not a build lock.

Chuck’s point: Keeper is multi-tenant. Domains already have independent public addresses (custom domain + `{slug}.keeper.domains`). ke3p.com must not send mail for livecchi.biz.

That is right. Invitation From should be the inviting Domain’s address, the same independence Addresses already holds for the website.

`*.keeper.domains` still does not solve it. Resend verifies an exact host, not a wildcard. And livecchi.biz is not on that tree — a keeper.domains wildcard would never speak for a custom Domain.

Do not add each Domain by hand in the Resend dashboard. Resend’s multi-tenant model is API: create the tenant domain, show DNS, verify, send From that host. That belongs in Addresses, next to the web host.

Two hosts already exist:

- `{slug}.keeper.domains` — we hold DNS. Sending identity can be provisioned without the owner.
- Custom domain (`livecchi.biz`) — the owner adds Resend’s records the same way they already add web DNS.

ke3p.com verification now is only so **ke3p** can mail as ke3p. It is not the platform From for other Domains.

Later: if a Domain has no verified sending host yet, do not fall back to ke3p.com pretending to be them. Honest: invitation created, copy the link — or wait until that Domain’s mail address is live.
