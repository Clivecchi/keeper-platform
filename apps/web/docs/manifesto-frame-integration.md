# ManifestoFrame Integration - The Clean Surface Doctrine

## 📌 Overview

This document describes the integration of "The Clean Surface Doctrine" manifesto into the Keeper Domain Board as a living, public-facing design creed.

The manifesto exists as a **Frame** with a **manifesto-type prop** so it's part of the persisted board structure, inherits theming, and is easy to maintain.

## ✅ Frontend Implementation Complete

### Components Created

#### 1. ManifestoCard Component
**File:** `apps/web/src/components/patterns/ManifestoCard.tsx`

**Purpose:** Renders manifesto content as a beautiful, branded card on the Domain Board.

**Interface:**
```typescript
export interface ManifestoProps {
  title: string;            // "The Clean Surface Doctrine"
  kicker?: string;          // "Keeper Design Manifesto"
  quote: string;            // Short headline quote
  content?: string;         // Expanded description
  cta?: { label: string; href: string };
  themeVariant?: "system" | "lowcountry-summer" | "juke-joint";
}
```

**Design Features:**
- ✅ Warm gradient background (stone-50 to amber-50)
- ✅ Serif display for title, sans for body
- ✅ Responsive padding (min 2rem)
- ✅ Soft shadow and rounded-2xl corners
- ✅ Fade-in animation (0.4s ease-in)
- ✅ Three theme variants available

#### 2. PropRenderer Integration
**File:** `apps/web/src/components/domain/PropRenderer.tsx`

**Changes:**
- Added `manifesto` prop type handler
- Imports `ManifestoCard` component
- Maps config/value data to `ManifestoProps`

**Usage:**
```typescript
case 'manifesto':
  return <ManifestoProp config={config} value={value} />;
```

#### 3. Clean Surface Doctrine Page
**File:** `apps/web/src/pages/manifestos/CleanSurfaceDoctrinePage.tsx`

**Features:**
- ✅ Full manifesto content with all seven laws
- ✅ Clean, distraction-free reading experience
- ✅ Consistent gradient background
- ✅ Back navigation to home
- ✅ Responsive typography (prose styles)
- ✅ Mobile-optimized layout

**Route:** `/manifestos/clean-surface-doctrine`

#### 4. Routing
**File:** `apps/web/src/App.tsx`

**Changes:**
- Added route for manifesto page under `BoardPublicLayout`
- Clean layout (no shell UI) for distraction-free reading

#### 5. Animation Styles
**File:** `apps/web/src/index.css`

**Added:**
```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-in;
}
```

## 🗄️ Backend Implementation Required

### Database Seeding

**File:** `packages/database/prisma/seeds/design-boards.seed.ts` (or equivalent)

**Objective:** Add the ManifestoFrame to the Domain Board template

### Frame Structure

Insert this frame after the cover frame (order: 2):

```typescript
{
  id: "clean-surface-frame",
  name: "The Clean Surface Doctrine",
  pattern: "focus",  // Use "focus" pattern for full-width, prominent display
  order: 2,          // Directly beneath the cover
  visibility: "public",  // Visible to all visitors
  props: [
    {
      id: "clean-surface-manifesto-prop",
      type: "manifesto",  // NEW prop type
      orderIndex: 0,
      config: {
        title: "The Clean Surface Doctrine",
        kicker: "Keeper Design Manifesto",
        quote: "If the surface isn't calm, the depth can't be seen.",
        content: "Keeper exists to preserve what's worthy of effort. Every screen, panel, and interaction must serve that mission. When the interface feels like administration instead of creation, we lose the spirit of what we're building. The Clean Surface Doctrine keeps us honest — to ensure everything we design reflects calm, clarity, and creative dignity.\n\nClarity is sacred. Every surface should feel worth keeping. Build only what serves creation. Emotionally clean equals functionally clear. Kip should feel present, not panels. Preserve creative dignity. These are our design laws.\n\nTo build worth keeping, we must first design worth keeping — surfaces that honor the soul of creation, not the noise of control.",
        cta: {
          label: "Read Full Doctrine",
          href: "/manifestos/clean-surface-doctrine"
        },
        themeVariant: "system"
      }
    }
  ]
}
```

### Complete Seeding Example

```typescript
// In design-boards.seed.ts or equivalent

async function seedDomainBoardTemplate() {
  const domainBoard = await prisma.board.create({
    data: {
      name: "Domain Board",
      slug: "domain-board",
      description: "Default board template for domain pages",
      frames: {
        create: [
          {
            id: "cover-frame",
            name: "Cover",
            pattern: "focus",
            order: 1,
            visibility: "public",
            props: {
              create: [
                // Cover props...
              ]
            }
          },
          {
            id: "clean-surface-frame",
            name: "The Clean Surface Doctrine",
            pattern: "focus",
            order: 2,
            visibility: "public",
            props: {
              create: [
                {
                  id: "clean-surface-manifesto-prop",
                  type: "manifesto",
                  orderIndex: 0,
                  config: {
                    title: "The Clean Surface Doctrine",
                    kicker: "Keeper Design Manifesto",
                    quote: "If the surface isn't calm, the depth can't be seen.",
                    content: "Keeper exists to preserve what's worthy of effort. Every screen, panel, and interaction must serve that mission. When the interface feels like administration instead of creation, we lose the spirit of what we're building. The Clean Surface Doctrine keeps us honest — to ensure everything we design reflects calm, clarity, and creative dignity.\n\nClarity is sacred. Every surface should feel worth keeping. Build only what serves creation. Emotionally clean equals functionally clear. Kip should feel present, not panels. Preserve creative dignity. These are our design laws.\n\nTo build worth keeping, we must first design worth keeping — surfaces that honor the soul of creation, not the noise of control.",
                    cta: {
                      label: "Read Full Doctrine",
                      href: "/manifestos/clean-surface-doctrine"
                    },
                    themeVariant: "system"
                  }
                }
              ]
            }
          },
          // Other frames (Activity, People, etc.)...
        ]
      }
    }
  });
  
  return domainBoard;
}
```

### Database Schema Requirements

Ensure your schema supports:

1. **Frame fields:**
   - `id` (string)
   - `name` (string)
   - `pattern` (string) - should accept "focus", "canvas", "gallery", etc.
   - `order` (number) - for sorting
   - `visibility` (enum: "public" | "admin")

2. **Prop fields:**
   - `id` (string)
   - `type` (string) - should accept "manifesto" as a new type
   - `orderIndex` (number)
   - `config` (JSON) - stores the manifesto data

### Migration Notes

If updating existing boards:

```sql
-- Example migration to add manifesto frame to existing domain boards
INSERT INTO frames (id, name, pattern, "order", visibility, board_id)
VALUES (
  'clean-surface-frame',
  'The Clean Surface Doctrine',
  'focus',
  2,
  'public',
  (SELECT id FROM boards WHERE slug = 'domain-board')
);

INSERT INTO props (id, type, "orderIndex", config, frame_id)
VALUES (
  'clean-surface-manifesto-prop',
  'manifesto',
  0,
  '{
    "title": "The Clean Surface Doctrine",
    "kicker": "Keeper Design Manifesto",
    "quote": "If the surface isn''t calm, the depth can''t be seen.",
    "content": "...",
    "cta": {
      "label": "Read Full Doctrine",
      "href": "/manifestos/clean-surface-doctrine"
    },
    "themeVariant": "system"
  }'::jsonb,
  'clean-surface-frame'
);
```

## 🎨 Visual Preview

### Domain Board Display
When rendered on `/d/:slug`, the manifesto appears as:
- Warm gradient card (stone-50 to amber-50)
- Large serif title "The Clean Surface Doctrine"
- Small kicker text "Keeper Design Manifesto"
- Prominent italic quote
- Expanded description (3 paragraphs)
- CTA button linking to full manifesto

### Full Manifesto Page
When clicking "Read Full Doctrine", users navigate to:
- URL: `/manifestos/clean-surface-doctrine`
- Layout: Clean, full-page article
- Content: All seven laws with descriptions
- Navigation: Back to home link
- Footer: Minimal branding

## 🔄 Content Updates

### Current (Phase 1)
Content is hardcoded in seed data. The Design Agent can update by:
1. Modifying the seed file
2. Re-running migrations
3. Or updating directly via admin UI (when available)

### Future (Phase 2)
- Store manifesto content in a `KeeperContent` or `Manifesto` table
- Add `dataSource` field to prop config: `"dataSource": "manifesto:clean-surface-doctrine"`
- Design Agent can hydrate/update from database
- Enable version history and A/B testing

## 🎯 Theme Variants

The manifesto card supports three theme variants:

### System (Default)
```typescript
themeVariant: "system"
// Gradient: stone-50 to amber-50
```

### Lowcountry Summer
```typescript
themeVariant: "lowcountry-summer"
// Gradient: blue-50 to green-50
```

### Juke Joint
```typescript
themeVariant: "juke-joint"
// Gradient: purple-50 to pink-50
```

To change the theme, update the `themeVariant` in the seed data.

## ✅ Testing Checklist

### Frontend Testing (Already Complete)
- ✅ ManifestoCard component renders correctly
- ✅ PropRenderer handles "manifesto" type
- ✅ Full manifesto page accessible
- ✅ Routing works correctly
- ✅ Mobile responsive
- ✅ Animation plays on mount
- ✅ Zero linter errors

### Backend Testing (Required)
- [ ] Seed script creates manifesto frame
- [ ] Frame appears on domain board at order 2
- [ ] Prop config is stored correctly as JSON
- [ ] Frame visibility is "public"
- [ ] Pattern is set to "focus"
- [ ] `/api/domains/:id/board-data` returns manifesto frame
- [ ] Config data structure matches `ManifestoProps` interface

### Integration Testing
- [ ] Visit `/d/default` as anonymous user
- [ ] Manifesto card appears below cover
- [ ] Content renders correctly
- [ ] CTA button links to `/manifestos/clean-surface-doctrine`
- [ ] Full manifesto page loads
- [ ] Back navigation works

## 📊 Frame Order Reference

Typical Domain Board frame order:

1. **Cover** (order: 1) - Hero image/title
2. **The Clean Surface Doctrine** (order: 2) - **NEW MANIFESTO**
3. **Activity** (order: 3) - Recent activity
4. **People** (order: 4) - Team members
5. **Operations** (order: 5, visibility: admin) - Admin tools
6. **API Keys** (order: 6, visibility: admin) - API management

## 🚀 Deployment Steps

### 1. Frontend (Already Deployed)
- ✅ Components created
- ✅ Routing configured
- ✅ Styles added
- ✅ Zero errors

### 2. Backend (Required)
1. Update seed file with manifesto frame
2. Run database migrations/seeds
3. Verify frame appears in board data API
4. Test with frontend

### 3. QA (After Backend Deployment)
1. Test anonymous access to `/d/default`
2. Verify manifesto renders correctly
3. Click CTA → verify full page loads
4. Test mobile responsiveness
5. Verify theme variants (if using different themes)

## 📝 Content Guidelines

When updating manifesto content:

1. **Keep it concise on the card**
   - Title: Short and memorable
   - Quote: One powerful sentence
   - Content: 3-4 paragraphs max

2. **Save details for the full page**
   - All seven laws with descriptions
   - Examples and explanations
   - Call to action

3. **Maintain the tone**
   - Calm, confident, clear
   - No jargon or buzzwords
   - Speaks to creators, not admins

## 🔗 Related Documentation

- **Component Source:** `apps/web/src/components/patterns/ManifestoCard.tsx`
- **Prop Handler:** `apps/web/src/components/domain/PropRenderer.tsx`
- **Full Page:** `apps/web/src/pages/manifestos/CleanSurfaceDoctrinePage.tsx`
- **Routing:** `apps/web/src/App.tsx`
- **Board Renderer:** `apps/web/src/components/domain/DomainBoardRenderer.tsx`

## 📆 Update Log

### 2025-11-06 - Initial Implementation
- Created ManifestoCard component with theme variants
- Integrated "manifesto" prop type into PropRenderer
- Created Clean Surface Doctrine full page
- Added routing for manifesto pages
- Added fade-in animation to global CSS
- Documented seeding requirements for backend team
- All frontend work complete and tested
- Zero linter errors

