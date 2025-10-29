# Board Studio Migration Plan

## Overview

This document provides a step-by-step plan for merging the two Board Studio implementations while maintaining PatternRenderer as the central Design Agent.

**Target:** Unified Board Studio based on v0 architecture with features from old version
**Timeline:** 3-4 weeks
**Risk Level:** Medium (mitigated by incremental approach)

---

## Pre-Migration Checklist

Before starting the migration:

- [x] Design Agent Contract documented
- [x] Unified types created
- [x] Type adapters implemented
- [ ] Backup current production Board Studio
- [ ] Create feature branch: feature/unified-board-studio
- [ ] Set up testing environment
- [ ] Document current feature parity
- [ ] Identify breaking changes
- [ ] Plan user communication

---

## Phase 1: Foundation (Week 1)

### Day 1-2: Setup and Preparation

**Goal:** Establish migration infrastructure

**Tasks:**

1. Create Feature Branch
   ```bash
   git checkout -b feature/unified-board-studio
   ```

2. Document Current State
   - List all features in old Board Studio
   - List all features in v0 Board Studio
   - Create feature parity matrix
   - Document known bugs in both versions

3. Set Up Testing
   - Create test board with all frame types
   - Test current functionality
   - Document baseline performance
   - Set up E2E tests

4. Update Types
   - Import unified-frame.ts into project
   - Import frame-adapters.ts into project
   - Update v0 types to use unified types
   - Run type checker, fix errors

**Deliverables:**
- Feature branch created
- Feature parity matrix documented
- Test board created
- Types updated and passing

---

### Day 3-4: Core Architecture Updates

**Goal:** Fix critical architectural issues

**Tasks:**

1. Fix Mode Contract
   - Standardize to: 'studio' | 'preview' | 'assist'
   - Update FrameRenderer mode prop
   - Update PatternRenderer mode checks
   - Test mode switching

2. Fix Props Format
   - Ensure props are always arrays
   - Add normalization in PatternRenderer
   - Update API serialization
   - Test prop CRUD operations

3. Remove Role-Based Special Cases
   - Audit PatternRenderer for if (frame.role === ...)
   - Refactor Cover frame special handling
   - Make patterns handle all cases
   - Test Cover frame still works

**Code Changes:**

File: apps/web/src/features/board-studio/patterns/PatternRenderer.tsx
```
// OLD - Role-based special case
if (frame.role === 'cover') {
  // Special cover rendering
}

// NEW - Pattern-based with prop detection
if (frame.pattern === 'focus' && getProp(frame, 'media')) {
  // Focus pattern with media
}
```

**Testing:**
- Create test frames for each pattern
- Verify no role-based rendering
- Verify props work across all patterns
- Verify mode switching works

**Deliverables:**
- Mode contract standardized
- Props format unified
- Role-based cases removed
- All tests passing

---

### Day 5: Props Library Enhancement

**Goal:** Port expanded Props Library from old version

**Tasks:**

1. Extract Props Library Component
   - Create apps/web/src/features/board-studio/v0/components/PropsLibrary.tsx
   - Extract from old Board Studio (lines 2150-2935)
   - Clean up and simplify
   - Add TypeScript types

2. Add Category Collapse/Expand
   - Add state for expanded categories
   - Add toggle functionality
   - Style collapsed/expanded states
   - Preserve user's category preferences

3. Add Drag-and-Drop Support
   - Import DnD library (if needed)
   - Add drag handlers to prop items
   - Add drop zones to frames
   - Visual feedback during drag

4. Integrate with V0 BoardStudio
   - Replace inline Props Library in BoardStudio.tsx
   - Import PropsLibrary component
   - Wire up callbacks
   - Test functionality

**File Structure:**
```
features/board-studio/v0/components/
  ├── PropsLibrary.tsx  (new)
  ├── PropItem.tsx      (new)
  ├── PropCategory.tsx  (new)
  └── FrameRenderer.tsx (existing)
```

**Component API:**
```
<PropsLibrary
  activeFrameId={activeFrameId}
  onAddProp={(frameId, propType, config) => void}
  expandedCategories={state}
  onToggleCategory={(category) => void}
/>
```

**Deliverables:**
- PropsLibrary component extracted
- Category collapse/expand working
- Drag-and-drop functional (optional for Phase 1)
- Integrated with v0 BoardStudio

---

## Phase 2: Frame Management (Week 2)

### Day 6-7: Frame Tabs Enhancement

**Goal:** Add drag-and-drop frame reordering

**Tasks:**

1. Port DraggableTabs Component
   - Copy from old: apps/web/src/components/studio/DraggableTabs.tsx
   - Update imports and types
   - Integrate with v0 context
   - Style to match v0 design

2. Add Frame Reordering Logic
   - Add reorderFrames to BoardStudioContext
   - Implement API call for reordering
   - Update local state optimistically
   - Handle reorder errors

3. Visual Feedback
   - Drag preview
   - Drop zones
   - Ghost frame during drag
   - Success/error animations

**Context Update:**
```
// BoardStudioContext.tsx
const reorderFrames = async (frameIds: string[]) => {
  // Optimistic update
  setFrames(frameIds.map(id => frames.find(f => f.id === id)!));
  
  try {
    await apiFetch(`/api/boards/${boardId}/frames/reorder`, {
      method: 'POST',
      body: JSON.stringify({ frameIds })
    });
  } catch (error) {
    // Rollback
    setFrames(previousFrames);
  }
};
```

**Deliverables:**
- DraggableTabs component integrated
- Frame reordering working
- Visual feedback implemented
- API endpoint tested

---

### Day 8-9: Frame Creation Wizard

**Goal:** Add rich frame type picker

**Tasks:**

1. Port TemplateChooser Component
   - Copy from old version
   - Update to use unified types
   - Add frame type previews
   - Style modern UI

2. Add Frame Templates
   - Define common frame templates
   - Hero section template
   - Gallery template
   - Form template
   - Settings template

3. Create Frame Picker Modal
   - Modal UI component
   - Frame type selection grid
   - Template preview
   - Create button

4. Integrate with Add Frame
   - Open modal on "Add Frame" click
   - Pass selected template to creation
   - Close modal on success
   - Handle cancel

**Template Structure:**
```
const FRAME_TEMPLATES = {
  'hero-section': {
    name: 'Hero Section',
    description: 'Full-width hero with image and CTA',
    pattern: 'focus',
    props: [
      { type: 'image', config: {...} },
      { type: 'heading', config: {...} },
      { type: 'button', config: {...} }
    ]
  },
  // More templates...
};
```

**Deliverables:**
- Frame picker modal working
- Templates defined
- Integration complete
- User testing passed

---

### Day 10: Frame Configuration Panel

**Goal:** Enhance frame configuration UI

**Tasks:**

1. Update FrameConfigPanel
   - Already exists at v0/components/FrameConfigPanel.tsx
   - Enhance with better prop editing
   - Add pattern selector with descriptions
   - Add role badge and info

2. Make Config Panel Toggleable
   - Add toggle button
   - Slide in/out animation
   - Remember user preference
   - Mobile-responsive

3. Add Quick Actions
   - Duplicate frame
   - Delete frame (with confirmation)
   - Move up/down
   - Set as cover

**Deliverables:**
- Enhanced FrameConfigPanel
- Toggle functionality
- Quick actions working
- Tests passing

---

## Phase 3: Rich Features (Week 3)

### Day 11-12: AI Assist Panel

**Goal:** Add AI-powered suggestions

**Tasks:**

1. Port AIAssistPanel Component
   - Copy from old version
   - Update types and imports
   - Integrate with v0 context
   - Style to match v0

2. Add AI Assist Mode
   - Add 'assist' to mode type
   - Create mode switcher UI
   - Update PatternRenderer assist rendering
   - Add suggestion overlays

3. AI Suggestions API
   - Create /api/ai/suggest-frame endpoint
   - Implement suggestion logic
   - Cache suggestions
   - Handle errors gracefully

4. Apply Suggestions Flow
   - Show suggestion previews
   - Accept/reject buttons
   - Apply to frame
   - Track applied suggestions

**API Endpoint:**
```
POST /api/ai/suggest-frame
{
  "boardId": "...",
  "frameId": "...",
  "context": "..."
}

Response:
{
  "suggestions": [
    {
      "type": "prop-add",
      "prop": {...},
      "reason": "..."
    }
  ]
}
```

**Deliverables:**
- AIAssistPanel integrated
- Assist mode working
- Suggestions API live
- User testing complete

---

### Day 13-14: Autosave and Conflict Resolution

**Goal:** Add autosave and handle conflicts

**Tasks:**

1. Port useAutosave Hook
   - Copy from old version
   - Adapt to v0 context
   - Configure autosave interval
   - Add save indicator

2. Implement Autosave
   - Debounce frame updates
   - Save to API automatically
   - Show "Saving..." indicator
   - Show "Saved" confirmation

3. Port ConflictDialog Component
   - Copy from old version
   - Update styling
   - Add diff view
   - Integrate with context

4. Add Conflict Detection
   - Check updatedAt timestamps
   - Detect conflicts on save
   - Show conflict dialog
   - Allow user resolution

**Autosave Hook:**
```
const { saving, saved, error } = useAutosave({
  data: board,
  onSave: async (data) => {
    await apiFetch(`/api/boards/${boardId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  interval: 3000 // 3 seconds
});
```

**Deliverables:**
- Autosave working
- Save indicator visible
- Conflict detection functional
- Conflict resolution UI tested

---

### Day 15: Template System

**Goal:** Add board templates

**Tasks:**

1. Create Template Registry
   - Define board templates
   - Marketing site template
   - Portfolio template
   - Documentation template
   - Blank template

2. Template Chooser on New Board
   - Show template picker
   - Template previews
   - Apply template on selection
   - Create blank board option

3. Export Board as Template
   - Export current board
   - Save as template
   - Share template
   - Import template

**Template Structure:**
```
{
  "id": "marketing-site",
  "name": "Marketing Site",
  "description": "Modern marketing website with hero, features, and CTA",
  "frames": [
    { /* cover frame */ },
    { /* features frame */ },
    { /* cta frame */ }
  ]
}
```

**Deliverables:**
- Template registry created
- Template chooser working
- Export functionality
- Import functionality

---

## Phase 4: Polish & Optimization (Week 4)

### Day 16-17: Keyboard Shortcuts

**Goal:** Add productivity shortcuts

**Tasks:**

1. Define Shortcut System
   - Create shortcuts registry
   - Add keyboard event handlers
   - Show shortcut hints
   - Make configurable

2. Implement Shortcuts
   - Cmd/Ctrl + S: Save
   - Cmd/Ctrl + N: New frame
   - Cmd/Ctrl + D: Duplicate frame
   - Cmd/Ctrl + Z: Undo
   - Cmd/Ctrl + Shift + Z: Redo
   - Cmd/Ctrl + K: Command palette
   - Escape: Close modals
   - Delete: Delete selected frame

3. Add Command Palette
   - Cmd/Ctrl + K to open
   - Fuzzy search actions
   - Recent actions
   - Keyboard navigation

**Shortcuts Registry:**
```
const SHORTCUTS = {
  'save': { key: 'mod+s', action: handleSave },
  'new-frame': { key: 'mod+n', action: handleNewFrame },
  // etc...
};
```

**Deliverables:**
- Keyboard shortcuts working
- Command palette functional
- Shortcut hints visible
- User documentation updated

---

### Day 18-19: Undo/Redo

**Goal:** Add history management

**Tasks:**

1. Implement History Stack
   - Track frame/board changes
   - Store undo states
   - Limit stack size
   - Compress old states

2. Add Undo/Redo Logic
   - Undo action (Cmd+Z)
   - Redo action (Cmd+Shift+Z)
   - Update UI state
   - Sync with API

3. Add History UI
   - Show undo/redo buttons
   - Display what will undo/redo
   - History timeline (optional)
   - Clear history option

**History Manager:**
```
class HistoryManager {
  private stack: State[] = [];
  private index: number = -1;
  
  push(state: State) {
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(state);
    this.index++;
  }
  
  undo(): State | null {
    if (this.index > 0) {
      this.index--;
      return this.stack[this.index];
    }
    return null;
  }
  
  redo(): State | null {
    if (this.index < this.stack.length - 1) {
      this.index++;
      return this.stack[this.index];
    }
    return null;
  }
}
```

**Deliverables:**
- Undo/redo working
- History stack managed
- UI indicators present
- Keyboard shortcuts work

---

### Day 20: Performance Optimization

**Goal:** Optimize rendering and state management

**Tasks:**

1. Add React Performance Tools
   - React.memo for components
   - useMemo for expensive computations
   - useCallback for event handlers
   - Lazy loading for heavy components

2. Optimize Frame Rendering
   - Virtualize frame list (if many frames)
   - Lazy load pattern components
   - Debounce prop updates
   - Optimize re-renders

3. Add Performance Monitoring
   - Track render times
   - Monitor bundle size
   - Profile slow operations
   - Add performance budgets

4. Optimize Bundle Size
   - Code splitting
   - Tree shaking
   - Remove unused code
   - Optimize images

**Performance Targets:**
- Time to interactive: < 3s
- First contentful paint: < 1.5s
- Frame render: < 16ms (60fps)
- Bundle size: < 500KB (gzipped)

**Deliverables:**
- Performance optimizations applied
- Monitoring in place
- Bundle size reduced
- Tests confirm improvements

---

### Day 21: Testing and Bug Fixes

**Goal:** Comprehensive testing and bug fixes

**Tasks:**

1. Unit Tests
   - Test all new components
   - Test context functions
   - Test type adapters
   - Test utilities

2. Integration Tests
   - Test frame CRUD flow
   - Test mode switching
   - Test autosave
   - Test undo/redo

3. E2E Tests
   - Create board
   - Add frames
   - Edit frames
   - Save and reload
   - Delete frames

4. Bug Bash
   - Manual testing
   - Edge case testing
   - Error handling
   - User acceptance testing

**Test Coverage Goals:**
- Unit tests: > 80%
- Integration tests: > 60%
- E2E tests: Critical paths covered
- No critical bugs

**Deliverables:**
- All tests passing
- Test coverage meets goals
- Known bugs fixed
- QA sign-off

---

## Final Week: Migration and Cleanup

### Day 22-23: Route Migration

**Goal:** Switch routes to use new Board Studio

**Tasks:**

1. Update App Routes
   ```
   // OLD
   <Route path="/studio" element={<BoardStudioPage />} />
   
   // NEW
   <Route path="/studio" element={<UnifiedBoardStudio />} />
   ```

2. Add Migration Notice
   - Show notice to existing users
   - Explain changes
   - Provide feedback link
   - Offer help resources

3. Parallel Deployment
   - Keep old version at /studio/legacy
   - New version at /studio
   - Allow fallback if needed
   - Track usage metrics

**Deliverables:**
- Routes updated
- Migration notice shown
- Both versions accessible
- Metrics tracking enabled

---

### Day 24-25: Documentation and Training

**Goal:** Document new Board Studio

**Tasks:**

1. Update Documentation
   - User guide
   - Developer guide
   - API documentation
   - Troubleshooting guide

2. Create Migration Guide
   - What's changed
   - What's new
   - How to use new features
   - FAQ

3. Record Videos
   - Overview video
   - Feature walkthroughs
   - Developer tutorial
   - Troubleshooting tips

4. Team Training
   - Demo new features
   - Answer questions
   - Collect feedback
   - Address concerns

**Deliverables:**
- Documentation complete
- Migration guide published
- Videos recorded
- Team trained

---

### Day 26-28: Monitoring and Cleanup

**Goal:** Monitor adoption and clean up old code

**Tasks:**

1. Monitor Metrics
   - Usage analytics
   - Error rates
   - Performance metrics
   - User feedback

2. Address Issues
   - Fix reported bugs
   - Improve performance
   - Enhance UX
   - Add missing features

3. Remove Old Version
   - Delete apps/web/src/pages/studio/board-studio-page.tsx
   - Remove old dependencies
   - Clean up unused code
   - Update references

4. Celebrate
   - Ship announcement
   - Thank contributors
   - Gather feedback
   - Plan next iteration

**Cleanup Checklist:**
- [ ] Old Board Studio file deleted
- [ ] Old dependencies removed
- [ ] Dead code eliminated
- [ ] Tests updated
- [ ] Documentation references updated
- [ ] Feature flag removed (if used)

**Deliverables:**
- Old code removed
- Clean codebase
- Stable production system
- Team celebration

---

## Risk Management

### High Risk Areas

**1. Data Migration**
- Risk: Existing boards may break
- Mitigation: Type adapters handle old format
- Rollback: Keep old version accessible

**2. Performance Regression**
- Risk: New version slower than old
- Mitigation: Performance testing and optimization
- Rollback: Revert to old version

**3. Feature Loss**
- Risk: Users miss old features
- Mitigation: Feature parity matrix ensures coverage
- Rollback: Keep old version available

**4. User Confusion**
- Risk: Changes confuse existing users
- Mitigation: Migration notice and documentation
- Rollback: Provide fallback option

### Mitigation Strategies

1. **Incremental Rollout**
   - Beta users first
   - Gradual rollout
   - Monitor closely
   - Quick rollback if needed

2. **Feature Flags**
   - Control feature availability
   - A/B testing
   - Gradual enablement
   - Easy disable

3. **Monitoring**
   - Error tracking
   - Performance monitoring
   - User feedback
   - Usage analytics

4. **Communication**
   - Pre-launch notice
   - Launch announcement
   - Regular updates
   - Quick response to issues

---

## Success Criteria

The migration is successful when:

- [ ] All features from old version ported
- [ ] All tests passing
- [ ] Performance meets targets
- [ ] Zero critical bugs
- [ ] User feedback positive
- [ ] Adoption > 80% in 2 weeks
- [ ] Old version can be deleted
- [ ] Team confident in new version
- [ ] Documentation complete
- [ ] PatternRenderer contract upheld

---

## Rollback Plan

If major issues arise:

1. **Immediate:**
   - Revert route to old version
   - Announce rollback
   - Document issues

2. **Investigation:**
   - Identify root cause
   - Assess impact
   - Plan fix

3. **Resolution:**
   - Fix issues
   - Test thoroughly
   - Re-deploy
   - Monitor closely

**Rollback Command:**
```bash
git revert <merge-commit>
git push origin main
```

---

## Post-Migration

After successful migration:

1. **Monitor for 2 weeks**
   - Track metrics
   - Respond to feedback
   - Fix emerging bugs
   - Optimize as needed

2. **Gather Feedback**
   - User surveys
   - Team retrospective
   - Analytics review
   - Improvement ideas

3. **Plan Next Iteration**
   - Based on feedback
   - New feature requests
   - Performance improvements
   - UX enhancements

4. **Archive Old Version**
   - Tag release
   - Archive code
   - Update documentation
   - Remove from main branch

---

## Conclusion

This migration plan provides a structured, low-risk approach to unifying Board Studio while maintaining PatternRenderer as the Design Agent. By following this plan incrementally, testing thoroughly, and communicating clearly, we can deliver a superior Board Studio experience that serves as a foundation for AI builders and future innovation.

**Remember:** The goal is not just to merge code, but to establish the Design Agent Contract as the architectural foundation for all frame rendering in Keeper. This contract will enable AI builders, ensure consistency, and maintain long-term maintainability.

**Key Principle:** PatternRenderer is the center of gravity. Protect it at all costs.

---

Last Updated: 2025-10-28
Version: 1.0
Status: Active

