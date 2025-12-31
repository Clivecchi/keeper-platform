# Error Handling Library

## 📌 Purpose
This folder contains error handling classes and utilities for consistent error management across the API application. The primary focus is domain-level error handling with standardized error codes and HTTP status mappings.

## 🧱 Key Files
- `DomainError.ts` - Comprehensive domain error class with static helpers
- `README.md` - This documentation file

## 🔄 Data & Behavior

### DomainError Class (`DomainError.ts`)
Centralized error handling for domain-scoped operations:

#### Core Structure:
```typescript
class DomainError extends Error {
  code: string;           // Error code (e.g., 'AUTH_REQUIRED')
  statusCode: number;     // HTTP status code
  details?: any;          // Additional error context
  timestamp: Date;        // When error occurred
}
```

#### Authentication Errors (401):
```typescript
DomainError.AuthRequired()           // Authentication required
DomainError.InvalidToken()           // Invalid or expired token
DomainError.SessionExpired()         // Session has expired
```

#### Authorization Errors (403):
```typescript
DomainError.AccessDenied()           // Access denied
DomainError.InsufficientPermissions() // Insufficient permissions
DomainError.OwnerRequired()          // Owner access required
DomainError.AdminRequired()          // Administrator access required
```

#### Not Found Errors (404):
```typescript
DomainError.DomainNotFound(domainId)    // Domain not found
DomainError.UserNotFound(userId)        // User not found
DomainError.ResourceNotFound(type, id)  // Generic resource not found
```

#### Validation Errors (400):
```typescript
DomainError.InvalidRequest()         // Invalid request
DomainError.InvalidDomainId(id)      // Invalid domain ID format
DomainError.InvalidSlug(slug)        // Invalid slug format
DomainError.ValidationFailed(field, msg) // Field validation failed
DomainError.MissingRequired(field)   // Required field missing
```

#### Conflict Errors (409):
```typescript
DomainError.DomainExists(identifier) // Domain already exists
DomainError.SlugTaken(slug)         // Slug already taken
DomainError.ResourceConflict(msg)   // Generic resource conflict
```

#### Rate Limiting & Quota Errors (429):
```typescript
DomainError.RateLimited()           // Rate limit exceeded
DomainError.MemoryQuotaExceeded()   // Memory quota exceeded
DomainError.UserLimitExceeded()     // User limit exceeded
DomainError.KeeperLimitExceeded()   // Keeper limit exceeded
```

#### Server Errors (500+):
```typescript
DomainError.ServiceUnavailable()    // Service unavailable (503)
DomainError.DatabaseError()         // Database operation failed
DomainError.CacheError()            // Cache operation failed
DomainError.ExternalServiceError()  // External service error (502)
DomainError.InternalError()         // Internal server error
```

#### Domain-Specific Errors:
```typescript
DomainError.DomainInactive()        // Domain is inactive
DomainError.CustomDomainNotVerified() // Custom domain not verified
DomainError.PermissionExpired()     // Permission has expired
DomainError.FeatureDisabled()       // Feature is disabled
```

#### Memory-Specific Errors:
```typescript
DomainError.MemoryIsolationError()  // Memory isolation error
DomainError.MemoryAccessDenied()    // Memory access denied
DomainError.MemoryCorrupted()       // Memory data corrupted
```

### Utility Methods:
```typescript
// Type checking
DomainError.isDomainError(error)    // Check if error is DomainError
DomainError.isErrorCode(error, code) // Check specific error code
error.isClientError()               // Check if 4xx error
error.isServerError()               // Check if 5xx error

// Error conversion
DomainError.fromError(error)        // Convert unknown error to DomainError
error.toJSON()                      // Convert to API response format
```

### Usage Examples:

#### In Middleware:
```typescript
import { DomainError } from '../lib/errors/DomainError';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    throw DomainError.AuthRequired();
  }
  next();
}

export function requireDomainAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.domainContext) {
    throw DomainError.DomainNotFound();
  }
  
  if (!hasPermission(req.user, req.domainContext, 'read')) {
    throw DomainError.AccessDenied();
  }
  
  next();
}
```

#### In Route Handlers:
```typescript
import { DomainError } from '../lib/errors/DomainError';

export async function createDomain(req: Request, res: Response) {
  try {
    const { slug } = req.body;
    
    if (!slug) {
      throw DomainError.MissingRequired('slug');
    }
    
    if (!validateSlug(slug)) {
      throw DomainError.InvalidSlug(slug);
    }
    
    const existingDomain = await domainService.findBySlug(slug);
    if (existingDomain) {
      throw DomainError.SlugTaken(slug);
    }
    
    const domain = await domainService.create(req.body);
    res.json(domain);
    
  } catch (error) {
    if (DomainError.isDomainError(error)) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    const domainError = DomainError.fromError(error);
    res.status(domainError.statusCode).json(domainError.toJSON());
  }
}
```

#### Error Response Format:
```json
{
  "error": "DOMAIN_NOT_FOUND",
  "message": "Domain with ID \"abc123\" not found",
  "statusCode": 404,
  "timestamp": "2025-01-11T10:30:00.000Z",
  "details": {
    "domainId": "abc123"
  }
}
```

## ⚠️ Notes & ToDo
- [x] Comprehensive error class with static helpers
- [x] Proper HTTP status code mapping
- [x] JSON serialization for API responses
- [x] Type guards and utility methods
- [x] Domain-specific error codes
- [x] Memory-specific error handling
- [ ] Add error logging and metrics integration
- [ ] Add error recovery strategies
- [ ] Add internationalization support for error messages
- [ ] Add error code documentation generation

## 📆 Update Log
- **2025-01-11**: Created DomainError class with comprehensive static helpers
- **2025-01-11**: Added authentication, authorization, and validation error types
- **2025-01-11**: Implemented quota and rate limiting error support
- **2025-01-11**: Added domain-specific and memory-specific error handling
- **2025-01-11**: Added utility methods for error type checking and conversion 