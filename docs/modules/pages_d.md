# Domain Pages

## 📌 Purpose
Pages for domain-related functionality, including public domain boards, domain dashboard (Feed/Keepers/Journeys/Profile), and domain management.

## 🧱 Key Files
- `PublicDomainPage.tsx` - Public domain board (logged out) or redirects to Feed (logged in)
- `DomainFeedPage.tsx` - Domain workspace home - Feed view (V0 dashboard)
- `DomainKeepersPage.tsx` - Domain keepers listing (V0 dashboard)
- `DomainJourneysPage.tsx` - Domain journeys listing (V0 dashboard)
- `DomainProfilePage.tsx` - User profile within domain (V0 dashboard)
- `DomainAdminPage.tsx` - Domain admin interface (V0 dashboard)
- `DomainAgentPage.tsx` - Domain agent workspace (V0 dashboard)

## 🔄 Data & Behavior

### PublicDomainPage
- **Route**: `/d/:slug` (public board) or `/d/:slug/board` (always shows board)
- **Logged out**: Shows public domain board (cover, manifesto frames)
- **Logged in on `/d/:slug`**: Redirects to `/d/:slug/feed`
- **Logged in on `/d/:slug/board`**: Shows public board with "Back to Dashboard" link

### Domain Dashboard Pages (V0 Layout)
All domain dashboard pages use `KeeperDashboardLayout` with left nav (Feed, Kip, Keepers, Journeys, Profile):
- **DomainFeedPage**: `/d/:slug/feed` - Domain workspace home with activity feed
- **DomainKeepersPage**: `/d/:slug/keepers` - Domain keepers listing
- **DomainJourneysPage**: `/d/:slug/journeys` - Domain journeys listing
- **DomainProfilePage**: `/d/:slug/profile` - User profile in domain context
- **DomainAgentPage**: `/d/:slug/agent` - Agent workspace (Kip nav item)
- **DomainAdminPage**: `/d/:slug/admin` - Domain admin interface

### DomainAgentPage – Execution & Error Handling
1. UI posts to `executeDomainAgent` → `/api/domains/:domainId/agent/execute`.
2. Backend auto-assigns the Kip Lead agent when `settings.primaryAgentId` is missing (lazy assignment logged with domain id/slug) before invoking `KipAgentService`.
3. `KipAgentService` propagates typed error codes (`MISSING_API_KEY`, `INVALID_MODEL`, `PROVIDER_UNAVAILABLE`, `AGENT_MISCONFIGURED`), which the route maps to HTTP status + JSON payloads.
4. The Kip UI inspects `error.code` from `apiFetch` and renders friendly copy instead of raw `HTTP 400`. Error ladder:
   - `NO_PRIMARY_AGENT` → Prompt to configure Kip from Studio/Domain Board.
   - `MISSING_API_KEY` → Ask admins to add an AI provider key.
   - `INVALID_MODEL` → Update the agent to a supported model.
   - `PROVIDER_UNAVAILABLE` → Ask the user to retry soon.
   - `AGENT_MISCONFIGURED` → Re-save or reassign the agent in Studio.
5. ThemeContext only calls `/api/kam/settings` when a bearer token exists; cookie-only sessions stick with the Keeper Classic fallback to avoid log noise.

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

## 📆 Update Log

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
