# Studio Components

## 📌 Purpose
This folder contains specialized React components for the Studio interface, including agent management, keeper type assignments, and platform administration features.

## 🧱 Key Files
- `AgentKeeperTypeAssignment.tsx` - Agent ↔ KeeperType assignment management interface

## 🔄 Data & Behavior
- **AgentKeeperTypeAssignment**: Manages many-to-many relationships between agents and keeper types
- Uses `keeperApi` for KeeperType data fetching
- Implements assignment/unassignment workflows with UI feedback
- Supports both assigned and available type views with filter functionality

## 🔧 Component Details

### AgentKeeperTypeAssignment
**Purpose**: Provides a comprehensive interface for managing which keeper types an agent can work with.

**Key Features**:
- **Assignment Management**: Assign/unassign keeper types to agents
- **Visual Feedback**: Clear indication of assigned vs available types
- **Assignment Dialog**: Modal interface for selecting new assignments
- **Memory Pattern Display**: Shows memory pattern icons and color coding
- **System Type Identification**: Distinguishes between system and custom types
- **Template/Keeper Counts**: Shows usage statistics for each type

**Props**:
- `agent: KipAgent` - The agent to manage assignments for
- `onAssignmentsUpdated: (assignments: KeeperType[]) => void` - Callback for assignment changes

**State Management**:
- Tracks keeper types, assigned types, and available types
- Handles loading states and error handling
- Manages modal dialog visibility

## ⚠️ Notes & ToDo
- [ ] Implement actual API endpoints for assignment operations (currently mocked)
- [ ] Add bulk assignment functionality
- [ ] Implement assignment search and filtering
- [ ] Add assignment history tracking
- [ ] Connect to real backend persistence

## 📆 Update Log
- **2025-01-27**: Created AgentKeeperTypeAssignment component with full assignment interface
- **2025-01-27**: Added memory pattern visualization and system type identification
- **2025-01-27**: Implemented assignment dialog with available types filtering 