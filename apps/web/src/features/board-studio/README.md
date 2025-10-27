# Board Studio

## 📌 Purpose

Board Studio is the authoring surface for creating and managing Boards in the Keeper platform. It provides a visual builder interface where users can create frames, add props (content components), configure patterns, and preview their boards before publishing.

## 🧱 Key Files

### Core Components
- `v0/BoardStudio.tsx` - Main Board Studio component (refactored to use context architecture)
- `v0/context/BoardStudioContext.tsx` - Central state management for board editing
- `v0/components/FrameRenderer.tsx` - Unified frame rendering for studio/preview modes
- `v0/components/FrameConfigPanel.tsx` - Frame configuration sidebar panel

### Pattern System
- `patterns/PatternRenderer.tsx` - Renders frames according to their engagement patterns
- `v0/patterns/registry.ts` - Pattern definitions (Focus, Dialogic, Wizard, Canvas, Gallery, Form)

### Settings & Configuration
- `settings/SettingsRenderer.tsx` - Board settings frame renderer
- `settings/schema.ts` - Settings validation schema

### UI Components
- `v0/components/ui/*` - Shadcn UI components (Button, Input, Select, Sheet, etc.)

### Type Definitions
- `v0/types.ts` - TypeScript interfaces for boards, frames, props, and patterns

## 🔄 Data & Behavior

### Mode System
Board Studio operates in two modes:

1. **Studio Mode** (default)
   - Full authoring interface with frame tabs, props library, and configuration panel
   - Frames are selectable and editable
   - Props appear with editing chrome
   - Sidebars visible for navigation and configuration

2. **Preview Mode**
   - Read-only view showing final user experience
   - All editing chrome hidden
   - Clean content presentation
   - No sidebars

### State Management

Uses React Context (`BoardStudioContext`) for centralized state:

```typescript
{
  mode: 'studio' | 'preview'
  board: StudioBoard | null
  frames: StudioFrame[]
  activeFrameId: string | null
  // CRUD operations
  addFrame()
  updateFrame()
  removeFrame()
  addPropToFrame()
}
```

### Data Flow

1. **Loading:**
   - Board data loaded via `/api/board-data/:boardId`
   - Frames and props hydrated from server response
   - First frame auto-selected as active

2. **Editing:**
   - All mutations use optimistic updates for instant UI feedback
   - Changes immediately reflected in canvas
   - Background persistence to API endpoints
   - Rollback on error

3. **Persistence:**
   - Frames: `POST/PATCH/DELETE /api/boards/:boardId/frames/:frameId`
   - Board metadata: `PUT /api/boards/:boardId`
   - Props: Embedded in frame PATCH requests

### Pattern Rendering

Each frame has an engagement pattern that determines how it renders:

- **Focus:** Single hero element (covers, hero sections)
- **Dialogic:** Agent-guided conversation interface
- **Wizard:** Step-by-step flow (onboarding, forms)
- **Canvas:** Freeform composition with props
- **Gallery:** Image-first grid layout
- **Form:** Data entry / configuration

Pattern rendering handled by `PatternRenderer`, which adapts to both edit and preview modes.

### Props System

Props are content components added to frames:
- Media: Images, videos, galleries
- Content: Headings, text blocks, quotes
- Interactive: Buttons, forms
- AI: AI assistant tokens

Props added from Props Library → immediately render in canvas → auto-persist to backend.

## 🏗️ Architecture

### Component Hierarchy

```
BoardStudio (wrapper)
  └─ BoardStudioProvider (context)
      └─ BoardStudioContent (main UI)
          ├─ Header (toolbar with mode toggle)
          ├─ Left Sidebar (boards list - studio only)
          ├─ Main Area
          │   ├─ Frame Tabs (studio only)
          │   └─ Canvas
          │       └─ FrameRenderer
          │           └─ PatternRenderer
          └─ Right Sidebar
              ├─ Props Library (studio only)
              └─ FrameConfigPanel (studio only)
```

### Context Usage

Any component can access board state via:

```typescript
import { useBoardStudio } from './context/BoardStudioContext'

function MyComponent() {
  const { mode, frames, activeFrameId, updateFrame } = useBoardStudio()
  // ...
}
```

## ⚠️ Notes & ToDo

### Completed (Oct 27, 2025)
- [x] Refactored from 3-mode to 2-mode system (Edit/Layout/Preview → Studio/Preview)
- [x] Created BoardStudioContext for centralized state management
- [x] Built FrameRenderer for unified rendering
- [x] Built FrameConfigPanel for inline frame configuration
- [x] Props now appear immediately in Studio mode (no mode switching needed)
- [x] Frame renaming works inline via FrameConfigPanel

### Current Limitations
- [ ] Per-prop editing not yet implemented (props list is read-only)
- [ ] No drag-and-drop frame reordering
- [ ] No canvas-level prop positioning
- [ ] Kip Assist button present but not functional

### Future Enhancements
- [ ] Full per-prop configuration UI
- [ ] Drag-and-drop interface for frames and props
- [ ] Kip Assist AI integration
- [ ] Multi-frame preview navigation
- [ ] Frame duplication
- [ ] Undo/redo support
- [ ] Collaborative editing

### Known Issues
- None currently identified

### Questions for Kip
- How should Kip Assist integrate with the new Studio mode?
- Should there be a separate canvas-level layout mode for prop positioning?
- What level of per-prop editing is needed before v1 launch?

## 📆 Update Log

### 2025-10-27 - Studio/Preview Refactor
**Changed:**
- Refactored from 3-mode system to 2-mode system
- Created BoardStudioContext for centralized state management
- Created FrameRenderer component for unified rendering
- Created FrameConfigPanel for inline frame configuration
- Updated toolbar to show Studio/Preview toggle
- Hidden sidebars in Preview mode
- Unified prop rendering across modes

**Files Added:**
- `v0/context/BoardStudioContext.tsx`
- `v0/components/FrameRenderer.tsx`
- `v0/components/FrameConfigPanel.tsx`
- `STUDIO_PREVIEW_REFACTOR.md` (detailed refactor documentation)

**Files Modified:**
- `v0/BoardStudio.tsx` (major refactor)

**Why:**
The previous 3-mode system caused visual inconsistencies where props would appear differently in Edit vs Preview modes. The new architecture ensures consistent rendering while providing clear separation between authoring (Studio) and viewing (Preview) experiences.

**Impact:**
- Improved UX: Props appear immediately when added
- Better consistency: Same visual output in Studio and Preview
- Cleaner code: Centralized state management via Context
- Easier maintenance: Single source of truth for board state
- No API changes: Uses existing endpoints


