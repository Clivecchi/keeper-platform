# API Utils

## 📌 Purpose
This folder contains utility functions and helper modules used throughout the API application. These utilities provide centralized logic for common operations like domain parsing, validation, and context extraction.

## 🧱 Key Files
- `domain.ts` - Domain context utilities and validation functions
- `audit.ts` - Audit logging for board operations (NEW)
- `requestLog.ts` - Request logging utilities
- `LogStore.ts` - Log storage and retrieval
- `README.md` - This documentation file

## 🔄 Data & Behavior

### Domain Utilities (`domain.ts`)
Centralized domain parsing and validation logic for the Keeper platform:

#### Core Functions:
```typescript
// Extract subdomain from hostname
extractSubdomain(hostname: string): string | undefined

// Extract domain ID from request using different strategies
extractDomainId(req: Request, strategy: 'subdomain' | 'header' | 'param' | 'query'): string | undefined

// Validate if a string is a valid UUID (v4)
validateDomainId(id: string): boolean

// Validate if a string is a valid domain slug
validateDomainSlug(slug: string): boolean
```

#### Advanced Features:
```typescript
// Extract domain with fallback strategies
extractDomainWithFallback(req: Request, strategies: string[]): string | undefined

// Comprehensive domain context extraction
extractDomainContext(req: Request): DomainExtractionResult | null

// Create domain validation middleware helper
createDomainValidator(options: ValidationOptions): ValidationFunction
```

### Domain Extraction Strategies:
1. **Subdomain Strategy**: Extracts domain from subdomain (e.g., `myapp.keeper.com` → `myapp`)
2. **Header Strategy**: Extracts from `X-Domain-ID` or `domain-id` headers
3. **Parameter Strategy**: Extracts from URL parameters (`domainId`, `domain_id`, `domain`)
4. **Query Strategy**: Extracts from query parameters

### Validation Features:
- **UUID Validation**: Validates UUIDs using v4 format
- **Slug Validation**: Validates domain slugs (3-63 chars, alphanumeric, hyphens, underscores)
- **Subdomain Validation**: Validates subdomain format and characters
- **Fallback Support**: Multiple extraction strategies with fallback logic

### Usage Examples:
```typescript
import { extractDomainId, validateDomainId, extractDomainContext } from '../utils/domain';

// Basic domain extraction
const domainId = extractDomainId(req, 'param');

// UUID validation
const isValidUUID = validateDomainId('550e8400-e29b-41d4-a716-446655440000');

// Comprehensive extraction with context
const context = extractDomainContext(req);
if (context) {
  console.log(`Domain: ${context.domainId}, Strategy: ${context.strategy}`);
}

// Middleware validation
const validator = createDomainValidator({ requireUUID: true });
const result = validator(req);
```

## ⚠️ Notes & ToDo
- [x] Domain ID extraction with multiple strategies
- [x] UUID v4 validation for domain IDs
- [x] Subdomain extraction and validation
- [x] Comprehensive domain context parsing
- [x] Fallback strategy support
- [ ] Add domain caching utilities
- [ ] Add domain resolution performance metrics
- [ ] Consider adding custom domain validation
- [ ] Add unit tests for all utility functions

## 📆 Update Log
- **2025-11-09**: Added `audit.ts` for board operation audit logging. Includes `logAudit()` and `computeHash()` utilities. Logs to console and DomainAudit table.
- **2025-01-11**: Created domain.ts with core extraction and validation functions
- **2025-01-11**: Added UUID validation and subdomain parsing capabilities
- **2025-01-11**: Implemented comprehensive domain context extraction with fallback strategies
- **2025-01-11**: Added domain validation middleware helper functions 