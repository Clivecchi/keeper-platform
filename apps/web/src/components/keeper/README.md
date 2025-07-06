# Keeper Components

## 📌 Purpose
Components specifically related to Keeper functionality and UI management.

## 🧱 Key Files
- `SoleArchitectureTab.tsx` - Expressive SOLE memory architecture management component

## 🔄 Data & Behavior

### SoleArchitectureTab
The `SoleArchitectureTab` component provides UI for managing SOLE (Self-Organizing Learning Environment) memory architecture in the Architect ViewMode. 

**Features:**
- Displays current approved SOLE architecture 
- Shows pending soleDraft submissions from agents
- Provides approve/reject actions for human reviewers
- Request explanation functionality for agent-proposed changes
- JSON viewer for technical inspection
- SOLE pattern information and guidance

**Props:**
- `keeper: Keeper` - The keeper object with SOLE data
- `userId: string` - Current user ID for API calls
- `onUpdate: (updatedKeeper: Keeper) => void` - Callback when keeper is updated

**Usage:**
```tsx
import SoleArchitectureTab from '../components/keeper/SoleArchitectureTab';

<SoleArchitectureTab
  keeper={keeper}
  userId={user.id}
  onUpdate={setKeeper}
/>
```

**API Integration:**
- `POST /api/keeper/:id/sole/approve` - Approve pending draft
- `POST /api/keeper/:id/sole/reject` - Reject pending draft
- Future: Request explanation functionality

## ⚠️ Notes & ToDo
- [ ] Integrate with agent conversation system for "Request Explanation"
- [ ] Add more sophisticated JSON validation and editing
- [ ] Consider adding diff view between current and proposed architecture
- [ ] Add keyboard shortcuts for approve/reject actions

## 📆 Update Log
- **2025-01-04**: Created SoleArchitectureTab component for SOLE memory architecture management
  - Added approve/reject functionality for agent-proposed memory structures
  - Implemented JSON viewer and SOLE pattern information display
  - Integrated with backend SOLE API endpoints 