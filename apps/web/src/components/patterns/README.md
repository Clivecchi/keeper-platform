# Pattern Components

## 📌 Purpose
Reusable pattern components that render specific frame types on Domain Boards and other Keeper boards. Each pattern component represents a distinct engagement mode or visual design pattern.

## 🧱 Key Files
- `index.ts` - Central export point for all pattern components
- `types.ts` - Shared TypeScript type definitions for pattern props
- `ManifestoCard.tsx` - Branded manifesto card component for domain principles
- `PathwayNav.tsx` - Auth-aware navigation frame with edge/inline layouts

## 🔄 Data & Behavior

### ManifestoCard
Renders branded manifesto content (e.g., "The Clean Surface Doctrine") as a beautiful card with:
- Theme-based gradient backgrounds
- Serif display for title, sans for body
- Responsive padding
- Optional CTA button
- Fade-in animation

**Props:** `ManifestoProps` (title, kicker, quote, content, cta, themeVariant)

### PathwayNav
Auth-aware navigation frame that renders different paths based on user authentication state:
- **Edge layout:** Vertical tabs peeking from page edge (bookmark-ish ribbons)
- **Inline layout:** Horizontal pill buttons
- **Auth awareness:** Shows public paths when not authenticated, authed paths when authenticated
- **Owner gating:** Optional owner-only path display
- **Theme variants:** system, lowcountry-summer, juke-joint
- **Accessibility:** WCAG AA contrast, ARIA labels, keyboard navigation

**Props:** `PathwayNavProps` (layout, orientation, position, themeVariant, paths, authedPaths, visibleFor, ownerOnlyAuthedPaths)

**Auth Integration:** Uses `useAuth()` from `AuthContext.tsx` to determine user state

### Type System
All pattern components use strongly-typed props defined in `types.ts`:
- `ManifestoProps` - Manifesto card configuration
- `PathwayNavProps` - Navigation configuration
- `PathwayItem` - Individual navigation item

## ⚠️ Notes & ToDo
- [ ] PathwayNav needs proper owner check (currently placeholder)
- [ ] Consider adding analytics event dispatch for PathwayNav clicks
- [ ] Studio support for editing PathwayNav props in Board Studio
- [ ] Add more pattern components as needed (e.g., HeroCard, FeatureGrid)
- [ ] Consider extracting common theme variant logic into shared utility

## 📆 Update Log

### 2025-11-06 - Initial Implementation
- Created `types.ts` with `ManifestoProps`, `PathwayNavProps`, and `PathwayItem` types
- Created `PathwayNav.tsx` with auth-aware navigation (edge and inline layouts)
- Created `index.ts` as central export point
- Registered patterns in `PatternRenderer.tsx` and `registry.tsx`
- Added PathwayNav frame to Domain Board seed template
- All files pass linting with no errors


