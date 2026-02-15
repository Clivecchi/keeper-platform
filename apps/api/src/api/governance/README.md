# Governance API Routes

## 📌 Purpose
REST endpoints for agent contracts and governance metadata. Domain-scoped governance CRUD and compliance are handled in domain routes.

## 🧱 Key Files
- `routes.ts` - GET /contracts, GET /contracts/:id

## 🔄 Data & Behavior
- **GET /api/governance/contracts** - List all AgentContracts (auth required)
- **GET /api/governance/contracts/:id** - Contract detail including full contractText
- Domain governance (policy, compliance) lives under `/api/domains/:domainId/governance`

## ⚠️ Notes & ToDo
- [ ] Admin-only contract creation/versioning (Phase 2)

## 📆 Update Log

### 2026-02-14 - Initial governance routes
- Added GET /contracts and GET /contracts/:id
- Mounted at /api/governance in index.ts
