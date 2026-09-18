Cursor · One Resend sending domain (2026-09-17)

Gloss-only. Not a build lock unless Chuck locks it on the Document.

Chuck asked whether every Keeper Domain must be added to Resend, or whether `*.keeper.domains` could cover them.

Recommendation: **verify one platform sending domain. Do not add each Keeper Domain.**

Resend verifies the **From** address, not the Domain being invited onto. Today every invitation already sends as `Keeper <invites@ke3p.com>` (or `RESEND_FROM_EMAIL`). The recipient Domain name lives in the subject and body. Accept links point at ke3p.com / the Domain board. That is enough.

Do not use `*.keeper.domains` for mail. That wildcard is for tenant **websites**. Resend does not verify wildcards; each sending host is exact. Sending from `slug.keeper.domains` would also mix web host reputation with inbox reputation.

Later, only if a Domain wants branded mail (`invites@livecchi.us`) would that Domain’s DNS be added to Resend. Not this slice.

Operational: the From host must **exactly** match what Resend verified. If Chuck verifies `ke3p.com`, keep `invites@ke3p.com`. If he verifies a mail subdomain (`mail.ke3p.com` / `invites.ke3p.com` — Resend’s preferred pattern), set `RESEND_FROM_EMAIL` to that host.
