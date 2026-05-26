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
- [x] `frame_json Json? @default("{}")` added to `Domain` model — migration `20260305_add_domain_frame_json` applied
- [x] `loadDomainFrame` now fetches from `GET /api/domains/:slug/frame` (database-driven)
- [x] `domain-frame.default.ts` remains as a static fallback — do not delete
- [ ] Per-domain frame JSON can now be customised per domain via a DB update to `frame_json`
- [ ] `DEFAULT_DOMAIN_FRAME` is the fallback if the API is unavailable or returns non-ok

## 📆 Update Log

### 2026-05-21 — jsonframe Step 3: interaction_bar.labels
- Added `DomainFrameInteractionBarLabels` and required `labels` on `DomainFrameInteractionBar`
- Default frame, API fallback, and DB seed updated with explicit bar labels
- `loadDomainFrame` merges partial API frames with default labels for older `frame_json` rows

### 2026-03-08 — Image generation fields added to DomainFrameKip (Step 1 of 4)
- Added `image_style?: string` and `image_model?: string` as optional fields to `DomainFrameKip` interface in `domain-frame.types.ts`
- Added default values to `DEFAULT_DOMAIN_FRAME.kip` in `domain-frame.default.ts`:
  - `image_style`: `"warm, human, memory-like — soft natural light, candid, intimate scale"`
  - `image_model`: `"black-forest-labs/FLUX.1-schnell"`
- Both fields are optional — existing code reading `DomainFrameKip` is unaffected
- These are domain-level creative anchors for Kip to use when composing an image generation brief; Kip may use, fold in, or ignore them depending on context

### 2026-03-05 — Domain JSON Database Migration
- `loadDomainFrame` updated to fetch from `GET /api/domains/${slug}/frame` via `getApiBase()` (handles dev/prod URL resolution).
- Falls back to importing `DEFAULT_DOMAIN_FRAME` dynamically on any fetch failure (non-ok status or network error).
- `domain-frame.default.ts` retained as static fallback — not deleted.
- Console log `[DomainFrame] Loaded for domain: <slug>` now emits on successful API fetch.

### 2026-05-25 — Experience rename: `experienceContext` → `agentContext`
- Kip injection payload renamed across web/API; shape unchanged.

### 2026-03-03 — Step 6: Kip reads the JSON
- `agentContext` is now computed in `Margin.tsx` from `domainFrame` + `resolvedAudience`
- Shape: `{ audience, model, forward, directions (filtered by role), kip_context }`
- Passed to `CompanionSlide` → `KipApi.runAgent()` → API → `AgentEnvironmentContext.agentContext`
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
