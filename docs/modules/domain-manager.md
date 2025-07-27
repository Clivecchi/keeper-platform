# Domain Manager Components

## 📌 Purpose
Unified domain management interface for both user and admin scopes, providing consistent search, list, and detail views with modern UI design.

## 🧱 Key Files
- `DomainManager.tsx` - Main unified domain management component
- `DomainDetailForm.tsx` - Comprehensive domain editing and creation form
- `types.ts` - Shared type definitions
- `DomainListPane.tsx` - Legacy list component (deprecated)
- `DomainDetailCard.tsx` - Legacy detail component (deprecated)
- `DomainDetailModal.tsx` - Legacy modal component (deprecated)

## 🔄 Data & Behavior

### DomainManager
- **Unified Interface**: Single component for both user and admin domain management
- **Scope-based**: Adapts behavior based on `scope` prop ('user' | 'admin')
- **Search & Filter**: Real-time search with debouncing for admin scope
- **List & Detail**: Split-pane layout with domain list and detail form
- **Create & Edit**: Modal-based domain creation and inline editing
- **Error Handling**: Comprehensive error states and user feedback

### DomainDetailForm
- **Multi-purpose**: Handles both editing existing domains and creating new ones
- **Permission-aware**: Shows/hides fields based on user permissions
- **Custom Domain Management**: Owner-only custom domain configuration
- **Admin Actions**: Platform-level domain administration (suspend, archive)
- **Validation**: Client-side validation with clear error messages

### Key Features
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Full theme compatibility
- **Loading States**: Proper loading indicators and skeleton states
- **Success/Error Feedback**: Toast-style message display
- **Keyboard Navigation**: Full keyboard accessibility
- **Animation**: Smooth transitions using Framer Motion

## 🎨 UI/UX Design

### Design Principles
- **Consistency**: Same interface across user and admin scopes
- **Clarity**: Clear visual hierarchy and information architecture
- **Efficiency**: Streamlined workflows for common tasks
- **Accessibility**: WCAG compliant with proper ARIA labels
- **Modern**: Contemporary design with proper spacing and typography

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header (Title + Actions)                               │
├─────────────────────────────────────────────────────────┤
│ Search Bar + Add Button                                │
├─────────────────────────────────────────────────────────┤
│ Error Messages (if any)                                │
├─────────────┬───────────────────────────────────────────┤
│ Domain List │ Domain Detail Form                       │
│ (320px)     │ (Flexible)                              │
│             │                                          │
│             │                                          │
└─────────────┴───────────────────────────────────────────┘
```

### Color Scheme
- **Primary**: Brand colors for main actions
- **Success**: Green for verified states and successful actions
- **Warning**: Yellow/Orange for pending states
- **Error**: Red for errors and destructive actions
- **Neutral**: Gray scale for text and borders

## 🔧 Usage Examples

### User Domain Management
```tsx
<DomainManager scope="user" allowCreate={true} />
```

### Admin Domain Management
```tsx
<DomainManager scope="admin" allowCreate={true} />
```

### With Custom Close Handler
```tsx
<DomainManager 
  scope="user" 
  allowCreate={true}
  onClose={() => setShowDomainManager(false)}
/>
```

## 📊 Data Flow

### Domain Loading
1. Component mounts → `fetchDomains()` called
2. API request to `/api/domains/my` (user) or `/api/admin/domains` (admin)
3. Response processed and stored in state
4. First domain auto-selected if none specified

### Search & Filtering
1. User types in search field
2. Debounced search (300ms delay for admin scope)
3. API request with search parameters
4. Results filtered and displayed

### Domain Operations
1. **Create**: Modal form → API POST → List refresh
2. **Update**: Inline form → API PUT → List refresh
3. **Delete**: Confirmation → API DELETE → List refresh
4. **Custom Domain**: Owner-only → Separate API endpoints

## ⚠️ Notes & ToDo

### Completed
- [x] Unified domain management interface
- [x] Modern UI with proper theming
- [x] Comprehensive error handling
- [x] Permission-based field visibility
- [x] Responsive design implementation
- [x] Animation and transitions
- [x] TypeScript type safety

### Pending
- [ ] Add domain member management
- [ ] Implement domain analytics
- [ ] Add bulk domain operations
- [ ] Enhanced search filters
- [ ] Domain import/export functionality
- [ ] Audit trail for domain changes

### Legacy Components
The following components are deprecated and should be replaced:
- `DomainListPane.tsx` - Replaced by DomainManager list view
- `DomainDetailCard.tsx` - Replaced by DomainDetailForm
- `DomainDetailModal.tsx` - Replaced by DomainManager modal

## 📆 Update Log

### 2025-01-21
- Created unified DomainManager component
- Implemented DomainDetailForm with comprehensive editing
- Added proper TypeScript types and interfaces
- Replaced legacy domain management in user dashboard and admin pages
- Added modern UI with Framer Motion animations
- Implemented proper error handling and user feedback
- Added responsive design and dark mode support 