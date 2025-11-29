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

### 2025-01-21 - Domain Dashboard Separation from Studio
- Separated domain dashboard routes from Studio/AppLayout
- Created DomainFeedPage, DomainKeepersPage, DomainJourneysPage, DomainProfilePage
- Updated PublicDomainPage to redirect logged-in users to Feed
- Added `/d/:slug/board` route for "View Domain Board" functionality
- Fixed KeeperDashboardLayout: made logo clickable, fixed nav paths
- Added "View Domain Board" link in dashboard header
