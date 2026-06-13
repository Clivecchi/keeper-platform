# Types

## 📌 Purpose
Central location for TypeScript type definitions and interfaces used throughout the Keeper platform. This ensures type safety and consistency across all components and services.

## 🧱 Key Files
- `kip.ts` - Types for KIP (Keeper Intelligence Platform) agents and AI-related functionality
- `viewMode.ts` - ViewMode system types for contextual navigation
- `keeper.ts` - Keeper management and memory architecture types
- `props.ts` - Shared prop payload types (e.g., LinkedCard props for frames/dialogue)

## 🔄 Data & Behavior

### ViewMode Types (`viewMode.ts`)
Defines the platform-wide ViewMode system that enables contextual user interfaces:

```typescript
enum ViewMode {
  Architect = 'Design Build',    // Platform configuration and keeper design
  MyKeeper = 'My Keeper',        // Personal keeper interaction
  Admin = 'System Admin'         // System administration
}

interface ViewModeContextType {
  currentMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isMode: (mode: ViewMode) => boolean;
}
```

**Key Features:**
- Enum-based ViewMode definition for type safety
- Context interface for React state management
- Persistent state type for localStorage integration

### Keeper Types (`keeper.ts`)
Comprehensive type definitions for the Keeper memory architecture:

#### Core Entities:
```typescript
interface Keeper {
  id: string;
  title: string;
  purpose: string;
  keeperTypeId?: string;
  keeperType?: string;        // Direct keeper type assignment
  memoryPattern?: string;     // Memory organization pattern
  ownerId: string;
  theme_id?: string;
  // ... relations and metadata
}

interface KeeperType {
  id: string;
  name: string;
  _count?: { Keeper: number };
}

interface EngagementTemplate {
  id: string;
  label: string;
  slug: string;
  type: string;
  targetType: string;
  // ... configuration and styling
}
```

#### API Response Types:
- `KeeperApiResponse<T>` - Generic API response wrapper
- `KeeperListResponse` - Multiple keepers response
- `KeeperResponse` - Single keeper response
- `CreateKeeperRequest` - Keeper creation payload
- `UpdateKeeperRequest` - Keeper update payload

#### Memory Architecture Types:
- `Journey` - User journey through keeper content
- `Path` - Specific paths within journeys
- `Moment` - Individual memory/content moments
- `Theme` - Visual and interaction themes

### KIP Types (`kip.ts`)
AI agent and intelligence platform types:

```typescript
interface KipAgent {
  id: string;
  slug: string;
  name: string;
  purpose: string;
  model: string;
  role: string;
  permissions: string[];
  // ... configuration and settings
}
```

### Prop Types (`props.ts`)
Defines portable prop payload shapes so renderers and runtime UIs can share a single contract.

```typescript
type LinkedCardEntityType =
  | 'journey'
  | 'keeper'
  | 'moment'
  | 'board'
  | 'frame'
  | 'theme'
  | 'domain'
  | 'agent';

interface LinkedCardProps {
  entityType: LinkedCardEntityType;
  entityId: string;
  title: string;
  subtitle?: string;
  description?: string;
  href: string;
  icon?: string;
  color?: string;
  preview?: {
    image?: string;
    date?: string;
    snippet?: string;
  };
}
```

**Key Features:**
- Centralizes the LinkedCard payload so database seeds, PropRenderer, and Kip Agent UI share the same keys.
- Enumerates valid entity types to prevent typos between boards (`journey`, `keeper`, `agent`, etc.).
- Supports optional preview metadata without forcing UI surfaces to implement every field.

## ⚠️ Notes & ToDo
- [x] Implement ViewMode system types with enum-based approach
- [x] Create comprehensive Keeper architecture types
- [x] Define API response and request types for type safety
- [x] Add memory pattern and engagement template types
- [ ] Add validation schemas using Zod for runtime type checking
- [ ] Implement discriminated unions for different keeper types
- [ ] Add GraphQL schema integration types
- [ ] Create utility types for type transformations

## 📆 Update Log

### 2025-12-09 - LinkedCard Prop Types
- **Added**: `props.ts` with `LinkedCardProps`, preview metadata shape, and `LinkedCardEntityType` union.
- **Purpose**: Align database seed data, PropRenderer, and Kip Agent UI on a single type-safe contract for `linked_card` props.

### 2024-01-XX - ViewMode & Keeper Types Implementation
- **Added**: `viewMode.ts` with ViewMode enum and context types
- **Added**: `keeper.ts` with comprehensive Keeper architecture types
- **Added**: API response and request types for Keeper management
- **Added**: Memory pattern types (SOLE, Journal, Tracker, Palace)
- **Added**: Engagement template and field types
- **Added**: Journey, Path, and Moment types for memory organization
- **Enhanced**: Type safety across all Keeper-related operations
- **Added**: Generic API response wrapper types

### Type System Improvements:
- **Consistent Naming**: All types follow consistent naming conventions
- **Optional Properties**: Proper use of optional properties for flexible APIs
- **Generic Types**: Reusable generic types for API responses
- **Enum Integration**: ViewMode enum for compile-time safety
- **Relationship Types**: Proper typing for database relationships

### Integration Points:
- **React Context**: Types for ViewMode context provider
- **API Services**: Request/response types for all Keeper APIs
- **Component Props**: Interface types for all React components
- **State Management**: Types for local component state
- **LocalStorage**: Serializable types for persistent storage 