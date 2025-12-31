# Keeper Plan v2 — Architectural Analysis & Recommendations

**Date:** 2025-01-XX  
**Status:** Architectural Review — Pre-Implementation  
**Author:** Cursor AI (Collaborative Analysis)

---

## Executive Summary

The two-world model (Presentation & Workshop) is **architecturally sound** and aligns well with existing patterns in the codebase. The current implementation already has partial separation (`isEditMode`, Studio/Preview modes), but needs clearer boundaries and routing structure.

**Key Finding:** The foundation exists; we need to **formalize and extend** the separation rather than rebuild.

---

## 1. Technical & UX Analysis

### ✅ Strengths of the Proposed Model

1. **Clear Mental Model**
   - Users intuitively understand "viewing" vs "building"
   - Matches real-world metaphors (porch vs workshop)
   - Reduces cognitive load by separating concerns

2. **Aligns with Existing Patterns**
   - `DomainBoardRenderer` already has `isEditMode` prop
   - `BoardStudio` already has Studio/Preview mode separation
   - `PublicDomainPage` already handles presentation layer
   - Pattern system (`PatternRenderer`) supports mode-based rendering

3. **Scalability**
   - Easy to add new presentation features without touching workshop
   - Workshop can evolve independently
   - Clear extension points for future features

### ⚠️ Challenges & Risks

1. **Data Synchronization**
   - **Risk:** Changes in Workshop must reflect in Presentation immediately
   - **Mitigation:** Use shared data layer with reactive updates (already partially implemented)

2. **Context Switching**
   - **Risk:** Users may get lost moving between worlds
   - **Mitigation:** Clear navigation affordances, breadcrumbs, "View as Published" links

3. **Permission Boundaries**
   - **Risk:** Presentation mode might accidentally expose admin controls
   - **Mitigation:** Strict visibility filtering (already implemented via `frame.visibility`)

4. **URL Structure Confusion**
   - **Risk:** `/d/:slug` vs `/studio/domain/:id` might confuse users
   - **Mitigation:** Consistent naming, clear documentation

5. **Edit Mode Leakage**
   - **Current Issue:** `PublicDomainPage` has inline editing that feels "workshop-y"
   - **Solution:** Move all editing to Workshop routes

### 🎯 Opportunities

1. **Performance Optimization**
   - Presentation can be optimized for read-only (no edit overhead)
   - Workshop can lazy-load heavy editing tools

2. **Theming Separation**
   - Presentation themes can be completely separate from Workshop UI
   - Allows for brand customization without affecting builder experience

3. **Analytics Separation**
   - Presentation analytics (engagement, views)
   - Workshop analytics (build time, feature usage)

---

## 2. Recommended Structure

### Routing Architecture

```
PRESENTATION WORLD (Public/Shared)
├── /d/:slug                          → Domain public view (Presentation)
├── /d/:slug/moments                  → Moments feed (Presentation)
├── /d/:slug/journey/:journeyId      → Journey progression (Presentation)
└── /d/:slug/connect                  → Social feed (Presentation)

WORKSHOP WORLD (Authenticated Builders)
├── /studio                           → Workshop dashboard
├── /studio/domain/:domainId          → Domain Workshop (admin + board studio)
│   ├── /studio/domain/:domainId/board-studio  → Board Studio (frame editing)
│   ├── /studio/domain/:domainId/settings      → Domain settings (integrations, keys)
│   └── /studio/domain/:domainId/members       → Member management
├── /studio/journey/:journeyId        → Journey Workshop
└── /studio/keeper/:keeperId          → Keeper Workshop
```

### File Organization

```
apps/web/src/
├── worlds/
│   ├── presentation/                 # Presentation world components
│   │   ├── domain/
│   │   │   ├── DomainPresentation.tsx      # Main presentation renderer
│   │   │   ├── DomainHome.tsx             # Domain home page
│   │   │   ├── MomentsFeed.tsx            # Moments feed
│   │   │   └── JourneyViewer.tsx           # Journey progression
│   │   ├── renderers/
│   │   │   ├── NarrativeFrameRenderer.tsx  # Narrative-style frame rendering
│   │   │   └── PresentationTheme.tsx       # Presentation theming
│   │   └── hooks/
│   │       └── usePresentationMode.ts      # Presentation-specific hooks
│   │
│   └── workshop/                      # Workshop world components
│       ├── domain/
│       │   ├── DomainWorkshop.tsx          # Main workshop container
│       │   ├── BoardStudio.tsx            # Board Studio (existing, moved)
│       │   ├── DomainSettings.tsx         # Settings panel
│       │   └── MemberManagement.tsx       # Member management
│       ├── renderers/
│       │   ├── StructuralFrameRenderer.tsx # Structural/editing frame rendering
│       │   └── WorkshopTheme.tsx           # Workshop theming
│       └── hooks/
│           └── useWorkshopMode.ts         # Workshop-specific hooks
│
├── shared/                            # Shared between worlds
│   ├── data/                          # Data layer (boards, frames, props)
│   ├── types/                         # Shared TypeScript types
│   └── utils/                         # Shared utilities
│
└── components/                        # Legacy components (gradually migrate)
```

### Mode Handling Strategy

**Recommended Approach: Context-Based Mode Provider**

```typescript
// worlds/shared/WorldModeContext.tsx
type WorldMode = 'presentation' | 'workshop';

interface WorldModeContextValue {
  mode: WorldMode;
  isPresentation: boolean;
  isWorkshop: boolean;
  // Mode-specific utilities
  renderFrame: (frame: Frame) => ReactNode;
  getTheme: () => Theme;
}

// Usage in components:
const { mode, renderFrame } = useWorldMode();
// Automatically uses correct renderer based on route
```

**Why This Approach:**
- Single source of truth for mode
- Components automatically adapt to context
- Easy to test (mock context)
- Type-safe mode checking

---

## 3. Board Studio Clean Separation

### Current State Analysis

**✅ Already Workshop-Aligned:**
- Located at `/studio/board-studio`
- Has Studio/Preview modes (Preview = presentation preview)
- Uses structural rendering (frame config panels, prop editors)

**⚠️ Needs Clarification:**
- Preview mode in Board Studio should be **preview of presentation**, not a separate thing
- Should clearly indicate "This is how it will look in Presentation"

### Recommended Changes

1. **Rename Board Studio Preview**
   - Current: "Preview Mode"
   - Proposed: "Presentation Preview" or "View as Published"
   - Makes it clear this is previewing the Presentation world

2. **Remove Inline Editing from Presentation Routes**
   - Current: `PublicDomainPage` has `isEditMode` toggle
   - Proposed: Remove edit mode from `/d/:slug`
   - Add "Edit in Workshop" button that navigates to `/studio/domain/:id/board-studio`

3. **Workshop-Only Editing**
   - All frame editing happens in `/studio/domain/:id/board-studio`
   - Presentation routes are read-only (except notes/reflections as specified)

### Implementation Pattern

```typescript
// worlds/presentation/domain/DomainPresentation.tsx
export function DomainPresentation({ domainSlug }: Props) {
  const { mode } = useWorldMode(); // Always 'presentation' on this route
  
  return (
    <PresentationTheme>
      <DomainBoardRenderer 
        mode="presentation"  // Explicit mode
        domainSlug={domainSlug}
        // NO editMode prop - presentation is always read-only
      />
    </PresentationTheme>
  );
}

// worlds/workshop/domain/BoardStudio.tsx
export function BoardStudio({ domainId }: Props) {
  const { mode } = useWorldMode(); // Always 'workshop' on this route
  
  return (
    <WorkshopTheme>
      <BoardStudioContent 
        mode="workshop"
        domainId={domainId}
        // Full editing capabilities
      />
    </WorkshopTheme>
  );
}
```

---

## 4. Domain Admin vs Domain Storytelling Separation

### What Belongs Where

#### ✅ Presentation (`/d/:slug`)
- Domain manifesto/values
- People showcase
- Activity feed
- Moments gallery
- Journey progression
- Public assets/media
- Social connections
- Reflection journals (viewing)
- **Notes/reflections** (limited editing - as specified)

#### ✅ Workshop (`/studio/domain/:domainId`)
- Board Studio (frame arrangement)
- Frame configuration
- Prop configuration
- Domain settings (name, description, theme)
- Integrations & API keys
- Agent assignment
- Member management
- DNS/custom domain config
- Publishing controls
- Data schemas
- Template management

### Current Mixed Concerns

**DomainBoardPage (`/studio/domain-board`):**
- Currently mixes: domain card (presentation) + setup steps (workshop) + members (workshop)
- **Solution:** Split into:
  - Presentation: Domain card → move to `/d/:slug` as hero frame
  - Workshop: Setup steps → `/studio/domain/:id/settings`
  - Workshop: Members → `/studio/domain/:id/members`

**PublicDomainPage (`/d/:slug`):**
- Currently has inline editing (`isEditMode`)
- **Solution:** Remove editing, add "Edit in Workshop" button

### Migration Strategy

1. **Phase 1: Route Separation**
   - Create `/studio/domain/:domainId` routes
   - Move admin functions from DomainBoardPage
   - Keep presentation at `/d/:slug`

2. **Phase 2: Component Extraction**
   - Extract presentation components to `worlds/presentation/`
   - Extract workshop components to `worlds/workshop/`
   - Create shared data layer

3. **Phase 3: Renderer Separation**
   - Create `NarrativeFrameRenderer` for presentation
   - Keep `StructuralFrameRenderer` for workshop
   - Share pattern logic via `PatternRenderer` adapter

---

## 5. Incremental Implementation Plan

### Phase 1: Foundation (Week 1-2)
**Goal:** Establish routing and basic structure without breaking existing functionality

1. **Create World Mode Context**
   - Add `WorldModeContext` provider
   - Determine mode from route (presentation vs workshop)
   - Add to App providers

2. **Route Reorganization**
   - Add new routes alongside existing ones
   - Use feature flags to toggle between old/new routes
   - Keep existing routes working

3. **Component Extraction**
   - Extract `DomainPresentation` component
   - Extract `DomainWorkshop` component
   - Both use existing `DomainBoardRenderer` initially

**Risk:** Low — additive changes, no breaking changes

### Phase 2: Renderer Separation (Week 3-4)
**Goal:** Create separate renderers while maintaining shared data layer

1. **Create Narrative Renderer**
   - Build `NarrativeFrameRenderer` for presentation
   - Focus on emotional, visual, narrative presentation
   - Remove all editing chrome

2. **Refine Structural Renderer**
   - Enhance `StructuralFrameRenderer` for workshop
   - Ensure all editing tools are present
   - Add clear "preview presentation" mode

3. **Shared Pattern Logic**
   - Extract pattern rendering to shared `PatternRenderer`
   - Both renderers use same pattern logic
   - Different styling/theming per world

**Risk:** Medium — requires careful testing of frame rendering

### Phase 3: Feature Migration (Week 5-6)
**Goal:** Move features to correct world

1. **Move Admin Features**
   - Domain settings → `/studio/domain/:id/settings`
   - Member management → `/studio/domain/:id/members`
   - Integrations → `/studio/domain/:id/integrations`

2. **Remove Editing from Presentation**
   - Remove `isEditMode` from `PublicDomainPage`
   - Add "Edit in Workshop" button
   - Ensure all editing redirects to workshop

3. **Update Navigation**
   - Add clear navigation between worlds
   - Update breadcrumbs
   - Add "View as Published" link in workshop

**Risk:** Medium — requires user testing for navigation clarity

### Phase 4: Polish & Optimization (Week 7-8)
**Goal:** Refine UX and performance

1. **Theming Separation**
   - Presentation themes (warm, nostalgic)
   - Workshop themes (modern, crisp)
   - Ensure no theme leakage

2. **Performance Optimization**
   - Lazy-load workshop tools
   - Optimize presentation for read-only
   - Add loading states

3. **Documentation**
   - Update README files
   - Add architecture docs
   - User-facing documentation

**Risk:** Low — polish phase

### Rollback Strategy

Each phase should be:
- **Feature-flagged** (can toggle old/new behavior)
- **Backward-compatible** (old routes still work)
- **Incrementally deployable** (can deploy phase-by-phase)

If issues arise:
1. Disable feature flag → revert to old behavior
2. Fix issues in isolation
3. Re-enable when stable

---

## 6. Technical Considerations

### Shared Data Layer

**Current:** `DomainBoardRenderer` fetches from `/api/domains/:id/board-data`

**Proposed:** Keep shared API, add mode-specific filtering

```typescript
// shared/data/useDomainBoard.ts
export function useDomainBoard(domainId: string, mode: WorldMode) {
  const data = useQuery(['domain-board', domainId], () => 
    fetchDomainBoard(domainId)
  );
  
  // Filter frames based on mode
  const filteredFrames = useMemo(() => {
    if (mode === 'presentation') {
      return data.frames.filter(f => f.visibility === 'public');
    }
    return data.frames; // Workshop shows all
  }, [data.frames, mode]);
  
  return { ...data, frames: filteredFrames };
}
```

### Frame Rendering Strategy

**Option A: Single Renderer with Mode Prop** (Recommended)
- `FrameRenderer` accepts `mode` prop
- Internally uses `PatternRenderer` with mode-specific styling
- Simpler to maintain, single source of truth

**Option B: Separate Renderers**
- `NarrativeFrameRenderer` for presentation
- `StructuralFrameRenderer` for workshop
- More separation, but potential duplication

**Recommendation:** Option A with clear mode boundaries

### State Management

**Current:** React Context (`BoardContext`, `FrameContext`)

**Proposed:** 
- Keep existing contexts for data
- Add `WorldModeContext` for mode
- Presentation: Read-only contexts
- Workshop: Full CRUD contexts

### Type Safety

```typescript
// shared/types/world.ts
export type PresentationFrame = Frame & {
  mode: 'presentation';
  // Presentation-specific fields
};

export type WorkshopFrame = Frame & {
  mode: 'workshop';
  // Workshop-specific fields (editing state, etc.)
};

export type FrameByMode<T extends WorldMode> = 
  T extends 'presentation' ? PresentationFrame : WorkshopFrame;
```

---

## 7. Missing Considerations & Recommendations

### 1. **URL Slug Resolution**
- **Issue:** Presentation uses `/d/:slug`, Workshop uses `/studio/domain/:id`
- **Solution:** Add slug→ID resolution service, or use slugs in both

### 2. **Deep Linking**
- **Issue:** Workshop edits should be linkable
- **Solution:** Use query params: `/studio/domain/:id/board-studio?frame=frame-123`

### 3. **Publishing Workflow**
- **Issue:** How do changes in Workshop become live in Presentation?
- **Solution:** 
  - Auto-publish (immediate)
  - Draft/Publish workflow (recommended)
  - Scheduled publishing (future)

### 4. **Collaboration**
- **Issue:** Multiple users editing same domain
- **Solution:** Use existing conflict resolution (already implemented in Board Studio)

### 5. **Mobile Experience**
- **Issue:** Workshop might be desktop-only
- **Solution:** 
  - Presentation: Mobile-optimized
  - Workshop: Desktop-first, mobile view-only

### 6. **Analytics Separation**
- **Issue:** Need different analytics per world
- **Solution:** 
  - Presentation: Engagement metrics
  - Workshop: Build metrics, feature usage

### 7. **Accessibility**
- **Issue:** Both worlds need a11y compliance
- **Solution:** 
  - Presentation: Screen reader optimized, keyboard navigation
  - Workshop: Full keyboard shortcuts, ARIA labels

---

## 8. Proposed Next Steps

### Immediate Actions (This Week)

1. **Create World Mode Context**
   - Implement `WorldModeContext`
   - Add route-based mode detection
   - Test with existing routes

2. **Document Current State**
   - Map all current routes to worlds
   - Identify mixed concerns
   - Create migration checklist

3. **Stakeholder Review**
   - Review this analysis with team
   - Confirm routing structure
   - Prioritize phases

### Short-Term (Next 2 Weeks)

1. **Phase 1 Implementation**
   - Create world structure
   - Add new routes (feature-flagged)
   - Extract presentation/workshop components

2. **User Testing**
   - Test navigation between worlds
   - Validate mental model
   - Gather feedback

### Medium-Term (Next Month)

1. **Complete Phase 2-3**
   - Renderer separation
   - Feature migration
   - Remove old mixed routes

2. **Performance Optimization**
   - Lazy loading
   - Code splitting
   - Bundle size optimization

---

## 9. Questions for Discussion

1. **Publishing Model**
   - Should Workshop changes auto-publish to Presentation?
   - Or should there be explicit "Publish" action?

2. **Preview in Workshop**
   - Should Board Studio preview show exact Presentation rendering?
   - Or is "structural preview" sufficient?

3. **Domain Slug vs ID**
   - Should Workshop routes use slugs (`/studio/domain/:slug`) or IDs?
   - Pros/cons of each approach?

4. **Mobile Workshop**
   - Is Workshop mobile-optimized a requirement?
   - Or desktop-only acceptable?

5. **Cross-World Navigation**
   - How prominent should "View as Published" be in Workshop?
   - Should there be persistent toggle?

---

## 10. Conclusion

The two-world model is **architecturally sound** and aligns with existing codebase patterns. The main work is:

1. **Formalizing** the separation (routing, file structure)
2. **Extending** existing patterns (mode-based rendering)
3. **Migrating** mixed concerns (admin vs presentation)

**Risk Level:** Low-Medium (incremental, backward-compatible)

**Timeline:** 6-8 weeks for full implementation

**Recommendation:** Proceed with Phase 1 immediately, gather feedback, iterate.

---

**End of Analysis**

