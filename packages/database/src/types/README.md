# Database Types

## 📌 Purpose
This folder contains TypeScript type definitions for database-related functionality, including domain context types, permission systems, and request/response interfaces for the Keeper platform.

## 🧱 Key Files
- `domain.ts` - Domain context and authentication types
- `ssl.ts` - SSL certificate and security types
- `README.md` - This documentation file

## 🔄 Data & Behavior

### Domain Context Types (`domain.ts`)
Core types for domain-scoped operations and authentication:

#### Authentication & Context:
```typescript
interface DomainContext {
  id: string;
  name: string;
  ownerId: string;
  settings: Record<string, any>;
}

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string | null;
    name?: string | null;
    role?: string | null;
  };
  domainContext?: DomainContext;
}
```

**Key Features:**
- **Domain Context**: Provides domain-scoped information including owner and settings
- **Authenticated Request**: Extends Express Request with user and domain context
- **Type Safety**: Strong typing for middleware and route handlers

#### Permission System Types:
```typescript
type DomainRole = 'admin' | 'user' | 'friend' | 'connection';
type DomainPermissionType = 'read' | 'write' | 'share' | 'admin' | 'invite' | 'delete';

interface DomainPermissionSummary {
  userId: string;
  role: DomainRole;
  permissions: DomainPermissionType[];
  grantedAt: Date;
  expiresAt?: Date | null;
  isOwner: boolean;
}
```

**Permission Features:**
- **Role-based Access**: Hierarchical role system (admin > user > friend > connection)
- **Granular Permissions**: Specific action-based permissions
- **Temporal Control**: Permission expiration and grant tracking
- **Ownership Recognition**: Built-in owner privilege detection

#### Request/Response Types:
```typescript
interface GrantPermissionRequest {
  domainId: string;
  userId: string;
  role: DomainRole;
  permissions?: DomainPermissionType[];
  grantedBy: string;
  expiresAt?: Date;
}

interface PermissionCheck {
  userId: string;
  domainId: string;
  permission: DomainPermissionType;
}
```

### SSL Types (`ssl.ts`)
SSL certificate and security configuration types for domain verification and secure connections.

## ⚠️ Notes & ToDo
- [x] Domain context types for request authentication
- [x] Comprehensive permission system with roles and actions
- [x] Request/response types for API endpoints
- [x] Temporal permission controls with expiration
- [ ] Add validation schemas using Zod for runtime type checking
- [ ] Implement discriminated unions for different domain types
- [ ] Add audit trail types for permission changes
- [ ] Create utility types for permission inheritance

## 📆 Update Log
- **2025-01-11**: Added DomainContext and AuthenticatedRequest types for domain-scoped operations
- **2025-01-11**: Enhanced Express Request interface with user and domain context support
- **2025-01-11**: Implemented strongly typed request extensions for middleware compatibility 