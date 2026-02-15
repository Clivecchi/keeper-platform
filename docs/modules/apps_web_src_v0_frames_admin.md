# Admin Frame

## 📌 Purpose
Domain admin surface rendered inside the v0 board frame layout. Manages domain configuration, policy, profile, and governance.

## 🧱 Key Files
- `AdminFrame.tsx` - Frame chrome and DomainAdminContent container
- `DomainAdminContent.tsx` - Domain Manager, Profile, Policy, DomainGovernanceCard

## 🔄 Data & Behavior
- Renders inside V0Shell when `frame=admin` (e.g. `/d/:slug/board?frame=admin`)
- Uses `DesignFrame` with Back to Commons button; `closeToBoard` returns to commons
- DomainAdminContent loads domain by slug, policy via KipApi, profile via apiFetch
- Legacy route `/d/:slug/admin` redirects to `/d/:slug/board?frame=admin`

## ⚠️ Notes & ToDo
- [ ] Consider domain-owner permission check (vs platform admin only)

## 📆 Update Log
- 2026-02-14: Refactored into v0 board frame layout. AdminFrame now renders DomainAdminContent in-frame; removed redirect. DomainAdminPage redirects to board?frame=admin. goAdmin navigates to buildFrameUrl("admin").
- 2026-01-25: Redirected admin frame to the domain admin route.
- 2026-01-19: Added board context display for domain home board admin entrypoint.
- 2026-01-18: Added admin frame placeholder for v0 shell routing.
