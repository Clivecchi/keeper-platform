# V0 Shell

## 📌 Purpose
Centralize frame routing, theme application, and navigation helpers for domain board surfaces.

## 🧱 Key Files
- `V0Shell.tsx`
- `V0ShellContext.tsx`
- `FrameContext.tsx`
- `useExperienceMode.ts`
- `useWorkspaceMode.ts`
- `useWorkspaceView.ts`

## 🔄 Data & Behavior
The shell resolves the domain slug, applies the active theme/style, and routes frames by query param. It exposes navigation helpers so frames can build URLs and return to `/d/:slug/board` with theme preserved.

`FrameContext` implements the **Context Contract**: a single provider that derives auth, domain, active keeper/journey, theme, and frame metadata. Frames consume this via `useFrameContext()` instead of ad-hoc prop/query-param parsing. Keeper and journey selection is persisted per-domain in localStorage.

`useWorkspaceView` manages an open-ended `WorkspaceView` discriminated union serialized to URL search params. It replaces `useWorkspaceMode` for workspaces that need entity-level navigation (e.g. clicking a journey in the sidebar loads its detail view). View kinds: `feed` (activity stream), `entity` (journey/keeper/moment detail), `create` (inline engagement form), `summary` (commons overview). `useWorkspaceMode` remains available for simpler fixed-mode use cases.

## ⚠️ Notes & ToDo
- [ ] Replace fallback domain data once domain home board wiring is live.
- [ ] Add theme resolution from Journey/Keeper/Domain hierarchy (MVP uses URL param only).
- [ ] Default keeper/journey creation when none exist for a domain.

## 📆 Update Log
- 2026-02-28: FrameContext now derives domain from V0Shell domainData when inside V0Shell — single /api/domains/by-slug fetch, eliminates duplicate domain requests and staged load flicker.
- 2026-01-31: Registered the Present frame in the v0 shell frame registry and frame key union.
- 2026-01-27: Added Experience Mode controller + actions and allowed public Kip frame access.
- 2026-01-19: Added kip frame alias to point at the agent surface.
- 2026-01-19: Registered the Index frame in the v0 shell frame registry and frame key union.
- 2026-01-19: Added visible build stamp (commit + build time) for v0 shell frames.
- 2026-01-18: Added canonical v0 shell routing + navigation helpers.
- 2026-01-24: Redirected unauthenticated requests away from private frames (kip/agent/admin/profile).
- 2026-01-25: Gated the build timestamp HUD behind `VITE_SHOW_DEBUG_HUD` and moved it away from the bottom margin.
- 2026-01-25: Defaulted authenticated domain board routing to the Commons frame.
- 2026-02-05: Added `FrameContext.tsx` implementing the Context Contract (auth, domain, keeper/journey selection, theme, frame metadata). Injected `FrameContextProvider` inside V0Shell wrapping all frame components.
- 2026-02-09: Extracted `useWorkspaceMode` — generic hook for URL-driven workspace mode state. Reads/writes a search param, validates against an allowed mode list, and falls back to a default. Used by CommonsFrame and available for any frame with switchable workspace modes.
- 2026-02-09: Added `useWorkspaceView` — URL-driven workspace view state hook using a `WorkspaceView` discriminated union (`feed | entity | create | summary`). Replaces fixed mode enums for workspaces that need entity-level navigation. Serializes view state to `?view=`, `?entityType=`, `?entityId=`, `?template=` search params. `useWorkspaceMode` remains for simpler fixed-mode cases.
