# Domain Pages

## 📌 Purpose
Pages for domain viewing, administration, and agent interaction. Supports both public (unauthenticated) and authenticated experiences.

## 🧱 Key Files
- `PublicDomainPage.tsx` - Public domain landing page (hybrid access)
- `DomainAdminPage.tsx` - Domain administration interface
- `DomainAgentPage.tsx` - Agent workspace interface

## 🔄 Data & Behavior

### PublicDomainPage
- **Route**: `/d/:slug`
- **Hybrid Access**: Works for both authenticated and unauthenticated visitors
- **Public View**: Frame-driven, no shell UI (when logged out)
- **Authenticated View**: Renders inside V0 KeeperDashboardLayout (when logged in)
- **Domain Loading**: Loads domain by slug, fetches user permissions if authenticated
- **Edit Access**: Shows "Edit in Workshop" button for domain admins

### DomainAdminPage
- **Route**: `/d/:slug/admin`
- **Layout**: V0 KeeperDashboardLayout
- **Features**: 
  - API Keys management
  - Membership management
  - Domain settings
  - Agent configuration
- **Cards**: V0-style admin function cards

### DomainAgentPage
- **Route**: `/d/:slug/agent`
- **Layout**: V0 KeeperDashboardLayout
- **Style**: Matches V0 Kip chat page design
- **Features**: Agent workspace with chat interface (placeholder)

## ⚠️ Notes & ToDo
- [ ] Implement API Keys management functionality
- [ ] Implement Membership management functionality
- [ ] Implement Domain settings functionality
- [ ] Implement Agent configuration functionality
- [ ] Complete Agent workspace chat interface
- [ ] Add domain slug validation

## 📆 Update Log

### 2025-01-21 - V0 Dashboard Integration
- Updated `PublicDomainPage.tsx` to conditionally use V0 layout when authenticated
- Created `DomainAdminPage.tsx` with V0-aligned admin interface
- Created `DomainAgentPage.tsx` with V0-aligned agent workspace
- Added routes for `/d/:slug/admin` and `/d/:slug/agent`
- Removed top pill navigation bar
- Integrated V0 dashboard shell for all logged-in domain views

