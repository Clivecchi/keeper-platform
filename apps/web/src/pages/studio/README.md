# Studio Pages

## 📌 Purpose
Studio pages provide administrative and development interfaces for the Keeper Platform. These pages are used by authenticated users to manage agents, boards, and platform configuration.

## 🧱 Key Files
- `board-studio-page.tsx` - Board Studio for creating and editing boards
- `AgentBoardPage.tsx` - Agent-specific board wrapper
- `DomainBoardPage.tsx` - Domain management board wrapper
- `JourneyBoardPage.tsx` - Journey visualization board wrapper
- `KeeperTypeBoardPage.tsx` - Keeper Type management board wrapper
- `PeopleBoardPage.tsx` - People management board wrapper
- `README.md` - This documentation file

## 🔄 Data & Behavior

### Board Studio (`board-studio-page.tsx`)
The Board Studio is the central control panel for creating, editing, and managing Boards within the Keeper Platform.

#### Features
- **Board List Panel**: Lists all existing boards for the current domain
- **Board Editor Canvas**: Visual editor for board layout and frame positioning
- **Properties Panel**: Edit board-level settings (name, description, engagement mode, theme)
- **Frame Library**: Searchable library of available frames with drag-and-drop functionality

#### Layout
- **Left Sidebar**: Board list with creation capabilities
- **Main Area**: Board editor canvas with toolbar
- **Right Panel**: Properties and settings (collapsible)
- **Bottom Drawer**: Frame library (togglable)

#### API Integration
- `GET /api/boards?domainId={id}` - List boards for domain
- `POST /api/boards` - Create new board
- `PATCH /api/boards/:boardId` - Update board properties
- `GET /api/frames` - List available frame types
- `POST /api/frames` - Create frame instance

#### Theme
Uses neutral blue-gray scheme (#334155, #E2E8F0, #0F172A) for professional appearance.

### Board Wrapper Pages
Each board type has a dedicated wrapper page that:
- Handles URL parameters and routing
- Provides board-specific context and providers
- Manages authentication and domain access
- Renders the appropriate board component

## ⚠️ Notes & ToDo
- [ ] Implement actual drag-and-drop frame positioning
- [ ] Add board template system
- [ ] Integrate with real-time collaboration
- [ ] Add board versioning and history
- [ ] Implement board sharing and permissions
- [ ] Add board analytics and usage tracking

## 📆 Update Log
- 2025-01-XX: Created Board Studio with comprehensive editing interface
- Added backend API routes for boards and frames management
- Integrated with existing Frame system and BoardRenderer
- Added temporary navigation link in Studio sidebar
- Implemented drag-and-drop frame library with search functionality
- Created properties panel for board configuration and theming
- Documentation created with usage patterns and development guidelines