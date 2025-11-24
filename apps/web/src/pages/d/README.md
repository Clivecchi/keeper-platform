# Domain Pages

## 📌 Purpose
Public and authenticated domain experiences, including the story view, admin tools, and the agent workspace.

## 🧱 Key Files
- `PublicDomainPage.tsx`
- `DomainAdminPage.tsx`
- `DomainAgentPage.tsx`
- `DomainViewNavigation.tsx`

## 🔄 Data & Behavior
Routes under `/d/:domainSlug` fetch domain + board data to render frames, manage permissions, and provide navigation between public, agent, and workshop spaces.

## ⚠️ Notes & ToDo
- [ ] Phase 2: Move the public view to fully frame-driven narrative styling.
- [ ] Phase 3: Mount the V0 agent dashboard + chat experience inside `DomainAgentPage`.

## 📆 Update Log
- 2025-11-24: Initial README covering Domain story / agent / admin pages.

