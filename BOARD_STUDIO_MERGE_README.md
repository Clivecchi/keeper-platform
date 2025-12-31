# Board Studio Merge - Quick Reference

## What We're Doing

Merging two Board Studio implementations into one unified system with PatternRenderer as the Design Agent.

## Key Documents

1. **DESIGN_AGENT_CONTRACT.md** - The specification for how frames MUST be rendered
2. **BOARD_STUDIO_MIGRATION_PLAN.md** - Step-by-step 4-week migration plan
3. **apps/web/src/features/board-studio/types/unified-frame.ts** - Single source of truth for types
4. **apps/web/src/features/board-studio/types/frame-adapters.ts** - Convert between formats

## Current State

**Two Implementations:**
- **/pages/studio/board-studio-page.tsx** (2,935 lines) - Currently active, feature-rich, complex
- **/features/board-studio/v0/BoardStudio.tsx** (530 lines) - Clean architecture, PatternRenderer-first

**Key Difference:**
- Old version: Direct PatternRenderer calls
- New version: FrameRenderer → PatternRenderer (architectural protection)

## The Contract

**All frame rendering MUST flow through:**
```
BoardStudio → FrameRenderer → PatternRenderer (Design Agent)
```

**Three Rules:**
1. No bypass rendering
2. Pattern + Props = Presentation
3. Mode controls editing vs viewing

## Migration Strategy

**Recommended Approach:** Start from v0, port features

**Why?**
- Clean architecture with FrameRenderer abstraction
- PatternRenderer centrality is baked in
- Maintainable (< 1500 lines when complete)
- Protects Design Agent contract

**Timeline:** 3-4 weeks in 4 phases

## What's Been Created

### Types (Ready to Use)

**apps/web/src/features/board-studio/types/unified-frame.ts**
- UnifiedFrame - Canonical frame type
- UnifiedBoard - Canonical board type
- All prop types (HeadingProp, ImageProp, etc.)
- Type guards and helpers
- Full TypeScript definitions

**apps/web/src/features/board-studio/types/frame-adapters.ts**
- fromStudioFrame / toStudioFrame
- fromFrameInstance / toFrameInstanceCreate
- toPatternRendererFrame / fromPatternRendererFrame
- normalizeProps - Handle array/object formats
- createDefaultCoverFrame - Generate default frames
- validateFrame / validateBoard - Validation helpers

### Documentation (Ready to Share)

**DESIGN_AGENT_CONTRACT.md**
- Complete specification
- Input interface
- Pattern descriptions
- Prop system explained
- Mode behavior defined
- Implementation guide
- AI builder examples
- Testing checklist

**BOARD_STUDIO_MIGRATION_PLAN.md**
- 4-week detailed plan
- Day-by-day tasks
- Code examples
- Risk management
- Success criteria
- Rollback plan

## Quick Start Guide

### For Developers Starting Migration

1. **Read the Contract**
   ```bash
   open DESIGN_AGENT_CONTRACT.md
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/unified-board-studio
   ```

3. **Import Types**
   ```typescript
   import type { UnifiedFrame, UnifiedBoard } from '@/features/board-studio/types/unified-frame';
   import { fromStudioFrame, toPatternRendererFrame } from '@/features/board-studio/types/frame-adapters';
   ```

4. **Follow Migration Plan**
   - Start with Phase 1, Day 1
   - Complete tasks in order
   - Check off deliverables
   - Test thoroughly

### For AI Builders

1. **Read the Contract**
   - Section: "For AI Builder Agents"
   - Pattern selection guide
   - Prop composition examples
   - Output format specification

2. **Generate Frames**
   ```json
   {
     "id": "generated-123",
     "name": "Hero Section",
     "role": "custom",
     "pattern": "focus",
     "frameType": "media_card",
     "props": [
       { "id": "hero-image", "type": "image", "config": {...} },
       { "id": "headline", "type": "heading", "config": {...} },
       { "id": "cta", "type": "button", "config": {...} }
     ]
   }
   ```

3. **Test Output**
   - Validate with validateFrame()
   - Convert with toPatternRendererFrame()
   - Render through FrameRenderer

### For Code Reviewers

**Check These:**
- [ ] All frame rendering goes through PatternRenderer
- [ ] No if (frame.role === ...) bypasses
- [ ] Props are arrays, not objects
- [ ] Mode correctly controls UI
- [ ] Types use UnifiedFrame
- [ ] Adapters used for conversions

**Red Flags:**
- ❌ Direct frame rendering based on role
- ❌ Switch statements on frame properties
- ❌ Hardcoded special cases
- ❌ Props accessed as objects

## Architecture Before and After

### Before (Current State)

```
Old Board Studio (2,935 lines)
  ↓
Multiple contexts + local state
  ↓
Direct PatternRenderer call
  ↓
No abstraction layer
  ↓
Risk of bypasses
```

### After (Target State)

```
Unified Board Studio (< 1,500 lines)
  ↓
BoardStudioContext (single source)
  ↓
FrameRenderer (abstraction)
  ↓
PatternRenderer (Design Agent)
  ↓
Protected contract
```

## Critical Files

**Source Files:**
- apps/web/src/features/board-studio/v0/BoardStudio.tsx (base)
- apps/web/src/features/board-studio/v0/components/FrameRenderer.tsx (abstraction)
- apps/web/src/features/board-studio/patterns/PatternRenderer.tsx (design agent)
- apps/web/src/pages/studio/board-studio-page.tsx (to be merged from)

**Type Files:**
- apps/web/src/features/board-studio/types/unified-frame.ts (canonical types)
- apps/web/src/features/board-studio/types/frame-adapters.ts (conversions)
- apps/web/src/features/board-studio/v0/types.ts (v0 types - to be replaced)

**Documentation:**
- DESIGN_AGENT_CONTRACT.md (the specification)
- BOARD_STUDIO_MIGRATION_PLAN.md (the plan)
- BOARD_STUDIO_MERGE_README.md (this file)

## Key Architectural Decisions

### 1. PatternRenderer as Design Agent

**Decision:** PatternRenderer is the authoritative presentation layer
**Rationale:** Single point of control, AI-compatible, maintainable
**Impact:** All rendering must go through this contract

### 2. FrameRenderer Abstraction Layer

**Decision:** Add FrameRenderer between BoardStudio and PatternRenderer
**Rationale:** Protects contract, handles chrome, manages modes
**Impact:** Changes require updates to FrameRenderer, not PatternRenderer

### 3. Props as Arrays

**Decision:** Props are always arrays, never objects
**Rationale:** Consistent, ordered, composable, AI-friendly
**Impact:** All prop access uses array methods, adapters handle conversions

### 4. Pattern-Based Rendering

**Decision:** Rendering based on pattern, not role
**Rationale:** Flexible, composable, no special cases
**Impact:** Role is metadata, pattern determines presentation

### 5. Three Modes

**Decision:** studio | preview | assist (not edit, layout, etc.)
**Rationale:** Clear purpose, simple, covers all use cases
**Impact:** PatternRenderer checks single mode prop

## Common Tasks

### Add a New Prop Type

1. Define in unified-frame.ts:
   ```typescript
   export interface MyNewProp extends BaseProp {
     type: 'my-new-prop';
     config: {
       // prop-specific config
     };
   }
   ```

2. Add to union:
   ```typescript
   export type FrameProp = ... | MyNewProp;
   ```

3. Implement rendering in PatternRenderer

### Add a New Pattern

1. Define in unified-frame.ts:
   ```typescript
   export type FramePattern = ... | 'my-new-pattern';
   ```

2. Create pattern component in PatternRenderer:
   ```typescript
   const MyNewPattern: React.FC<PatternProps> = ({ frame, mode }) => {
     // Implementation
   };
   ```

3. Add to PatternRenderer switch:
   ```typescript
   case 'my-new-pattern':
     return <MyNewPattern frame={frame} mode={mode} />;
   ```

### Convert Frame Formats

```typescript
// From database to unified
const unified = fromFrameInstance(dbFrame);

// From unified to PatternRenderer
const pattern = toPatternRendererFrame(unified);

// From v0 Studio to unified
const unified = fromStudioFrame(studioFrame);
```

### Validate a Frame

```typescript
import { validateFrame } from '@/features/board-studio/types/frame-adapters';

const validation = validateFrame(frame);
if (!validation.valid) {
  console.error('Frame invalid:', validation.errors);
}
```

## Success Metrics

Migration is successful when:
- ✅ All features from old version ported
- ✅ All tests passing (> 80% coverage)
- ✅ Performance meets targets (< 3s TTI)
- ✅ Zero critical bugs
- ✅ User adoption > 80% in 2 weeks
- ✅ Old version deleted
- ✅ Design Agent Contract upheld

## Getting Help

**Questions about:**
- Contract: Read DESIGN_AGENT_CONTRACT.md
- Migration: Read BOARD_STUDIO_MIGRATION_PLAN.md
- Types: Check unified-frame.ts
- Conversions: Check frame-adapters.ts

**Report issues:**
- Contract violations: File bug with "Design Agent" label
- Migration blockers: Tag with "migration" label
- Type errors: Reference unified-frame.ts line numbers

## Next Steps

1. **Review Documents**
   - Read DESIGN_AGENT_CONTRACT.md completely
   - Skim BOARD_STUDIO_MIGRATION_PLAN.md
   - Understand unified-frame.ts types

2. **Prepare Environment**
   - Create feature branch
   - Set up test board
   - Run current tests
   - Document baseline

3. **Start Phase 1**
   - Follow Day 1-2 tasks
   - Update types
   - Fix mode contract
   - Test thoroughly

4. **Iterate**
   - Complete one phase at a time
   - Test after each phase
   - Gather feedback
   - Adjust as needed

## Important Reminders

**Do:**
- ✅ Always use UnifiedFrame types
- ✅ Render through FrameRenderer → PatternRenderer
- ✅ Use pattern-based logic
- ✅ Keep props as arrays
- ✅ Test mode switching
- ✅ Validate frames
- ✅ Use type adapters

**Don't:**
- ❌ Bypass PatternRenderer
- ❌ Use role-based rendering
- ❌ Access props as objects
- ❌ Mix edit/preview UI
- ❌ Hardcode special cases
- ❌ Skip validation
- ❌ Guess prop formats

## The Bottom Line

**PatternRenderer is the Design Agent.**

Everything else supports it. Protect this contract, and you get:
- Consistent rendering
- AI compatibility
- Maintainable code
- Predictable behavior
- Future-proof architecture

Break this contract, and you get:
- Rendering chaos
- AI failures
- Technical debt
- Maintenance nightmares
- Architectural drift

**The choice is clear. Follow the contract.**

---

Last Updated: 2025-10-28
Version: 1.0
Status: Ready for Migration

