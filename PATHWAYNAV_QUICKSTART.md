# PathwayNav — Quick Start Guide

## 🚀 Getting Started

### 1. Run the Seed Script
To add the PathwayNav frame to the Domain Board template:

```bash
cd C:\Users\Chucks-Domain\Documents\GitHub\keeper-platform
pnpm --filter @keeper/database prisma:seed
```

### 2. Start the Dev Server
```bash
pnpm dev
```

### 3. View the PathwayNav Component

**On a Public Domain Board:**
- Navigate to any public domain route (e.g., `/d/your-domain`)
- Look for vertical path markers on the **right edge** of the screen
- Should see two markers:
  - **Sign In** (dark variant)
  - **Get Started** (amber/accent variant)

**When Authenticated (Owner):**
- Log in as the domain owner
- Navigate to the domain board
- Should see one marker:
  - **Edit Domain** (dark variant)

---

## 🎨 Usage Examples

### Example 1: Basic Edge Layout (Default)

```tsx
<PathwayNav
  layout="edge"
  orientation="vertical"
  position="right"
  paths={[
    { label: 'Sign In', href: '/login', variant: 'dark' },
    { label: 'Get Started', href: '/signup', variant: 'accent' }
  ]}
/>
```

### Example 2: Inline Layout

```tsx
<PathwayNav
  layout="inline"
  paths={[
    { label: 'About', href: '/about', variant: 'light' },
    { label: 'Contact', href: '/contact', variant: 'dark' },
    { label: 'Get Started', href: '/signup', variant: 'accent' }
  ]}
/>
```

### Example 3: Auth-Aware Navigation

```tsx
<PathwayNav
  layout="edge"
  position="right"
  visibleFor={['public', 'authed']}
  ownerOnlyAuthedPaths={true}
  paths={[
    { 
      label: 'Sign In', 
      href: '/login', 
      description: 'Continue your journey',
      analyticsId: 'path.signin'
    }
  ]}
  authedPaths={[
    { 
      label: 'Dashboard', 
      href: '/dashboard', 
      description: 'View your dashboard',
      analyticsId: 'path.dashboard'
    }
  ]}
/>
```

### Example 4: Theme Variants

```tsx
// System theme (default)
<PathwayNav themeVariant="system" {...props} />

// Lowcountry Summer (blue gradient)
<PathwayNav themeVariant="lowcountry-summer" {...props} />

// Juke Joint (indigo/purple)
<PathwayNav themeVariant="juke-joint" {...props} />
```

---

## 🧪 Quick Visual Test

Open your browser console and run:

```javascript
// Check if PathwayNav is rendered
document.querySelector('nav[aria-label="Paths"]');

// Check number of path markers
document.querySelectorAll('nav[aria-label="Paths"] a').length;

// Check auth state
localStorage.getItem('keeper_token'); // Should be null when not authed
```

---

## 🎯 Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `layout` | `"edge" \| "inline"` | `"edge"` | Layout mode |
| `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | Text orientation |
| `position` | `"right" \| "left" \| "top" \| "bottom"` | `"right"` | Edge position |
| `themeVariant` | `"system" \| "lowcountry-summer" \| "juke-joint"` | `"system"` | Theme |
| `paths` | `PathwayItem[]` | `[]` | Public paths |
| `authedPaths` | `PathwayItem[]` | `[]` | Authenticated paths |
| `visibleFor` | `Array<"public" \| "authed" \| "owner">` | `["public","authed"]` | Visibility rules |
| `ownerOnlyAuthedPaths` | `boolean` | `false` | Show authed paths only to owners |

### PathwayItem Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | ✅ | Display text |
| `href` | `string` | ✅ | Link destination |
| `description` | `string` | ❌ | ARIA label (fallback to label) |
| `icon` | `string` | ❌ | Lucide icon name (not yet implemented) |
| `variant` | `"system" \| "accent" \| "dark" \| "light"` | ❌ | Visual style |
| `analyticsId` | `string` | ❌ | Tracking ID |

---

## 🐛 Troubleshooting

### PathwayNav not visible
1. Check if the frame is seeded: Look in database for frame with `pattern: 'PathwayNav'`
2. Check visibility: Ensure `visibility: 'public'` in frame data
3. Check auth state: If `ownerOnlyAuthedPaths: true`, authed paths only show to owners
4. Check console for errors: Open browser DevTools

### Styling issues
1. Ensure Tailwind CSS is working: Check if other components have styles
2. Check z-index conflicts: PathwayNav uses `z-40`
3. Check positioning: Ensure no CSS overrides on fixed positioning

### Auth not working
1. Check AuthContext: `useAuth()` should return `isAuthenticated` and `user`
2. Check login flow: Ensure user can log in successfully
3. Check owner logic: Currently `isOwner` is a placeholder (always false)

---

## 📚 Related Files

- **Component:** `apps/web/src/components/patterns/PathwayNav.tsx`
- **Types:** `apps/web/src/components/patterns/types.ts`
- **Renderer:** `apps/web/src/features/board-studio/patterns/PatternRenderer.tsx`
- **Registry:** `apps/web/src/patterns/registry.tsx`
- **Seed:** `packages/database/prisma/seeds/design-boards.seed.ts`
- **Docs:** `apps/web/src/components/patterns/README.md`

---

## 🎓 Best Practices

1. **Use descriptive labels** — Keep path labels short (1-3 words)
2. **Provide descriptions** — Always add `description` for better accessibility
3. **Choose appropriate variants:**
   - `accent` for primary CTAs (Get Started, Sign Up)
   - `dark` for secondary actions (Sign In, Settings)
   - `light` for subtle options
4. **Limit path count** — Keep to 2-4 paths for edge layout (avoid clutter)
5. **Use analytics IDs** — Track user interactions with meaningful IDs

---

## ✅ Verification Checklist

Before considering the implementation complete, verify:

- [ ] PathwayNav renders on public domain board
- [ ] Vertical text displays correctly
- [ ] Hover animations work smoothly
- [ ] Focus states visible (try Tab key)
- [ ] Links navigate to correct routes
- [ ] Auth switching works (public → authed paths)
- [ ] Theme variants render correctly
- [ ] No console errors
- [ ] Responsive on mobile (≥360px)
- [ ] Accessible (screen reader, keyboard nav)

---

**Need help?** Check `PATHWAYNAV_IMPLEMENTATION_COMPLETE.md` for full implementation details.


