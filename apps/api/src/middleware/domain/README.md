# Domain Middleware

## 📌 Purpose
Core middleware functions for domain-based request handling in the Keeper platform. Provides authentication, authorization, and domain context resolution using the new domain architecture with DomainServiceFactory and DomainError.

## 🧱 Key Files
- `index.ts` - Main exports and types
- `resolveDomainContext.ts` - Domain context resolution middleware
- `requireAuth.ts` - Authentication middleware
- `requireDomainPermission.ts` - Domain permission checking middleware
- `requireMemoryAccess.ts` - Memory access control middleware
- `utils.ts` - Utility functions for domain extraction and validation
- `pipeline.ts` - Pipeline utilities for chaining middleware

## 🔄 Data & Behavior

### Domain Context Resolution
The `resolveDomainContext` middleware extracts domain identifiers from requests using multiple strategies:
- **param**: URL parameters (`/api/domain/:domainId`)
- **subdomain**: Hostname subdomains (`subdomain.domain.com`)
- **header**: HTTP headers (`X-Domain-Id`)
- **query**: Query parameters (`?domainId=...`)

### Authentication
The `requireAuth` middleware ensures users are authenticated before accessing protected resources. Uses type-safe request casting with `AuthenticatedRequest`.

### Permission Checking
The `requireDomainPermission` middleware validates user permissions:
- **read**: View domain resources
- **write**: Modify domain resources
- **admin**: Administrative operations
- **owner**: Full ownership rights
- **share**: Share domain resources
- **invite**: Invite users to domain
- **delete**: Delete domain resources

### Memory Access Control
The `requireMemoryAccess` middleware controls access to domain memory:
- Checks user permissions for memory operations
- Validates memory quotas and usage limits
- Logs memory access for audit trails
- Supports different access levels (read, write, admin)

### Pipeline Utilities
Common middleware combinations for easy use:
- `createBasicDomainGuard`: Domain + Auth + Read
- `createWriteDomainGuard`: Domain + Auth + Write
- `createAdminDomainGuard`: Domain + Auth + Admin
- `createMemoryAccessGuard`: Domain + Auth + Memory
- `createFullDomainMemoryGuard`: Everything enabled

## 🎯 Usage Examples

### Basic Domain Guard
```typescript
import { createBasicDomainGuard } from './middleware/domain';

// Apply to route requiring domain context and read access
app.get('/api/domain/:domainId/data', 
  ...createBasicDomainGuard('param'),
  handleGetData
);
```

### Custom Permission Chain
```typescript
import { 
  resolveDomainContext, 
  requireAuth, 
  requireDomainPermission 
} from './middleware/domain';

// Custom middleware chain
app.post('/api/domain/:domainId/settings',
  resolveDomainContext('param'),
  requireAuth(),
  requireDomainPermission(['admin']),
  handleUpdateSettings
);
```

### Memory Access Guard
```typescript
import { createMemoryAccessGuard } from './middleware/domain';

// Memory write access
app.post('/api/domain/:domainId/memory',
  ...createMemoryAccessGuard('param', 'write'),
  handleMemoryWrite
);
```

### Full Domain + Memory Pipeline
```typescript
import { createFullDomainMemoryGuard } from './middleware/domain';

// Complete protection with memory access
app.put('/api/domain/:domainId/memory/:memoryId',
  ...createFullDomainMemoryGuard('param', ['write'], 'write'),
  handleMemoryUpdate
);
```

## 🔧 Configuration

### Domain Resolution Config
```typescript
const config = {
  strategy: 'param',
  required: true,
  fallbackStrategy: 'header'
};
```

### Permission Config
```typescript
const permissionConfig = {
  allowOwnerBypass: true,
  cacheTtl: 300,
  includeImplicitPermissions: true
};
```

### Memory Access Config
```typescript
const memoryConfig = {
  checkQuota: true,
  quotaBypass: false,
  logAccess: true,
  requireDomainContext: true
};
```

## 🎨 Service Integration

### DomainServiceFactory
All middleware uses the DomainServiceFactory for consistent service access:
- `createDomainService()` - Domain operations
- `createMemoryService()` - Memory operations
- `createDomainContextService()` - Domain-scoped state

### DomainError
Consistent error handling across all middleware:
- `AuthRequired()` - Authentication errors
- `DomainNotFound()` - Domain resolution errors
- `InsufficientPermissions()` - Permission errors
- `MemoryAccessDenied()` - Memory access errors

### Type Safety
All middleware uses type-safe request casting:
- `AuthenticatedRequest` - Includes user and domain context
- Proper TypeScript types for all parameters
- Compile-time validation of middleware chains

## ⚠️ Notes & ToDo

### Error Handling
- All middleware returns consistent JSON error responses
- HTTP status codes follow REST conventions
- Debug headers added for troubleshooting

### Performance
- Domain context cached using DomainCacheService
- Permission checks cached with configurable TTL
- Memory access logging is asynchronous

### Security
- Owner bypass can be disabled per endpoint
- Memory quota limits enforced
- Audit logging for sensitive operations
- Rate limiting integration points available

### Testing
- Unit tests needed for all middleware functions
- Integration tests for pipeline combinations
- Mock services for testing isolation

## 📆 Update Log

### 2025-01-XX - Initial Implementation
- Created core domain middleware architecture
- Implemented resolveDomainContext with multiple strategies
- Added requireAuth with type-safe request casting
- Built requireDomainPermission with implicit permissions
- Created requireMemoryAccess with quota checking
- Added pipeline utilities for common patterns
- Integrated DomainServiceFactory and DomainError
- Added comprehensive documentation and examples 