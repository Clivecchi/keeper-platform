# Board System

## 📌 Purpose
This folder contains the Board system components that serve as the primary UI framework for all interactive and display surfaces in the Keeper platform. Boards are modular canvases composed of Frame components, replacing traditional page structures with flexible, agent-driven interfaces.

## 🧱 Key Files
- `AgentBoard.tsx` - Agent configuration and management board
- `domain-board.tsx` - Domain management and setup board
- `domain-board/README.md` - Domain board specific documentation
- `journey-board.tsx` - Journey management and visualization board
- `journey-board/README.md` - Journey board specific documentation
- `keeper-type-board.tsx` - Keeper Type management and configuration board
- `people-board.tsx` - People management and collaboration board
- `README.md` - This documentation file

## 🔄 Data & Behavior

### Board System Architecture
The Board system is built around the concept of modular, interactive canvases:

- **Board**: Primary interactive surface with layout, theme, and engagement mode
- **Frame**: Modular elements that display content and handle interactions
- **EngagementMode**: Controls interaction style (dialogic, wizard, focus, canvas)
- **Layout**: Determines frame arrangement (grid, column, row, wizard, focus, canvas)

### Board Types
1. **agent_board** - Agent configuration and interaction workspace
2. **domain_board** - Domain management and setup with wizard workflow ✅
3. **journey_board** - Journey and path management with canvas layout ✅
4. **keeper_type_board** - Keeper Type management with wizard/canvas modes ✅
5. **people_board** - People management and collaboration with canvas/wizard modes ✅
6. **code_board** - Code exploration and teaching (planned)

### Engagement Modes
- **dialogic** (default) - Agent-guided interactions and conversations
- **wizard** - Multi-step sequential workflows
- **focus** - Single-frame deep interaction mode
- **canvas** - Freeform layout for composing frames

### Layout Types
- **grid** - Responsive grid layout for multiple frames
- **column** - Vertical stacking of frames
- **row** - Horizontal arrangement with scrolling
- **wizard** - Step-by-step progression through frames
- **focus** - Single frame with maximum attention
- **canvas** - Drag-and-drop freeform positioning

## 🎨 Board Context Integration
The Board system uses React context for state management:

```tsx
import { useBoard } from '@/context/BoardContext';

const { 
  activeBoard, 
  loadBoard, 
  addFrame, 
  removeFrame,
  setEngagementMode,
  isLayoutEditing 
} = useBoard();
```

### Context Features
- **Board Loading**: Async board instance management
- **Frame Management**: Add, remove, update, and reorder frames
- **Layout Editing**: Toggle edit mode for frame arrangement
- **Engagement Control**: Switch between interaction modes
- **Error Handling**: Graceful error states and recovery

## 🚀 Usage Examples

### Basic Board Usage
```tsx
import { AgentBoard } from '@/boards/AgentBoard';

<AgentBoard
  agentId="my-agent-id"
  onAgentUpdate={handleUpdate}
  showControls={true}
/>
```

### Custom Board Implementation
```tsx
import { BoardRenderer } from '@/components/boards/BoardRenderer';
import { useBoard } from '@/context/BoardContext';

const MyCustomBoard: React.FC = () => {
  const { activeBoard } = useBoard();
  
  return (
    <BoardRenderer
      boardInstance={activeBoard}
      onFrameInteraction={handleInteraction}
      showLayoutControls={true}
    />
  );
};
```

### Board with Custom Theme
```tsx
const customBoard: BoardInstance = {
  config: {
    type: 'agent_board',
    layout: 'column',
    engagementMode: 'dialogic',
    theme: {
      primaryColor: '#3B82F6',
      backgroundColor: '#F8FAFC',
      accentColor: '#1E40AF',
    }
  },
  // ... other properties
};
```

## 🔧 Integration with Frame System
Boards work seamlessly with the existing Frame system:

- **FrameRenderer**: Dynamically renders frame types within board layouts
- **FrameContext**: Manages frame-level interactions and state
- **Frame Types**: All frame types (media_card, dialog, config_panel, etc.) supported
- **Theme Inheritance**: Board themes cascade to individual frames

## 🛠 Development Patterns

### Creating a New Board Type
1. Define the board type in `BoardContext.tsx`
2. Create the board component in `/boards/YourBoard.tsx`
3. Implement board-specific frame creation logic
4. Add routing in `App.tsx`
5. Update this documentation

### Board Registry Pattern
Future enhancement will support dynamic board registration:

```tsx
// Planned feature
export const boardRegistry: Record<BoardType, React.FC<BoardProps>> = {
  agent_board: AgentBoard,
  domain_board: DomainBoard,
  // ... other board types
};
```

## 🎯 Route Integration
Boards are integrated into the routing system:

- `/studio/agent-board` - General agent board
- `/studio/agents/:agentId` - Agent-specific board
- `/studio/domain-board` - Domain management with wizard workflow ✅
- `/studio/journey-board` - Journey management with canvas layout ✅
- `/studio/keeper-type-board` - Keeper Type management with wizard/canvas modes ✅
- `/studio/people-board` - People management with canvas/wizard modes ✅

## ⚠️ Notes & ToDo
- [x] Implement API integration for board CRUD operations
- [ ] Add drag-and-drop frame reordering in canvas layout
- [x] Create DomainBoard for Phase 2 development
- [x] Implement Board Studio for visual board editing
- [ ] Add real-time collaboration features to Board Studio
- [ ] Implement board templates and presets
- [ ] Implement board template system
- [ ] Add board sharing and collaboration features
- [ ] Create board analytics and usage tracking
- [ ] Implement board versioning and rollback
- [ ] Add accessibility features (ARIA labels, keyboard navigation)

## 🔮 Future Enhancements
- **Board Templates**: Pre-configured board layouts for common use cases
- **Collaborative Editing**: Real-time multi-user board editing
- **Board Marketplace**: Shareable board configurations
- **Advanced Layouts**: Custom CSS Grid and Flexbox layouts
- **Board Analytics**: Usage tracking and optimization insights
- **Mobile Optimization**: Responsive board layouts for mobile devices

## 📆 Update Log
- 2025-01-XX: Created Board system foundation with BoardContext and BoardRenderer
- AgentBoard implemented with dialogic engagement mode
- DomainBoard implemented with wizard engagement mode
- JourneyBoard implemented with canvas engagement mode
- KeeperTypeBoard implemented with wizard/canvas dual-mode engagement
- PeopleBoard implemented with canvas/wizard dual-mode engagement
- **Board Studio implemented** - Visual board editor with drag-and-drop interface
- Created 4 specialized domain frame components (DomainCard, SetupSteps, MemberList, CustomDomain)
- Created 4 specialized journey frame components (JourneyOverview, PathList, MomentGrid, JourneyConfig)
- Created 5 specialized keeper type frame components (KeeperTypeOverview, KeeperTypeConfig, LinkedJourneys, LinkedAgents, KeeperTypeProcess)
- Created 5 specialized people frame components (PeopleOverview, RoleManager, CollaborationNetwork, ActivityFeed, PeopleProcess)
- Integration with existing Frame system completed
- Routes added for `/studio/agents`, `/studio/agent-board`, `/studio/domain-board`, `/studio/journey-board`, `/studio/keeper-type-board`, `/studio/people-board`, and `/studio/board-studio`
- Enhanced FrameRenderer with domain-specific, journey-specific, keeper type-specific, and people-specific frame routing
- Added layout editing capabilities for canvas engagement mode
- Implemented dual engagement mode (wizard/canvas) switching across multiple boards
- Advanced people management features including role matrix, collaboration network visualization, and activity timeline
- **Backend API routes** for board and frame management (`/api/boards`, `/api/frames`)
- **Frame Library** with searchable, draggable frame types organized by category
- **Properties Panel** for board configuration, theming, and frame settings
- **Temporary navigation link** added to Studio sidebar for Board Studio access
- Documentation created with usage patterns and development guidelines
 - 2025-08-12: Added Keeper-scoped context (`context/KeeperContext.tsx`), engagement pattern registry (`patterns/registry.ts`), `studio/FrameConfigSheet.tsx`, and `props/TokenProp.tsx`. Began Board Studio UX overhaul to match the new spec (Keeper header, modes bar, right props library, frame config gear).
