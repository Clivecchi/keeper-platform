# Prop Components

## 📌 Purpose
This folder contains the comprehensive prop drop behavior system for frames in Board Studio. Provides intuitive drag-and-drop, stacking, and management of props within frames with empty and populated states.

## 🧱 Key Files
- `PropDropZone.tsx` - Empty state component with dashed drop zone and contextual instructions
- `PropBlock.tsx` - Individual prop component with label, quick-actions, and drag handles
- `PropInspector.tsx` - Right-hand panel for editing prop configurations
- `PropManager.tsx` - Main orchestrator component that manages the complete prop system
- `LinkedCard.tsx` - Shared renderer for linked entity cards (journeys, keepers, etc.)
- `index.ts` - Component exports and type definitions

## 🔄 Data & Behavior

### PropDropZone Component
- **Purpose**: Empty state display for frames without props
- **Features**:
  - Contextual messaging based on frame pattern (dialogic, wizard, focus, etc.)
  - Visual drag-over feedback with animated drop indicators
  - Position tracking for canvas-mode prop placement
  - Smooth animations with Framer Motion

### PropBlock Component
- **Purpose**: Individual prop display in populated frames
- **Features**:
  - Drag handle for reordering (using Framer Motion Reorder)
  - Quick-action buttons: edit, duplicate, delete, visibility toggle
  - Optional draft/published status toggle
  - Selection highlighting and hover states
  - Type-based icons and labels

### PropInspector Component
- **Purpose**: Right-hand panel for detailed prop editing
- **Features**:
  - Type-specific configuration forms (text, image, button, token, etc.)
  - Real-time validation with error highlighting
  - Escalation to modal for heavy props (gallery, media, form)
  - Unsaved changes detection and confirmation
  - Auto-save functionality

### PropManager Component
- **Purpose**: Main orchestrator that combines all prop functionality
- **Features**:
  - Optimistic updates with automatic persistence
  - Drag-and-drop integration with props library
  - Batch reordering with order index management
  - Error handling and rollback for failed operations
  - Loading states and visual feedback

### LinkedCard Component
- **Purpose**: Canonical `linked_card` prop renderer shared by Kip frames, dialogue metadata, and future left-context surfaces.
- **Variants**:
  - `context` (default) – stacked cards inside frames or side panels.
  - `inline` – compact treatment for inline dialogue mentions.
- **Highlights**:
  - Supports preview snippets, timestamps, and optional thumbnail images.
  - Automatically adapts text contrast + focus states for accessibility.
  - Detects internal vs. external links and applies the right anchor element.

## 🎨 UX Inspirations Implemented

### Notion-Style Features
- ✅ Empty state hints with contextual messaging
- ✅ Drag handles for reordering blocks
- ✅ Hover-based quick actions

### Webflow/Wix-Style Features
- ✅ Block-level quick actions (edit, duplicate, delete)
- ✅ Right-hand inspector panel for detailed editing
- ✅ Visual feedback during drag operations

### Figma-Style Features
- ✅ Stacked layers with clear hierarchy
- ✅ Eye icon for visibility toggling
- ✅ Smooth reordering animations

## 🔧 Technical Implementation

### Data Structure
Props are stored as `PropData` objects with:
```typescript
interface PropData {
  id: string;              // Unique identifier
  type: string;            // Prop type (image, text, button, token, etc.)
  config: Record<string, any>; // Type-specific configuration
  isVisible: boolean;      // Visibility state
  isDraft: boolean;        // Draft/published status
  orderIndex: number;      // Position in stack
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last modification timestamp
}
```

### Persistence
- Uses optimistic updates for immediate UI feedback
- Batch saves order changes during reordering
- Automatic rollback on API failures
- Integrates with existing `FrameInstance.props` JSONB field

### Drag and Drop
- Uses `@dnd-kit` patterns for library-to-frame drops
- Framer Motion Reorder for prop reordering within frames
- Visual placeholders and drop indicators
- Position tracking for canvas-mode layouts

## ⚠️ Notes & ToDo
- [x] Empty state with contextual messaging
- [x] Prop blocks with quick actions
- [x] Drag-and-drop reordering
- [x] Right-hand inspector panel
- [x] Optimistic updates and persistence
- [x] Type-specific configuration forms
- [x] Draft/published toggles
- [ ] Modal escalation for heavy props
- [ ] Keyboard navigation support
- [ ] Undo/redo functionality
- [ ] Bulk operations (select multiple props)
- [ ] Advanced canvas positioning
- [ ] Prop templates and presets

## 📦 Integration

### With Board Studio
The PropManager component integrates directly with frame rendering:

```typescript
import { PropManager } from '../components/props';

// In frame component
<PropManager
  frameId={frame.id}
  initialProps={frame.props}
  isActive={activeFrameId === frame.id}
  framePattern={frame.pattern}
  showDraftToggle={true}
  onPropsUpdate={handlePropsUpdate}
/>
```

### With Props Library
Props are dragged from the library and dropped into the PropDropZone:

```typescript
// Library prop with drag data
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'image',
      config: { url: '', alt: '', size: 'medium' }
    }));
  }}
>
  Image Prop
</div>
```

## 📆 Update Log

### 2025-12-09: **LinkedCard Prop Renderer**
- Introduced `LinkedCard.tsx` with shared variants for context frames and inline dialogue usage.
- Exported the component via `index.ts` so PropRenderer/Kip Agent Board can hydrate `linked_card` props consistently.
- Documented preview metadata handling, color badges, and accessibility focus states.

### 2025-01-28: **EDIT MODE INTERACTION ENHANCEMENTS**
- **Edit Mode Toggle**: Added edit mode that highlights editable props with cursor changes
- **Inline Editing**: Click-to-edit functionality for text, button labels, and token names
- **Save Status Badges**: Individual prop status indicators (saving/saved/failed) with Keeper theming
- **Enhanced PropInspector**: Rich CRUD forms with image previews, color pickers, and advanced options
- **Canvas Cleanup**: Removed frame metadata from canvas space - purely for props now
- **UX Inspirations**: Implemented Notion-style seamless toggling, WordPress Gutenberg inspector, Airtable inline edits
- **Accessibility**: Keyboard navigation (Enter/Escape), screen reader support, high contrast indicators

### 2025-01-28: **COMPREHENSIVE PROP DROP SYSTEM IMPLEMENTED**
- Created PropDropZone with contextual empty states
- Built PropBlock with full quick-action suite
- Implemented PropInspector with type-specific forms
- Developed PropManager orchestrator with optimistic updates
- Added drag-and-drop reordering with Framer Motion
- Integrated with existing Board Studio architecture
- Added proper TypeScript types and error handling
