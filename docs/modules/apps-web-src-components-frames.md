# Frame Components

## 📌 Purpose
This folder contains the new Frame system components that replace the legacy MediaFrame system. The Frame system provides modular, reusable UI components that can be dynamically rendered based on frame type and configuration.

## 🧱 Key Files
- `FrameRenderer.tsx` - Main component for dynamic frame rendering
- `MediaCardFrame.tsx` - Rich media presentation frames
- `PreviewFrame.tsx` - Compact content summary frames
- `DialogFrame.tsx` - Guided agent interaction frames
- `ConfigPanelFrame.tsx` - Form-based or tabbed settings frames
- `ProcessFrame.tsx` - Step-based UI flow frames
- `AgentPreviewFrame.tsx` - Agent identity/config visualization frames
- `CodeSnippetFrame.tsx` - Code viewer/editor frames (reserved for CodeBoard)
- `index.ts` - Component exports and utilities

## 🔄 Data & Behavior

### Frame System Architecture
The Frame system is built around three core Prisma models:
- **FrameConfig**: Layout and theme configurations
- **FrameContent**: Actual content (media, text, etc.)
- **FrameInstance**: Bindings between entities, configs, and content

### Frame Types
1. **media_card** - Rich media presentation with playlist support
2. **preview** - Compact content summaries for lists/grids
3. **dialog** - Interactive agent conversations
4. **config_panel** - Tabbed configuration interfaces
5. **process_frame** - Multi-step workflow wizards
6. **agent_preview** - Agent identity and status displays
7. **code_snippet** - Syntax-highlighted code display (CodeBoard)

### Engagement Modes
- **dialogic** (default) - Agent-guided interactions
- **wizard** - Sequential multi-step flows
- **focus** - Single-frame deep interaction
- **canvas** - Freeform layout composition

### Dynamic Rendering
The `FrameRenderer` component uses a registry pattern to dynamically load and render frame components based on the `frameType` specified in the `FrameConfig`. Components are lazy-loaded for performance.

### Context Integration
- **FrameContext**: Global state management for frames
- **useFrame**: Hook for accessing frame state and actions
- **Interaction Tracking**: All frame interactions are logged for analytics

## 🎨 Styling & Theming
- Uses Tailwind CSS with HSL color tokens
- Supports dynamic theming via CSS variables
- Framer Motion animations for smooth transitions
- Responsive design patterns throughout

## 🔧 Usage Examples

### Basic Frame Rendering
```tsx
import { FrameRenderer } from '@/components/frames';

<FrameRenderer
  frameInstance={frameInstance}
  className="w-full"
  onInteraction={handleInteraction}
/>
```

### Specific Frame Component
```tsx
import { MediaCardFrame } from '@/components/frames';

<MediaCardFrame
  frameInstance={frameInstance}
  autoPlay={true}
  showControls={true}
/>
```

### Frame Context Usage
```tsx
import { useFrame } from '@/context/FrameContext';

const { activeFrames, loadFrame, handleFrameInteraction } = useFrame();
```

## 🚀 Integration with Boards
Frames are designed to be used within Board components:
- **Agent Board**: Uses DialogFrame, AgentPreviewFrame, ConfigPanelFrame
- **Domain Board**: Uses ProcessFrame, ConfigPanelFrame
- **Code Board**: Uses CodeSnippetFrame, PreviewFrame

## ⚠️ Notes & ToDo
- [ ] Implement actual API integration for frame CRUD operations
- [ ] Add real-time agent communication for DialogFrame
- [ ] Implement code execution for CodeSnippetFrame
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Create frame analytics and interaction tracking
- [ ] Add frame validation and error boundaries
- [ ] Implement frame caching and performance optimization

## 📆 Update Log
- 2026-06-16: Removed legacy `DraftFrame` and `drafts` frame registry entry; agent drafts use `kip_drafts` via Kip actions, not Agent Home Board frames.
- 2025-01-XX: Created complete Frame system to replace MediaFrame architecture
- Components support all planned frame types from Board Development Plan
- Integrated with FrameContext for state management
- Added comprehensive TypeScript types and interfaces
- Implemented dynamic rendering with lazy loading
- Added interaction tracking and analytics hooks
- 2025-09-08: Switched `activity-feed-frame.tsx` to use `apiFetch` with error/empty states and dev logs
