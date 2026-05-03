# Panels

## 📌 Purpose
Standalone right-panel view state components. Each panel is self-contained: it fetches its own data, renders its own header, and manages its own scroll. Panels are wired into Board right columns via Board-level state.

## 🧱 Key Files
- `KeeperJourneyPanel.tsx` — Journey view state panel. Renders a Journey as a living document: title, forward statement, status badge + moment count, then each Path in order with its prelude (italic, faint) and Moments listed beneath. `+ Add Moment` below each Path's list; `+ Add Path` below the last Path.
- `KeeperViewPanel.tsx` — Keeper view state (session resumption surface). Shown when a specific Keeper is in focus but no Journey is selected. Three sections: Keeper identity (Cormorant Garamond name + description), Recent Sessions (top 3, tappable with relative time), Active Journeys (tappable with moment count).
- `HomeViewPanel.tsx` — Home view state (platform landing surface). The true default — shown when nothing is selected and no specific Keeper is in focus. Two sections: Platform identity (name + tagline), Active Journeys (cross-domain, up to 5, with domain + keeper context per journey).

## 🔄 Data & Behavior
- `KeeperJourneyPanel` fetches `GET /api/journeys/:id` (authenticated) which returns `paths[].Moment` nested. One fetch — no secondary requests.
- `onMomentSelect(momentId)` — called when a Moment row is tapped. The Board handles navigation.
- `onPathSelect(pathId)` — called when a Path header is tapped (also toggles collapse).
- Paths are expanded by default. Path collapse is local state.
- `+ Add Path` opens an inline form (name + optional prelude). Posts to `POST /api/paths` on confirm.
- `+ Add Moment` is a visible affordance; action infrastructure wiring is Board-dependent.

## ⚠️ Notes & ToDo
- [ ] `+ Add Moment` inline form — implement when Action infrastructure is available in the IDE Board context.
- [ ] `onPathSelect` currently only collapses the path locally — wire scroll-to-path behavior in IDE Board when there are many paths.
- [ ] Status badge is static ("Active") — wire to `journey.status` field once schema adds it.
- [ ] `domainId` prop is accepted but not used in the fetch (the authenticated journey endpoint doesn't require it). Reserved for future domain-scoped filtering.
- [ ] `KeeperViewPanel` — `onSessionSelect` is not wired in Domain Board (no session state there). TODO: connect when Domain Board gains session management.
- [ ] `KeeperViewPanel` — `recentSessions` is always `[]` in Domain Board. Fetch sessions in DomainBoard or share session state from IDE Board.
- [ ] `HomeViewPanel` — `activeJourneys` currently receives `domain: slug` and `keeperName: ""` (empty). Enrich journey objects with per-keeper data when a cross-domain journeys API is available.
- [ ] `HomeViewPanel` — tagline is hardcoded as "cryptically designed, wonderfully unfolded". Pull from domain JSON when a platform-level frame key is defined.
- [ ] `HomeViewPanel` — `KeeperViewPanel` is the default in DomainBoard (wordmark is always present); `HomeViewPanel` there is a safe fallback but currently unreachable.

## 📆 Update Log
- 2026-05-02 (Sprint Item 4 — Journey Scoping Fix): `KeeperViewPanel.tsx` receives `activeJourneys` that are now pre-filtered in `IDEBoard.tsx` by the selected keeper's ID. No changes to this file — the fix lives upstream. Empty-keeper state ("No journeys yet") was already handled correctly.
- 2026-05-01 (Sprint Item 3 — Home View State): Created `HomeViewPanel.tsx`. Platform-level landing state for IDE Board. Shown when `keeperName === null` (no keeper explicitly in focus). Receives `platformName` (from `domainFrame.theme.wordmark` or "KE3P"), `activeJourneys` (current loaded journeys mapped with `domain: slug` and `keeperName: ""`). IDEBoard right-panel priority order updated to: Service → IDEBoardContext → KeeperViewPanel (if keeperName non-null) → HomeViewPanel. DomainBoard receives same priority order; HomeViewPanel is wired as last fallback (unreachable while wordmark is present). No new API calls introduced.
- 2026-05-01 (Sprint Item 2 — Keeper View State): Created `KeeperViewPanel.tsx`. Default right-panel view state for IDE Board and Domain Board. Wired as the fallback when `activeJourneyId`, `selectedDraftId`, `selectedMomentId`, and `selectedKeeperId` are all null. IDE Board passes real session list (top 3 with `updatedAt`) and full journey list. Domain Board passes journey list (authenticated fetch added) and empty sessions. `IDEBoardNav.tsx` extended to forward `updatedAt` on each session item. `NavSession` type in `IDEBoard.tsx` extended with `updatedAt: string`.
- 2026-04-28 (Prompt 5): Created `KeeperJourneyPanel.tsx`. First panel in this directory. Wired to IDE Board (`IDEBoardContext.tsx`) and Domain Board (`DomainBoard.tsx`).
