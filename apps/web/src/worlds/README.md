# Worlds - Presentation & Workshop Renderers

## 📌 Purpose

This directory contains the separated renderers for the two-world model:
- **Presentation** (`presentation/`): Warm, narrative, emotional rendering (Porch)
- **Workshop** (`workshop/`): Crisp, structural, tool-like rendering (Studio)
- **Shared** (`shared/`): Common utilities and patterns used by both worlds

## 🧱 Key Files

### Presentation World
- `presentation/NarrativeFrameRenderer.tsx` - Narrative frame renderer for Presentation mode
- `presentation/NarrativeFrameContainer.tsx` - Container component with Presentation styling

### Workshop World
- `workshop/StructuralFrameRenderer.tsx` - Structural frame renderer for Workshop mode
- `workshop/StructuralFrameContainer.tsx` - Container component with Workshop styling

### Shared Utilities
- `shared/patternUtils.ts` - Shared pattern rendering utilities
- `shared/BoardRenderer.tsx` - Unified board renderer wrapper
- `shared/world-mode.css` - Mode-specific CSS styling

## 🔄 Data & Behavior

### Renderer Selection

The `DomainBoardRenderer` automatically selects the appropriate renderer based on world mode:

```typescript
const { mode: worldMode } = useWorldMode();
const isPresentation = worldMode === 'presentation';

{isPresentation ? (
  <NarrativeFrameRenderer />
) : (
  <StructuralFrameRenderer />
)}
```

### Pattern Utilities

Shared utilities in `patternUtils.ts` provide:
- Pattern-specific styling configuration
- Prop sorting and filtering
- Pathway configuration extraction
- Frame type detection

### Styling

Mode-specific styling is applied via CSS classes:
- `.presentation-mode` - Warm, narrative styling
- `.workshop-mode` - Crisp, tool-like styling
- `.presentation-frame` - Individual frame styling for Presentation
- `.workshop-frame` - Individual frame styling for Workshop

## ⚠️ Notes & ToDo

### Completed
- [x] Created NarrativeFrameRenderer for Presentation mode
- [x] Created StructuralFrameRenderer for Workshop mode
- [x] Extracted shared pattern utilities
- [x] Updated DomainBoardRenderer to use appropriate renderer
- [x] Added mode-specific CSS styling

### Future Enhancements
- [ ] Add more pattern-specific styling variations
- [ ] Implement pattern-specific animations
- [ ] Add accessibility enhancements
- [ ] Performance optimizations (memoization)

## 📆 Update Log

### 2025-01-XX - Phase 2: Renderer Separation
**Changed:**
- Created NarrativeFrameRenderer for Presentation mode
- Created StructuralFrameRenderer for Workshop mode
- Extracted shared pattern utilities to patternUtils.ts
- Updated DomainBoardRenderer to use mode-appropriate renderer
- Added mode-specific CSS styling

**Files Added:**
- `presentation/NarrativeFrameRenderer.tsx`
- `workshop/StructuralFrameRenderer.tsx`
- `shared/patternUtils.ts`

**Files Modified:**
- `components/domain/DomainBoardRenderer.tsx`
- `shared/world-mode.css`

**Why:**
Separating renderers allows for distinct styling and behavior between Presentation (warm, narrative) and Workshop (crisp, structural) modes while sharing common pattern logic.

**Impact:**
- Clear visual distinction between worlds
- Easier to maintain and extend each renderer independently
- Shared utilities reduce code duplication
- Better separation of concerns

