# Layout Components

## 📌 Purpose
This folder contains the core layout components for the Keeper Platform, including the main navigation sidebar and navbar. The layout system is now **ViewMode-aware**, providing contextual navigation based on the user's current role and context.

## 🧱 Key Files
- `Sidebar.tsx` - Main navigation sidebar with ViewMode-aware content
- `Navbar.tsx` - Top navigation bar
- `index.tsx` - Layout component exports

## 🔄 Data & Behavior

### ViewMode System
The sidebar now implements a comprehensive ViewMode system that provides different navigation structures based on the current user context:

#### ViewMode Types:
1. **Architect Mode (`Design Build`)** - For platform configuration and keeper design
2. **My Keeper Mode** - For personal keeper interaction
3. **Admin Mode (`System Admin`)** - For system administration

### Sidebar Structure by ViewMode

#### Architect Mode Navigation:
```
Architect
├── AI Design Build
│   ├── Manage Agents
│   ├── AI Admin
│   │   ├── API Key Vault
│   │   └── System Logs
├── Keeper Design Build
│   ├── All Keepers
│   ├── Selected Keeper
│   │   ├── Metadata
│   │   ├── Engagement Templates
│   │   └── Memory Pattern Tools (if declared)
├── Themes (future stub)
```

#### My Keeper Mode Navigation:
```
My Keeper
├── Settings
├── Dashboard
├── Memory (SOLE)
├── Journeys
├── Moments
├── Topics
├── Voice Panel
└── Logbook
```

#### Admin Mode Navigation:
```
System Administration
├── User Management
├── Platform API Keys
└── System Logs
```

### Context Integration
- **ViewModeContext**: Global context for managing current view mode
- **Persistent Storage**: ViewMode preferences stored in localStorage
- **Dynamic Icons**: Different icons for each mode in the toggle
- **Conditional Rendering**: Sidebar content changes based on active mode

### Navigation Features
- **ViewMode Toggle**: Located in sidebar footer, allows switching between modes
- **Contextual Links**: Different navigation paths based on current mode
- **Responsive Design**: Collapsible sidebar with mode toggle adaptation
- **Visual Indicators**: Active states and hover effects for navigation items

## ⚠️ Notes & ToDo
- [x] Implement ViewMode enum and context system
- [x] Create ViewMode-aware sidebar navigation
- [x] Add ViewMode toggle component with persistent storage
- [x] Implement conditional rendering for different modes
- [x] Add proper routing for Architect mode keeper management
- [ ] Enhance Themes section when theme management is implemented
- [ ] Add keyboard shortcuts for ViewMode switching
- [ ] Implement ViewMode-specific breadcrumbs
- [ ] Add transition animations between ViewMode changes

## 📆 Update Log

### 2026-01-15 - Diagnostics consolidation
- Removed the legacy sidebar Debug button to keep diagnostics frame-first.

### 2026-01-25 - Settings routing
- Updated My Keeper navigation to point at `/settings` and admin links to `/admin/users`.

### 2024-01-XX - ViewMode Implementation
- **Added**: ViewMode enum with three main modes (Architect, My Keeper, Admin)
- **Added**: ViewModeContext for global state management
- **Added**: ViewModeProvider with localStorage persistence
- **Modified**: Sidebar component to be ViewMode-aware
- **Added**: ViewModeToggle component with dropdown interface
- **Added**: Conditional navigation based on current ViewMode
- **Added**: New route structure for Architect mode keeper management
- **Enhanced**: Sidebar with proper TypeScript types and accessibility features
- **Added**: Framer Motion animations for smooth transitions

### Navigation Behavior Changes:
- **Architect Mode**: Focus on configuration and design tools
- **My Keeper Mode**: Personal keeper interaction (unchanged from previous)
- **Admin Mode**: System administration tools
- **Dynamic Routing**: Different paths based on ViewMode context

### Technical Implementation:
- Uses React Context API for state management
- localStorage for ViewMode persistence across sessions
- Conditional rendering patterns for navigation content
- TypeScript interfaces for type safety
- Heroicons for consistent iconography
- Tailwind CSS for responsive styling

### 2026-01-02 - Navbar spacing tweaks
- Reduced navbar header padding to 7px to match preview spacing across public layouts.
- Swapped menu icon to a down-facing arrow and matched sizing for alignment with the moment close icon.

