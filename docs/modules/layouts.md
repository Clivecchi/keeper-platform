# Layouts

## 📌 Purpose
Layout components that provide consistent page shells and navigation structures across the Keeper Platform.

## 🧱 Key Files
- `AppLayout.tsx` - Main authenticated app layout with sidebar and navbar
- `PublicLayout.tsx` - Public-facing pages layout
- `BoardPublicLayout.tsx` - Full viewport board layout (no shell UI)
- `KeeperDashboardLayout.tsx` - V0-aligned dashboard layout for logged-in experience

## 🔄 Data & Behavior

### KeeperDashboardLayout
- **V0 Design Language**: Implements the canonical visual system from V0 screenshots
- **Left Navigation**: Persistent sidebar with Feed, Kip, Keepers, Journeys, Profile
- **Color Scheme**: Terracotta (#C96E59) for active states, soft cream background (#FAF9F6)
- **Typography**: Large section headings, comfortable spacing
- **Cards**: Rounded corners, soft shadows, white background
- **Used For**: 
  - `/d/:domainSlug` (when authenticated)
  - `/d/:domainSlug/admin`
  - `/d/:domainSlug/agent`

### AppLayout
- **Authenticated Routes**: Wraps all protected routes
- **Sidebar Integration**: Uses ViewMode-aware Sidebar component
- **Navbar**: Top navigation bar with user identity

### BoardPublicLayout
- **Full Viewport**: No shell UI, frame-driven experience
- **Used For**: Public domain boards, login page

## ⚠️ Notes & ToDo
- [ ] Add responsive breakpoints for mobile navigation
- [ ] Implement Create button dropdown functionality
- [ ] Add navigation state persistence

## 📆 Update Log

### 2026-01-15 - Diagnostics entrypoint in domain shell
- Added a Diagnostics nav item that routes to `/d/:slug?frame=diagnostics`.
- Removed the legacy global debug modal from `AppLayout` to keep diagnostics frame-first.

### 2025-12-10 - KeeperDashboardLayout nav safety
- Updated sidebar links to prefer `/d/:slug/...` routes and fall back to existing routes (`/root`, `/kip`, `/keeper`, `/root/profile`) to avoid broken navigation when slug is absent.

### 2025-01-21 - V0 Dashboard Layout Implementation
- Added `KeeperDashboardLayout.tsx` with V0-aligned design
- Terracotta color scheme (#C96E59)
- Left navigation sidebar with Feed, Kip, Keepers, Journeys, Profile
- Soft cream background (#FAF9F6)
- Rounded cards with soft shadows
- Large typography with comfortable spacing

### 2026-01-02 - PublicLayout spacing + V0 moment placement
- Set public container padding to 7px for compact spacing.
- Allow `/v0?frame=moment` to render outside the container while keeping the container as a sibling for layout consistency.