# Board Studio Refactor: Studio/Preview Mode System

**Date:** October 27, 2025  
**Status:** ✅ Complete

## Overview

Successfully refactored Board Studio from a 3-mode system (Edit, Layout, Preview) to a unified 2-mode system (Studio, Preview). This change eliminates visual inconsistencies and provides a better authoring experience.

## Key Changes

### 1. Mode System Simplification

**Before:** 3 modes (Edit, Layout, Preview) with inconsistent rendering  
**After:** 2 modes (Studio, Preview) with unified rendering

- **Studio Mode:** Full authoring experience with frame selection, props library, and configuration panel
- **Preview Mode:** Read-only view showing the final user experience without editing chrome

### 2. New Architecture Components

#### BoardStudioContext (`context/BoardStudioContext.tsx`)
Central state management for the entire Board Studio experience:

```typescript
export type BoardStudioMode = 'studio' | 'preview'

interface BoardStudioContextValue {
  // Mode state
  mode: BoardStudioMode
  setMode: (mode: BoardStudioMode) => void

  // Board & frame state
  board: StudioBoard | null
  frames: StudioFrame[]
  activeFrameId: string | null
  setActiveFrame: (frameId: string | null) => void

  // CRUD operations
  addFrame: () => Promise<void>
  updateFrame: (frameId: string, updates: Partial<StudioFrame>) => Promise<void>
  removeFrame: (frameId: string) => Promise<void>
  addPropToFrame: (frameId: string, propType: string, propConfig?: Record<string, any>) => Promise<void>
  
  // Board operations
  loadBoard: (boardId: string) => Promise<void>
  saveBoard: () => Promise<void>
}
```

**Key Features:**
- Centralized state management via React Context
- Optimistic updates for all mutations
- Automatic persistence to backend via existing API routes
- Error handling with rollback on failure

#### FrameRenderer (`components/FrameRenderer.tsx`)
Unified frame rendering component that works in both modes:

```typescript
interface FrameRendererProps {
  frame: StudioFrame
  mode: BoardStudioMode
  isActive: boolean
  onSelect: () => void
  boardName?: string
  boardDescription?: string
  // ... other props
}
```

**Behavior:**
- **Studio Mode:** Renders frame with selection outline, active indicator, and click-to-select
- **Preview Mode:** Renders frame content only, no editing chrome
- Uses existing `PatternRenderer` under the hood for actual content rendering
- Ensures visual consistency across modes

#### FrameConfigPanel (`components/FrameConfigPanel.tsx`)
New right sidebar panel for frame configuration:

**Features:**
- Frame name editing (with live persistence)
- Pattern selector (Focus, Dialogic, Wizard, Canvas, Gallery, Form)
- Props list display (read-only for now)
- Empty state when no frame is selected
- Only visible in Studio mode

### 3. Updated BoardStudio Component

**Structure:**
```
BoardStudio (wrapper with provider)
  └─ BoardStudioProvider
      └─ BoardStudioContent (main UI component)
```

**Layout Changes:**

| Element | Studio Mode | Preview Mode |
|---------|------------|--------------|
| Left Sidebar (Boards list) | ✅ Visible | ❌ Hidden |
| Frame Tabs | ✅ Visible | ❌ Hidden |
| Canvas | ✅ With selection chrome | ✅ Clean view |
| Props Library (right) | ✅ Visible | ❌ Hidden |
| Frame Config Panel (right) | ✅ Visible | ❌ Hidden |

**Toolbar:**
- **Studio Mode:**
  - "+ Add Frame" button
  - "Preview" button (switches to preview)
  - "Kip Assist" button (placeholder)
- **Preview Mode:**
  - "← Back to Studio" button

### 4. Rendering Unification

**Critical Fix:** Props now render consistently across modes.

**Before:**
- Edit/Layout: Props shown as JSON list (meta view)
- Preview: Props rendered as actual components

**After:**
- Studio: Props rendered as actual components (same as preview) + selection chrome
- Preview: Props rendered as actual components (no chrome)

This is achieved by:
1. FrameRenderer always uses PatternRenderer for content
2. PatternRenderer mode is mapped: `studio → 'edit'`, `preview → 'preview'`
3. PatternRenderer's edit mode already renders full props (via PropManager)

## Files Created

1. **`context/BoardStudioContext.tsx`** - Central state management context
2. **`components/FrameRenderer.tsx`** - Unified frame rendering component
3. **`components/FrameConfigPanel.tsx`** - Frame configuration sidebar panel

## Files Modified

1. **`v0/BoardStudio.tsx`** - Complete refactor to use new architecture:
   - Removed old state management code
   - Removed old CRUD functions (now in context)
   - Updated toolbar for studio/preview toggle
   - Replaced canvas rendering with FrameRenderer
   - Updated sidebar visibility logic
   - Wrapped in BoardStudioProvider

## Behavior Changes

### Adding Props
When a user adds a prop from the Props Library in Studio mode:

1. Prop is immediately added to local state (optimistic update)
2. PATCH request sent to `/api/boards/:boardId/frames/:frameId`
3. On success: state synced with server response
4. On failure: local state rolled back

**Result:** Props appear instantly in the canvas without needing to switch modes.

### Renaming Frames
When a user edits a frame name in the FrameConfigPanel:

1. Name updates immediately in local state
2. PATCH request sent to backend
3. Frame tabs update in real-time
4. No refresh required

### Switching Modes
- **Studio → Preview:** Hides all editing UI, shows clean content
- **Preview → Studio:** Restores editing UI, maintains active frame selection

## API Integration

No API changes were required. The refactor uses existing endpoints:

- `GET /api/board-data/:boardId` - Load board
- `POST /api/boards/:boardId/frames` - Create frame
- `PATCH /api/boards/:boardId/frames/:frameId` - Update frame
- `DELETE /api/boards/:boardId/frames/:frameId` - Delete frame
- `PUT /api/boards/:boardId` - Update board metadata

## Known Limitations & Future Work

### Current Limitations
1. **Per-prop editing:** Props list in FrameConfigPanel is read-only
   - Can view props but not edit individual prop config
   - Full prop editing coming in future iteration

2. **Layout mode removed:** Layout functionality merged into Studio mode
   - No separate drag-and-drop layout mode yet
   - Frame ordering via tabs only

3. **Kip Assist:** Button present but not wired to functionality
   - Placeholder for AI assistant features

### Future Enhancements
- [ ] Per-prop configuration UI in FrameConfigPanel
- [ ] Drag-and-drop frame reordering
- [ ] Canvas-level drag-and-drop for prop positioning
- [ ] Kip Assist integration
- [ ] Multi-frame preview navigation
- [ ] Frame duplication
- [ ] Undo/redo support

## Testing Checklist

### Manual Testing
- [x] Switch between Studio and Preview modes
- [x] Add new frame via toolbar button
- [x] Select frame from tabs
- [x] Rename frame in FrameConfigPanel
- [x] Change frame pattern
- [x] Add prop from Props Library
- [x] Verify prop appears immediately in canvas
- [x] Delete custom frame
- [x] Verify Cover/Settings frames cannot be deleted
- [x] Test with existing board data
- [x] Test with new board
- [x] Verify all sidebars hide in Preview mode

### Edge Cases
- [x] No frames present (shows empty state)
- [x] No active frame selected
- [x] Loading states
- [x] Error states (auth required, no board)
- [x] Optimistic update failures

## Migration Notes

### For Developers
- Import `useBoardStudio()` hook to access board state anywhere in the component tree
- Use `FrameRenderer` for any frame visualization
- Context automatically handles persistence
- No need to manually call save functions

### For Users
- No migration needed - existing boards work seamlessly
- UI may look slightly different but functionality is preserved
- Frame tabs simplified (pattern info removed from tab label)

## Performance Considerations

- Optimistic updates provide instant UI feedback
- Context prevents prop drilling
- FrameRenderer memoization opportunities (can be added later)
- PatternRenderer already handles prop rendering efficiently

## Accessibility

- Keyboard navigation maintained (tab through frames)
- Focus states preserved on interactive elements
- ARIA labels on buttons
- Screen reader friendly mode toggle

## Summary

This refactor successfully:
✅ Unified the visual output across editing and preview modes  
✅ Created a centralized state management system  
✅ Simplified the mode system from 3 to 2  
✅ Enabled inline frame configuration  
✅ Made props appear immediately when added  
✅ Maintained backward compatibility with existing API  
✅ Improved overall UX and consistency  

The Board Studio now behaves like a true builder with consistent visual feedback and clear mode separation between authoring (Studio) and viewing (Preview).


