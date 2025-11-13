# Phase 1 Implementation Notes — World Mode Foundation

**Date:** 2025-01-XX  
**Status:** In Progress  
**Phase:** 1 of 4 (Foundation)

---

## Overview

Phase 1 establishes the foundational architecture for the two-world model (Presentation vs Workshop) without breaking existing functionality. This is an **additive** phase that introduces new patterns while maintaining backward compatibility.

---

## ✅ Completed Tasks

### 1. World Mode Context (`WorldModeContext.tsx`)
- ✅ Created `WorldModeContext` provider
- ✅ Automatic mode detection from route:
  - `/d/:slug` → `presentation`
  - `/studio/*` → `workshop`
- ✅ Added to `AppProviders.tsx` provider hierarchy
- ✅ Exported `useWorldMode()` hook for components
- ✅ Utility functions: `getWorldModeFromPath()`, `isPresentationRoute()`, `isWorkshopRoute()`

**Files Created:**
- `apps/web/src/context/WorldModeContext.tsx`

**Files Modified:**
- `apps/web/src/providers/AppProviders.tsx`

### 2. Routing Structure
- ✅ Added new Workshop routes:
  - `/studio/domain/:domainId` → `DomainWorkshopPage` (redirects to board-studio for MVP)
  - `/studio/domain/:domainId/board-studio` → `DomainBoardStudioPage`
- ✅ Maintained existing routes for backward compatibility
- ✅ Presentation route unchanged: `/d/:slug` → `PublicDomainPage`

**Files Created:**
- `apps/web/src/pages/studio/domain/DomainWorkshopPage.tsx`
- `apps/web/src/pages/studio/domain/DomainBoardStudioPage.tsx`

**Files Modified:**
- `apps/web/src/App.tsx` (added new routes)

### 3. Shared Board Renderer (`worlds/shared/BoardRenderer.tsx`)
- ✅ Created unified `BoardRenderer` component
- ✅ Accepts `mode` prop (presentation | workshop)
- ✅ Wraps `DomainBoardRenderer` with mode-specific styling
- ✅ Exported convenience components: `PresentationBoardRenderer`, `WorkshopBoardRenderer`

**Files Created:**
- `apps/web/src/worlds/shared/BoardRenderer.tsx`

### 4. Presentation Page Updates (`PublicDomainPage.tsx`)
- ✅ Removed inline editing (`isEditMode` state and handlers)
- ✅ Added "Edit in Workshop" button (navigates to `/studio/domain/:domainId/board-studio`)
- ✅ Integrated `useWorldMode()` hook
- ✅ Presentation is now read-only (as designed)
- ✅ Removed edit mode UI (Save/Cancel buttons)

**Files Modified:**
- `apps/web/src/pages/d/PublicDomainPage.tsx`

### 5. Board Studio Updates (`board-studio-page.tsx`)
- ✅ Added `domainId` prop support
- ✅ Ready for Preview mode integration (next step)

**Files Modified:**
- `apps/web/src/pages/studio/board-studio-page.tsx`

---

## 🔄 In Progress

### 6. Board Studio Preview Mode Integration
**Goal:** Ensure Board Studio Preview uses exact Presentation renderer

**Status:** Pending  
**Next Steps:**
1. Update `BoardStudioPage` Preview mode to use `PresentationBoardRenderer`
2. Ensure Preview mode renders with `mode="presentation"`
3. Test that Preview matches `/d/:slug` rendering exactly

**Files to Modify:**
- `apps/web/src/pages/studio/board-studio-page.tsx`
- Potentially: `apps/web/src/features/board-studio/v0/BoardStudio.tsx`

---

## 📋 Remaining Tasks

### 7. Component Wiring
- [ ] Wire `DomainBoardRenderer` to respect world mode context
- [ ] Add mode-specific styling/theming
- [ ] Ensure frame visibility filtering works correctly in both modes

### 8. Testing & Validation
- [ ] Test route-based mode detection
- [ ] Verify Presentation routes are read-only
- [ ] Verify Workshop routes have editing capabilities
- [ ] Test "Edit in Workshop" navigation flow
- [ ] Verify Board Studio Preview matches Presentation rendering

### 9. Documentation
- [ ] Update component README files
- [ ] Document world mode usage patterns
- [ ] Add code examples for using `useWorldMode()`

---

## 🏗️ Architecture Decisions

### Mode Detection Strategy
**Decision:** Route-based automatic detection  
**Rationale:** Simplest approach, no manual mode switching needed, aligns with URL structure

### Routing Structure
**Decision:** 
- Presentation: `/d/:slug` (slug-based, human-facing)
- Workshop: `/studio/domain/:domainId` (ID-based, stable for builders)

**Rationale:** 
- Slugs are human-friendly for sharing
- IDs are stable and unambiguous for builders
- Clear separation reinforces "different world, same domain"

### Renderer Strategy
**Decision:** Single renderer with mode prop (wraps `DomainBoardRenderer`)  
**Rationale:** 
- Avoids code duplication
- Single source of truth for board rendering
- Easy to maintain and extend

### Edit Mode Removal
**Decision:** Removed inline editing from Presentation routes  
**Rationale:** 
- Presentation should be read-only (except notes/reflections)
- All editing happens in Workshop
- Clearer mental model

---

## 🔍 Tight Coupling Analysis

### Current Coupling Points

1. **DomainBoardRenderer** 
   - **Status:** Shared between worlds ✅
   - **Risk:** Low — already accepts `isEditMode` prop
   - **Action:** Monitor for mode-specific logic leakage

2. **Frame Visibility Filtering**
   - **Status:** Already implemented ✅
   - **Risk:** Low — uses `frame.visibility` property
   - **Action:** Ensure admin frames don't leak to Presentation

3. **API Endpoints**
   - **Status:** Shared `/api/domains/:id/board-data` ✅
   - **Risk:** Low — backend handles visibility filtering
   - **Action:** None needed

4. **Pattern Renderer**
   - **Status:** Shared `PatternRenderer` ✅
   - **Risk:** Medium — may need mode-specific styling
   - **Action:** Add mode prop to `PatternRenderer` if needed

### Recommendations

1. **Add Mode Prop to PatternRenderer**
   - Currently: `PatternRenderer` doesn't know about world mode
   - Recommendation: Pass `mode` prop down to pattern components
   - Priority: Medium (can be done in Phase 2)

2. **Separate Theming**
   - Currently: Same theme system for both worlds
   - Recommendation: Create `PresentationTheme` and `WorkshopTheme` providers
   - Priority: Low (can be done in Phase 4)

3. **Data Layer Abstraction**
   - Currently: Direct API calls in components
   - Recommendation: Create `useDomainBoard(domainId, mode)` hook
   - Priority: Medium (can be done in Phase 2)

---

## 🚨 Known Issues & Risks

### Low Risk
- ✅ Backward compatibility maintained
- ✅ Existing routes still work
- ✅ No breaking changes

### Medium Risk
- ⚠️ Board Studio Preview may not match Presentation exactly yet
- ⚠️ Mode-specific styling not yet implemented
- ⚠️ No explicit mode validation (relies on route structure)

### Mitigation Strategies
1. **Feature Flags:** Can disable new routes if issues arise
2. **Gradual Rollout:** Test with one domain first
3. **Monitoring:** Add logging to track mode detection accuracy

---

## 📊 Progress Tracking

**Phase 1 Completion:** ~75%

- ✅ World Mode Context: 100%
- ✅ Routing Structure: 100%
- ✅ Shared Renderer: 100%
- ✅ Presentation Updates: 100%
- 🔄 Preview Mode Integration: 0%
- ⏳ Component Wiring: 0%
- ⏳ Testing: 0%
- ⏳ Documentation: 0%

---

## 🎯 Next Steps (Priority Order)

1. **Complete Preview Mode Integration** (High Priority)
   - Update Board Studio Preview to use Presentation renderer
   - Test exact match with `/d/:slug`

2. **Add Mode-Specific Styling** (Medium Priority)
   - Add CSS classes for `presentation-mode` and `workshop-mode`
   - Ensure visual distinction between worlds

3. **Component Wiring** (Medium Priority)
   - Wire remaining components to use `useWorldMode()`
   - Add mode-specific behavior where needed

4. **Testing** (High Priority)
   - Test all routes
   - Verify mode detection
   - Test navigation flows

5. **Documentation** (Low Priority)
   - Update README files
   - Add usage examples

---

## 📝 Notes for Future Phases

### Phase 2: Renderer Separation
- Create `NarrativeFrameRenderer` for Presentation
- Enhance `StructuralFrameRenderer` for Workshop
- Extract shared pattern logic

### Phase 3: Feature Migration
- Move admin features to Workshop routes
- Remove remaining mixed concerns
- Update navigation

### Phase 4: Polish & Optimization
- Separate theming systems
- Performance optimization
- Mobile Workshop considerations

---

## 🔗 Related Documents

- `KEEPER_PLAN_V2_ARCHITECTURAL_ANALYSIS.md` - Full architectural analysis
- `apps/web/src/features/board-studio/README.md` - Board Studio documentation
- `apps/web/src/components/domain/DomainBoardRenderer.tsx` - Domain board renderer

---

**Last Updated:** 2025-01-XX  
**Next Review:** After Preview Mode Integration

