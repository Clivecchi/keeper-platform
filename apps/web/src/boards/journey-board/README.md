# Journey Board

## 📌 Purpose
This board provides a comprehensive interface for journey management and visualization using the canvas engagement mode. It enables users to manage learning journeys, paths, moments, and configurations with a flexible, freeform layout that supports future layout editing capabilities.

## 🧱 Key Files
- `journey-board.tsx` - Main JourneyBoard component
- `README.md` - This documentation file

## 🔄 Data & Behavior

### Board Configuration
- **Type**: `journey_board`
- **Layout**: `canvas` - Freeform layout with drag-and-drop capabilities
- **Engagement Mode**: `canvas` - Interactive layout editing and flexible positioning
- **Theme**: Blue color scheme (primary: #3B82F6, accent: #1E40AF, background: #EFF6FF)

### Frame Structure
The JourneyBoard consists of 4 specialized frames in a canvas layout:

| Frame ID | Frame Type | Component | Purpose |
|----------|------------|-----------|---------|
| `journey-overview` | `preview` | `JourneyOverviewFrame` | High-level journey info and progress |
| `path-list` | `media_card` | `PathListFrame` | List and manage learning paths |
| `moment-grid` | `media_card` | `MomentGridFrame` | Visual grid of recent moments |
| `journey-config` | `config_panel` | `JourneyConfigFrame` | Journey settings and configuration |

### Specialized Frame Components

#### JourneyOverviewFrame
- **Purpose**: Displays journey metadata, progress, and quick actions
- **Features**: 
  - Journey icon, title, and description display
  - Progress tracking with animated progress bar
  - Status indicators (active, draft, completed, archived)
  - Tag management and visibility settings
  - Collaborator count and metadata display
  - Quick action buttons for editing and sharing

#### PathListFrame
- **Purpose**: Manages learning paths within the journey
- **Features**:
  - Ordered list of paths with progress tracking
  - Path creation with type selection (lesson, exercise, project, video, reading)
  - Interactive path management (edit, delete, reorder)
  - Status tracking (not_started, in_progress, completed, locked)
  - Duration estimates and moment counts
  - Path type icons and color coding

#### MomentGridFrame
- **Purpose**: Visual grid display of recent moments and achievements
- **Features**:
  - Grid layout with thumbnail previews
  - Moment type filtering (image, video, code, text, note, link)
  - Sorting options (recent, popular, views)
  - Engagement metrics (likes, comments, views)
  - Tag-based organization
  - Privacy indicators (public/private)
  - Path association display

#### JourneyConfigFrame
- **Purpose**: Comprehensive journey settings and configuration
- **Features**:
  - Tabbed interface (General, Theme, Collaborators)
  - Basic information editing (title, description, icon)
  - Tag management with add/remove functionality
  - Privacy settings (public, private, shared)
  - Permission controls (comments, collaboration, approval)
  - Theme customization with predefined and custom colors
  - Collaborator invitation and role management

## 🎨 Styling & Theming
- **Primary Color**: Blue (#3B82F6) - represents learning and knowledge
- **Background**: Light blue (#EFF6FF) for canvas clarity
- **Border Colors**: Blue variants for consistency
- **Status Colors**: Standard semantic colors (green, yellow, red, gray)

## 🚀 Usage Examples

### Basic Usage
```tsx
import { JourneyBoard } from '@/boards/journey-board';

<JourneyBoard
  journeyId="my-journey"
  onJourneyUpdate={handleUpdate}
  showControls={true}
  allowLayoutEditing={true}
/>
```

### With Search Parameters
```tsx
// URL: /studio/journey-board?journeyId=react-learning
// Component automatically picks up journeyId from URL
<JourneyBoard />
```

### Layout Editing Mode
```tsx
<JourneyBoard
  journeyId="custom-journey"
  allowLayoutEditing={true}
  showControls={true}
  onJourneyUpdate={(journeyId, updates) => {
    console.log('Journey updated:', journeyId, updates);
    // Handle API call to save changes
  }}
  className="custom-styling"
/>
```

## 🔧 Integration Points

### Frame System Integration
- Uses `BoardRenderer` with canvas layout for freeform positioning
- Leverages `FrameRenderer` with journey-specific frame overrides
- Integrates with `BoardContext` and `FrameContext` for state management
- Supports layout editing mode for frame repositioning

### Mock Data Support
- Journey information with progress tracking and metadata
- Learning paths with types, status, and progression
- Moments with media previews and engagement metrics
- Configuration settings with theme and collaboration options

### API Integration Points
Journey operations that will connect to backend APIs:
- `journey_update` - Save journey configuration changes
- `path_create` - Create new learning paths
- `path_select` - Navigate to specific path
- `moment_view` - View detailed moment content
- `moment_create` - Create new moments
- `layout_edit` - Toggle layout editing mode
- `journey_share` - Share journey with others
- `collaborator_invite` - Invite team members

## 🔄 Canvas Layout Features
The board uses canvas engagement mode for maximum flexibility:

### Layout Editing
- **Edit Mode**: Toggle between view and edit modes
- **Frame Positioning**: Drag and drop frames to desired positions
- **Size Adjustment**: Resize frames within the canvas
- **Grid Snapping**: Optional grid alignment for precise positioning

### Visual Indicators
- Edit mode indicator with instructions
- Layout controls for frame manipulation
- Visual feedback during drag operations
- Save/cancel options for layout changes

## ⚙️ Configuration Options

### Environment Variables
- Journey management endpoints
- Moment storage services
- Collaboration notification services

### Theme Customization
```tsx
const customTheme = {
  primaryColor: '#3B82F6',
  backgroundColor: '#EFF6FF',
  accentColor: '#1E40AF',
  borderColor: '#BFDBFE',
};
```

### Canvas Layout Settings
- Grid size and snapping
- Minimum/maximum frame sizes
- Layout boundaries and constraints
- Auto-save intervals for layout changes

## 📊 Analytics & Tracking
The board tracks user interactions for analytics:
- Journey completion rates
- Path progression patterns
- Moment creation frequency
- Layout editing usage
- Collaboration activity
- Theme customization preferences

## 🔐 Security Considerations
- Journey visibility controls (public, private, shared)
- Role-based access for collaborators
- Content approval workflows
- Privacy settings for moments
- Secure sharing mechanisms

## ⚠️ Notes & ToDo
- [ ] Connect to actual journey management APIs
- [ ] Implement real-time collaboration features
- [ ] Add advanced layout editing capabilities
- [ ] Create journey template system
- [ ] Add export/import functionality for journeys
- [ ] Implement journey analytics dashboard
- [ ] Add mobile-responsive canvas layout
- [ ] Create journey sharing and discovery features

## 📆 Update Log
- 2025-01-XX: Created JourneyBoard with canvas engagement mode
- Implemented 4 specialized frame components for journey management
- Added layout editing capabilities with toggle mode
- Integrated comprehensive mock data for development
- Enhanced FrameRenderer with journey-specific routing
- Created flexible canvas layout system for future extensibility
