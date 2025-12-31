# Phase 1 Route Validation Checklist

**Date:** 2025-01-XX  
**Status:** Ready for Testing

---

## Route Testing Checklist

### ✅ Presentation Routes (Should be Presentation Mode)

#### `/d/:slug` - Public Domain Page
- [ ] Navigate to `/d/test-domain`
- [ ] Verify `useWorldMode()` returns `mode: 'presentation'`
- [ ] Verify page has `presentation-mode` class
- [ ] Verify "Edit in Workshop" button appears (if authenticated admin)
- [ ] Verify no edit controls are visible
- [ ] Verify board renders with warm, narrative styling
- [ ] Click "Edit in Workshop" → Should navigate to `/studio/domain/:domainId/board-studio`

**Expected Behavior:**
- Read-only rendering
- Warm color palette (green tones)
- No editing chrome
- "Edit in Workshop" button for admins

---

### ✅ Workshop Routes (Should be Workshop Mode)

#### `/studio/domain/:domainId` - Domain Workshop Entry
- [ ] Navigate to `/studio/domain/{domainId}`
- [ ] Verify `useWorldMode()` returns `mode: 'workshop'`
- [ ] Verify redirects to `/studio/domain/:domainId/board-studio`
- [ ] Verify page has `workshop-mode` class

**Expected Behavior:**
- Redirects to Board Studio
- Workshop mode detected

#### `/studio/domain/:domainId/board-studio` - Domain Board Studio
- [ ] Navigate to `/studio/domain/{domainId}/board-studio`
- [ ] Verify `useWorldMode()` returns `mode: 'workshop'`
- [ ] Verify page has `workshop-mode` class
- [ ] Verify Board Studio UI is visible (Studio/Preview/Assist modes)
- [ ] Click "Preview" mode → Should show exact Presentation renderer
- [ ] Verify Preview uses `PresentationBoardRenderer` when `domainId` is provided
- [ ] Verify board renders with crisp, tool-like styling

**Expected Behavior:**
- Full editing capabilities
- Crisp color palette (blue tones)
- Studio/Preview/Assist mode toggle
- Preview mode shows exact Presentation rendering

#### `/studio/board-studio` - General Board Studio
- [ ] Navigate to `/studio/board-studio`
- [ ] Verify `useWorldMode()` returns `mode: 'workshop'`
- [ ] Verify Board Studio works without domainId
- [ ] Verify Preview mode falls back to PatternRenderer (for non-domain boards)

**Expected Behavior:**
- Works without domainId
- Preview mode uses PatternRenderer for non-domain boards

---

## Mode Detection Validation

### Test Mode Detection Function
```typescript
import { getWorldModeFromPath, isPresentationRoute, isWorkshopRoute } from './context/WorldModeContext';

// Test cases
getWorldModeFromPath('/d/test-domain') // Should return 'presentation'
getWorldModeFromPath('/studio/domain/123') // Should return 'workshop'
getWorldModeFromPath('/studio/board-studio') // Should return 'workshop'
isPresentationRoute('/d/test-domain') // Should return true
isWorkshopRoute('/studio/domain/123') // Should return true
```

---

## Component Integration Validation

### PublicDomainPage (`/d/:slug`)
- [ ] Uses `useWorldMode()` hook
- [ ] Has `presentation-mode` class on root element
- [ ] Removed all edit mode state/handlers
- [ ] "Edit in Workshop" button navigates correctly
- [ ] `DomainBoardRenderer` receives `isEditMode={false}`

### DomainBoardStudioPage (`/studio/domain/:domainId/board-studio`)
- [ ] Uses `useWorldMode()` hook
- [ ] Passes `domainId` to `BoardStudioPage`
- [ ] Has `workshop-mode` class

### BoardStudioPage (Preview Mode)
- [ ] When `domainId` is provided and Preview mode is active:
  - [ ] Uses `PresentationBoardRenderer` component
  - [ ] Renders exact Presentation view
  - [ ] No editing chrome visible
- [ ] When `domainId` is not provided:
  - [ ] Falls back to `PatternRenderer`
  - [ ] Shows frame preview

---

## Styling Validation

### Presentation Mode Styling
- [ ] Warm color palette (green tones)
- [ ] Softer shadows
- [ ] More generous spacing
- [ ] Warmer typography
- [ ] Smooth transitions

### Workshop Mode Styling
- [ ] Crisp color palette (blue tones)
- [ ] Sharper shadows
- [ ] Tighter spacing
- [ ] Technical typography
- [ ] Snappy transitions

---

## Navigation Flow Validation

### Flow 1: Presentation → Workshop
1. Navigate to `/d/test-domain`
2. Click "Edit in Workshop" (as admin)
3. Should navigate to `/studio/domain/{domainId}/board-studio`
4. Should be in Workshop mode
5. Should show Board Studio UI

### Flow 2: Workshop → Presentation Preview
1. Navigate to `/studio/domain/{domainId}/board-studio`
2. Click "Preview" mode toggle
3. Should show exact Presentation rendering
4. Should match `/d/:slug` appearance

### Flow 3: Workshop → Presentation (Direct)
1. Navigate to `/studio/domain/{domainId}/board-studio`
2. Get domain slug from domain data
3. Navigate to `/d/{slug}`
4. Should show Presentation view

---

## Edge Cases

### Edge Case 1: No Domain ID
- [ ] Board Studio without domainId should still work
- [ ] Preview mode should use PatternRenderer fallback

### Edge Case 2: Invalid Domain ID
- [ ] Should handle error gracefully
- [ ] Should show appropriate error message

### Edge Case 3: Unauthenticated Access
- [ ] `/d/:slug` should work without auth
- [ ] `/studio/domain/:domainId` should require auth
- [ ] "Edit in Workshop" should only show for admins

### Edge Case 4: Route Mismatch
- [ ] If route doesn't match expected pattern, should default to workshop
- [ ] Should log warning if mode detection seems incorrect

---

## Performance Validation

- [ ] Mode detection is fast (no noticeable delay)
- [ ] CSS classes apply immediately
- [ ] No layout shift when switching modes
- [ ] Preview mode loads Presentation renderer quickly

---

## Browser Compatibility

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Accessibility Validation

- [ ] Mode classes don't break screen readers
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation works in both modes
- [ ] Focus indicators are visible

---

## Console Validation

### Expected Console Logs
- [ ] `[WorldModeContext] Mode detected: presentation` for `/d/:slug`
- [ ] `[WorldModeContext] Mode detected: workshop` for `/studio/*`
- [ ] `[PublicDomainPage] Rendering with state: { isPresentation: true }`
- [ ] `[DomainBoardStudioPage] Route should always be Workshop mode`

### No Unexpected Errors
- [ ] No React warnings about missing keys
- [ ] No console errors about undefined props
- [ ] No CSS warnings about unknown classes

---

## Manual Testing Script

```bash
# 1. Start dev server
npm run dev

# 2. Test Presentation route
# Navigate to: http://localhost:5173/d/test-domain
# Expected: Presentation mode, read-only, warm styling

# 3. Test Workshop route
# Navigate to: http://localhost:5173/studio/domain/{domainId}/board-studio
# Expected: Workshop mode, editing UI, crisp styling

# 4. Test Preview mode
# In Board Studio, click "Preview" button
# Expected: Exact Presentation rendering

# 5. Test Navigation
# From Presentation, click "Edit in Workshop"
# Expected: Navigate to Workshop route
```

---

## Automated Test Ideas (Future)

```typescript
// Example test structure
describe('World Mode Detection', () => {
  it('detects presentation mode for /d/:slug routes', () => {
    // Test implementation
  });
  
  it('detects workshop mode for /studio/* routes', () => {
    // Test implementation
  });
});

describe('Board Studio Preview', () => {
  it('uses PresentationBoardRenderer when domainId is provided', () => {
    // Test implementation
  });
});
```

---

## Sign-off Checklist

- [ ] All Presentation routes tested
- [ ] All Workshop routes tested
- [ ] Mode detection validated
- [ ] Styling validated
- [ ] Navigation flows tested
- [ ] Edge cases handled
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Accessibility validated

---

**Tested By:** _______________  
**Date:** _______________  
**Status:** ⏳ Pending / ✅ Passed / ❌ Failed

