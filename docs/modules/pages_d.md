# Domain Pages

## 📌 Purpose
Pages for domain-related functionality, including public domain boards, domain dashboard (Feed/Keepers/Journeys/Profile/Kip), and domain management.

## 🧱 Key Files
- `PublicDomainPage.tsx` - Public domain board (logged out) or redirects to Feed (logged in)
- `DomainFeedPage.tsx` - Domain workspace home - Feed view (V0 dashboard)
- `DomainKeepersPage.tsx` - Domain keepers listing (V0 dashboard)
- `DomainJourneysPage.tsx` - Domain journeys listing (V0 dashboard)
- `DomainProfilePage.tsx` - User profile within domain (V0 dashboard)
- `DomainAdminPage.tsx` - Domain admin interface (V0 dashboard) with policy editor
- `DomainAgentPage.tsx` - Kip Agent Board (Dialogue / Cockpit / Sessions) inside the domain shell

## 🔄 Data & Behavior

### PublicDomainPage
- **Route**: `/d/:slug` (public board) or `/d/:slug/board` (always shows board)
- **Logged out**: Shows public domain board (cover, manifesto frames)
- **Logged in on `/d/:slug`**: Redirects to `/d/:slug/feed` unless `?frame=moment`
- **Logged in on `/d/:slug/board`**: Shows public board with "Back to Dashboard" link

### Domain Dashboard Pages (V0 Layout)
All domain dashboard pages use `KeeperDashboardLayout` with left nav (Feed, Kip, Keepers, Journeys, Profile):
- **DomainFeedPage**: `/d/:slug/feed` - Domain workspace home with activity feed
- **DomainKeepersPage**: `/d/:slug/keepers` - Domain keepers listing
- **DomainJourneysPage**: `/d/:slug/journeys` - Domain journeys listing
- **DomainProfilePage**: `/d/:slug/profile` - User profile in domain context
- **DomainAgentPage**: `/d/:slug/agent` - Renders `KipAgentBoard` (Dialogue / Cockpit / Sessions)
- **DomainAdminPage**: `/d/:slug/admin` - Domain admin interface

### DomainAgentPage – Kip Agent Board
1. `/d/:slug/agent` fetches the domain metadata and then renders the shared `KipAgentBoard` component so that the experience matches the dedicated `/kip` view.
2. `KipAgentBoard` relies on `useAgentSessions` for `/api/kip/agents?sessions=true&agentId=<lead>` and `/api/kip/agents?messages=true&sessionId=...` to hydrate the left column + dialogue tab.
3. Sending a message calls `action="run"` on `/api/kip/agents`, appends the optimistic user bubble, then refreshes sessions/messages on success.
4. Context panels (related journeys, keeper) currently use placeholder `LinkedCard` props; they will be wired to domain data in a later iteration.
5. The domain shell still controls routing/nav state (`KeeperDashboardLayout`), so switching tabs or sessions keeps the left navigation consistent with other dashboard pages.

### Routing
- Domain dashboard routes are **outside** `AppLayout` (no Studio sidebar)
- All domain dashboard routes use `KeeperDashboardLayout` (V0-style)
- Public board routes use `BoardPublicLayout` (full viewport, no shell)

## ⚠️ Notes & ToDo
- [ ] Implement real feed data (moments, keepers, journeys activity)
- [ ] Add domain keepers listing with real data
- [ ] Add domain journeys listing with real data
- [ ] Add domain member management
- [ ] Add domain API keys management
- [ ] Add membership date to profile page
- [ ] Wire Kip context cards (Journeys/Keepers) to domain-aware sources

## 📆 Update Log

### 2026-01-14 - Add kept moments frame
- Added `frame=moments` support to render a minimal kept-moments list for domain verification.

### 2026-01-14 - Preserve draftId on Moment frame
- Passed `draftId` query param through `PublicDomainPage` to `MomentFrame` and added dev logging for frame params.

### 2026-01-14 - Preserve moment frame on domain routes
- Allowed `?frame=moment` to render the V0 Moment frame on `/d/:slug` instead of redirecting to `/d/:slug/feed`, ensuring the "Write a Moment" CTA stays on the authoring surface.

### 2025-12-17 - Domain policy editor
- Added a JSON editor on `DomainAdminPage` that loads/saves domain policy via `/api/domains/:domainId/policy`, showing source/version and refresh controls.
### 2025-12-10 - Stubbed domain previews ready for board wiring
- Added stub hooks (`useDomainFeedPreview`, `useDomainJourneysPreview`, `useDomainKeepersPreview`) and centralized placeholder cards so the V0 dashboard pages can swap to real board/frame data without structural changes.

### 2025-12-09 - Kip Agent Board in Domain Shell
- `DomainAgentPage` now renders the shared `KipAgentBoard`, reusing the Dialogue/Cockpit/Sessions tabs and `/api/kip/agents` flows instead of the legacy `/api/domains/:id/agent/execute` endpoint.

### 2025-12-08 - Kip Error Handling & Theme Guard
- Documented the domain agent execution ladder, auto-assigned Kip as the default primary agent, and wired typed error codes through to the V0 Kip UI.
- Clarified ThemeContext behavior: skip `/api/kam/settings` when only cookie auth exists to avoid 401 spam.

### 2025-01-21 - Domain Dashboard Separation from Studio
- Separated domain dashboard routes from Studio/AppLayout
- Created DomainFeedPage, DomainKeepersPage, DomainJourneysPage, DomainProfilePage
- Updated PublicDomainPage to redirect logged-in users to Feed
- Added `/d/:slug/board` route for "View Domain Board" functionality
- Fixed KeeperDashboardLayout: made logo clickable, fixed nav paths
- Added "View Domain Board" link in dashboard header
