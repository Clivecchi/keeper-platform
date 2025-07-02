# Layout Components

## 📌 Purpose
Provides the foundational layout components for the Keeper platform, including the new sidebar navigation system and public page layouts.

## 🧱 Key Files
- `Sidebar.tsx` - New collapsible sidebar navigation
- `Navbar.tsx` - Legacy top navigation (used for public pages)
- `AppLayout.tsx` - Main authenticated app layout with sidebar
- `PublicLayout.tsx` - Layout for unauthenticated public pages

## 🔄 Data & Behavior

### Sidebar Navigation (`Sidebar.tsx`)
The new primary navigation component featuring:
- **Collapsible Design**: Can expand/collapse to save space
- **Hierarchical Menu Structure**: Organized into Root, Studio, and Keeper sections
- **Dynamic Expansion**: Each section can be expanded/collapsed independently
- **Active State Management**: Highlights current page and section
- **User Profile Integration**: Shows user info and logout option
- **Responsive Design**: Adapts to different screen sizes

#### Menu Structure:
```
Root
├── Dashboard
├── Profile  
├── Domain Settings
├── API Keys
├── Deployment Options
└── Developer Panel

Studio
├── Agents
├── Engagement Templates
├── Themes
└── Admin Tools
    ├── API Key Vault
    └── System Logs

Keeper
├── All Keepers
├── Create New Keeper
└── Selected Keeper
    ├── Dashboard
    ├── Memory (SOLE)
    ├── Journeys
    ├── Moments
    ├── Topics
    ├── Voice Panel
    └── Logbook
```

### Layout Components
- **AppLayout**: Sidebar + main content area for authenticated users
- **PublicLayout**: Traditional navbar + content for public pages
- **Responsive Behavior**: Automatically adapts layout for mobile devices

## ⚠️ Notes & ToDo
- [x] Replace top navigation with collapsible sidebar ✅ **COMPLETED**
- [x] Implement three-section menu structure (Root/Studio/Keeper) ✅ **COMPLETED**
- [x] Add dynamic keeper submenu for selected keeper ✅ **COMPLETED**
- [ ] Add keyboard navigation support for accessibility
- [ ] Implement breadcrumb navigation for deep routes
- [ ] Add search functionality within navigation

## 📆 Update Log
- **2025-01-30: ✅ COMPLETED - Navigation Redesign Phase 1:**
  - Created new `Sidebar.tsx` component with collapsible design
  - Implemented three-section menu structure (Root, Studio, Keeper)
  - Added hierarchical navigation with expand/collapse functionality
  - Created `PublicLayout.tsx` for unauthenticated routes
  - Updated `AppLayout.tsx` to use sidebar instead of top navbar
  - Added proper active state management and visual feedback
  - Integrated user profile and logout functionality
  - Applied consistent Keeper UI styling (minimal, soft shadows, Tailwind)
  - Added Heroicons for consistent iconography
  - Implemented responsive design for mobile compatibility

### Navigation Features Implemented:
- ✅ Collapsible sidebar with toggle button
- ✅ Section-based organization (Root/Studio/Keeper)
- ✅ Expandable/collapsible submenus
- ✅ Active route highlighting
- ✅ User profile integration
- ✅ Logout functionality
- ✅ Mobile-responsive design
- ✅ Consistent styling with platform theme
- ✅ Deep linking support for all routes
- ✅ Legacy route compatibility maintained 