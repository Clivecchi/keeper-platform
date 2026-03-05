# v0/data

## 📌 Purpose
Static data sources and loaders for the JSON UI Frame system. This folder holds the domain frame JSON object — the single source of truth that every Frame reads on load.

## 🧱 Key Files
- `domain-frame.types.ts` — TypeScript interfaces for `DomainFrameJson` and all sub-shapes
- `domain-frame.default.ts` — Static seed for the "default" domain frame (migrates to DB after Step 6 confirmed)
- `loadDomainFrame.ts` — Async loader function; currently returns static default, swaps for API fetch after migration
- `resolveAudience.ts` — Pure function: takes `{ isAuthenticated, isAdmin }`, returns `AudienceRole`

## 🔄 Data & Behavior
`loadDomainFrame(domainSlug)` is called in `V0Shell.tsx` once per domain slug. It resolves to a `DomainFrameJson` object that is:
- Stored in `V0Shell` state as `domainFrame`
- Logged to the browser console as `[DomainFrame] Loaded for domain: <slug>`
- Exposed on `window.__keeper_domainFrame` for console verification
- Passed down to child Frames and Kip in Steps 2–6

## ⚠️ Notes & ToDo
- [ ] After Step 6 confirmed: add `frame_json Json?` field to `Domain` model via Prisma migration
- [ ] After migration: replace static return in `loadDomainFrame` with `apiFetch(/api/domains/:slug/frame)`
- [ ] Per-domain frame JSON objects will live in the database, keyed by domain slug
- [ ] `DEFAULT_DOMAIN_FRAME` covers all slugs until per-domain records exist

## 📆 Update Log

### 2026-03-03 — Step 6: Kip reads the JSON
- `experienceContext` is now computed in `Margin.tsx` from `domainFrame` + `resolvedAudience`
- Shape: `{ audience, model, forward, directions (filtered by role), kip_context }`
- Passed to `CompanionSlide` → `KipApi.runAgent()` → API → `AgentEnvironmentContext.experienceContext`
- API receives it via the `AgentRunSchema` and injects it into the environment after `resolveAgentEnvironment`
- Makes Kip aware of: who the visitor is, which model, what Forward means, available directions, domain instruction
- See also: `resolveAgentEnvironment.ts` (type), `agents.ts` (injection), `CompanionSlide.tsx` (prop)

### 2026-03-03 — Step 2: Audience resolution
- Created `resolveAudience.ts` — pure function, `AuthState → AudienceRole`
- Added `resolvedAudience` and `domainFrame` to `V0ShellContextValue`
- V0Shell computes `resolvedAudience` on every auth state change, logs `[AudienceResolution] Resolved role: <role>`
- Exposed on `window.__keeper_resolvedAudience` for console verification

### 2026-03-03 — Step 1: Initial creation (JSON UI Frame build)
- Created `domain-frame.types.ts` with full `DomainFrameJson` type tree
- Created `domain-frame.default.ts` with static seed matching spec v0.1
- Created `loadDomainFrame.ts` as async loader (static for now, API-ready)
- Wired into `V0Shell.tsx`: fetches on slug change, logs `[DomainFrame]` to console
