# 🏰 Domain Layer Implementation

## 🎯 Overview

The Domain Layer transforms Keeper from a single-tenant application into a **multi-domain platform** where domains serve as the primary permission and identity boundaries. This enables custom domain support, granular sharing controls, and prepares the platform for self-hosted deployments.

## 🚀 Key Objectives

### Immediate Goals
- **Custom Domain Support**: Users can configure `myfamily.com` → Keeper domain
- **Dynamic CORS**: Replace hardcoded origins with database-driven validation
- **Domain-Scoped Permissions**: All content (Keepers, Journeys, Moments) inherits domain access rules
- **SOLE Memory Isolation**: AI agents operate within domain-specific memory boundaries

### Long-Term Vision
- **Self-Hosting Ready**: Export/import domains for independent deployments
- **Enterprise Features**: Multi-domain organizations with hierarchical permissions
- **Cross-Domain Collaboration**: Secure sharing between trusted domains

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Custom Domain │───▶│  Domain Layer   │───▶│  Content Access │
│   myfamily.com  │    │  - Validation   │    │  - Keepers      │
│                 │    │  - Permissions  │    │  - Journeys     │
│                 │    │  - CORS         │    │  - Moments      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └─────────────▶│  SOLE Memory    │◀─────────────┘
                        │  - Domain-bound │
                        │  - Agent context│
                        │  - Isolation    │
                        └─────────────────┘
```

## 📊 Database Schema

### Core Domain Model

```prisma
model Domain {
  id                    String   @id @default(uuid())
  name                  String   @unique
  slug                  String   @unique
  slugHistory           String[] // Track slug changes for redirects
  
  // Custom Domain Configuration
  customDomain          String?  @unique
  customDomainVerified  Boolean  @default(false)
  verificationToken     String?  @unique
  verificationMethod    String?  // 'DNS_TXT' | 'CNAME' | 'FILE'
  verifiedAt           DateTime?
  
  // Lifecycle & Status
  status               String   @default("active") // 'active' | 'suspended' | 'archived' | 'pending'
  suspendedAt          DateTime?
  suspendedBy          String?
  suspensionReason     String?
  
  // Features & Limits
  features             Json?    // { "kip_enabled": true, "custom_themes": false }
  limits               Json?    // { "max_keepers": 50, "max_users": 10 }
  subscription         String?  // For premium domains
  
  // Discovery & Visibility
  isPublic             Boolean  @default(false)  // Can be discovered
  description          String?
  allowRequests        Boolean  @default(false)  // Allow join requests
  categories           String[] // ['family', 'team', 'creative']
  
  // Ownership & Metadata
  ownerId              String
  owner                User     @relation(fields: [ownerId], references: [id])
  isActive             Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  theme                Json?
  settings             Json?
  
  // Relations
  keepers              Keeper[]
  journeys             Journey[]
  permissions          DomainPermission[]
  usageStats           DomainUsage[]
  invitations          DomainInvitation[]
  crossDomainShares    CrossDomainShare[] @relation("SharedFrom")
  receivedShares       CrossDomainShare[] @relation("SharedTo")
  soleMemoryScopes     SoleMemoryScope[]
  transfersOut         DomainTransfer[]   @relation("TransferFrom")
  transfersIn          DomainTransfer[]   @relation("TransferTo")
}
```

### Permission System

```prisma
model DomainPermission {
  id           String   @id @default(uuid())
  domainId     String
  userId       String
  role         String   // 'admin' | 'user' | 'friend' | 'connection'
  permissions  String[] // ['read', 'write', 'share', 'admin']
  grantedBy    String
  grantedAt    DateTime @default(now())
  expiresAt    DateTime?
  
  domain       Domain   @relation(fields: [domainId], references: [id])
  user         User     @relation(fields: [userId], references: [id])
  grantor      User     @relation("GrantedPermissions", fields: [grantedBy], references: [id])
  
  @@unique([domainId, userId])
}
```

### Cross-Domain Sharing

```prisma
model CrossDomainShare {
  id               String   @id @default(uuid())
  sourceDomainId   String
  targetDomainId   String
  contentType      String   // 'keeper' | 'journey' | 'moment'
  contentId        String
  permissions      String[] // ['view', 'edit', 'comment']
  
  // Advanced Features
  expiresAt        DateTime? // Time-limited shares
  allowSubsharing  Boolean   @default(false) // Can recipient share further?
  requireApproval  Boolean   @default(true)  // Must target domain approve?
  approvedAt       DateTime?
  approvedBy       String?
  
  sourceDomain     Domain   @relation("SharedFrom", fields: [sourceDomainId], references: [id])
  targetDomain     Domain   @relation("SharedTo", fields: [targetDomainId], references: [id])
  
  @@unique([sourceDomainId, targetDomainId, contentType, contentId])
}
```

### Domain Invitations

```prisma
model DomainInvitation {
  id         String   @id @default(uuid())
  domainId   String
  email      String
  role       String   // 'admin' | 'user' | 'friend'
  invitedBy  String
  token      String   @unique
  expiresAt  DateTime
  acceptedAt DateTime?
  
  domain     Domain   @relation(fields: [domainId], references: [id])
  inviter    User     @relation(fields: [invitedBy], references: [id])
  
  @@unique([domainId, email])
}
```

### Usage Analytics

```prisma
model DomainUsage {
  id           String   @id @default(uuid())
  domainId     String
  userId       String?
  action       String   // 'login', 'create_keeper', 'kip_interaction'
  metadata     Json?
  timestamp    DateTime @default(now())
  ipAddress    String?
  userAgent    String?
  
  domain       Domain   @relation(fields: [domainId], references: [id])
  user         User?    @relation(fields: [userId], references: [id])
  
  @@index([domainId, timestamp])
  @@index([action])
}
```

### SOLE Memory Isolation

```prisma
model SoleMemoryScope {
  id         String   @id @default(uuid())
  domainId   String
  agentId    String
  memoryData Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  domain     Domain   @relation(fields: [domainId], references: [id])
  
  @@unique([domainId, agentId])
}
```

### Domain Transfers

```prisma
model DomainTransfer {
  id              String   @id @default(uuid())
  domainId        String
  fromOwnerId     String
  toOwnerId       String
  token           String   @unique
  initiatedAt     DateTime @default(now())
  expiresAt       DateTime
  approvedAt      DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?
  
  domain          Domain   @relation(fields: [domainId], references: [id])
  fromOwner       User     @relation("TransferFrom", fields: [fromOwnerId], references: [id])
  toOwner         User     @relation("TransferTo", fields: [toOwnerId], references: [id])
}
```

## 🔧 Core Services

### 1. Domain Resolution Service

```typescript
interface DomainResolutionService {
  // Primary resolution methods
  resolveDomainByHostname(hostname: string): Promise<Domain | null>;
  resolveDomainBySlug(slug: string): Promise<Domain | null>;
  
  // Validation & verification
  validateCustomDomain(domain: string): Promise<boolean>;
  verifyDomainOwnership(domainId: string, method: VerificationMethod): Promise<boolean>;
  
  // Caching
  cacheDomain(domain: Domain): void;
  invalidateDomainCache(domainId: string): void;
}
```

### 2. Domain Permission Service

```typescript
interface DomainPermissionService {
  // Permission checks
  hasPermission(userId: string, domainId: string, permission: string): Promise<boolean>;
  getUserRole(userId: string, domainId: string): Promise<string | null>;
  
  // Permission management
  grantPermission(domainId: string, userId: string, role: string, grantedBy: string): Promise<void>;
  revokePermission(domainId: string, userId: string): Promise<void>;
  
  // Bulk operations
  getDomainUsers(domainId: string): Promise<DomainUser[]>;
  getUserDomains(userId: string): Promise<Domain[]>;
}
```

### 3. Cross-Domain Sharing Service

```typescript
interface CrossDomainSharingService {
  // Share management
  createShare(sourceDomainId: string, targetDomainId: string, content: SharedContent): Promise<CrossDomainShare>;
  approveShare(shareId: string, approvedBy: string): Promise<void>;
  revokeShare(shareId: string): Promise<void>;
  
  // Share discovery
  getIncomingShares(domainId: string): Promise<CrossDomainShare[]>;
  getOutgoingShares(domainId: string): Promise<CrossDomainShare[]>;
}
```

### 4. Domain Middleware

```typescript
interface DomainMiddleware {
  // Request processing
  resolveDomainContext(req: Request): Promise<DomainContext>;
  validateDomainAccess(req: Request, requiredPermission: string): Promise<boolean>;
  
  // CORS handling
  setCORSHeaders(res: Response, domain: Domain): void;
  validateOrigin(origin: string, domain: Domain): boolean;
  
  // Security
  setSecurityHeaders(res: Response, domain: Domain): void;
  enforceRateLimit(req: Request, domain: Domain): Promise<boolean>;
}
```

## 🔐 Security Considerations

### Reserved Slugs Protection

```typescript
const RESERVED_SLUGS = [
  'kip', 'studio', 'admin', 'builder', 'api', 'www', 'mail', 
  'ftp', 'localhost', 'test', 'dev', 'staging', 'app', 'dashboard'
];

function validateSlug(slug: string): boolean {
  return !RESERVED_SLUGS.includes(slug.toLowerCase());
}
```

### Domain Verification Methods

1. **DNS_TXT**: Add TXT record with verification token
2. **CNAME**: Point subdomain to verification endpoint
3. **FILE**: Upload verification file to domain root

### Rate Limiting Strategy

```typescript
interface RateLimitConfig {
  domain: {
    requests: number;
    window: number; // seconds
  };
  user: {
    requests: number;
    window: number;
  };
  anonymous: {
    requests: number;
    window: number;
  };
}
```

## 📈 Performance Optimization

### Caching Strategy

```typescript
interface DomainCache {
  // L1 Cache: In-memory (Redis)
  domainByHostname: Map<string, Domain>;
  domainBySlug: Map<string, Domain>;
  userPermissions: Map<string, DomainPermission[]>;
  
  // L2 Cache: Database query optimization
  batchLoadDomains(hostnames: string[]): Promise<Domain[]>;
  preloadUserDomains(userId: string): Promise<void>;
  
  // Cache invalidation
  invalidatePattern(pattern: string): void;
  warmUpCache(): Promise<void>;
}
```

### Database Indexing

```sql
-- Critical indexes for performance
CREATE INDEX idx_domain_custom_domain ON Domain(customDomain) WHERE customDomainVerified = true;
CREATE INDEX idx_domain_slug ON Domain(slug) WHERE isActive = true;
CREATE INDEX idx_domain_permissions_user ON DomainPermission(userId, domainId);
CREATE INDEX idx_domain_usage_analytics ON DomainUsage(domainId, timestamp DESC);
CREATE INDEX idx_cross_domain_share_target ON CrossDomainShare(targetDomainId, approvedAt);
```

## 🚦 Error Handling

### Domain Resolution Errors

```typescript
enum DomainErrorType {
  DOMAIN_NOT_FOUND = 'DOMAIN_NOT_FOUND',
  DOMAIN_SUSPENDED = 'DOMAIN_SUSPENDED',
  DOMAIN_UNVERIFIED = 'DOMAIN_UNVERIFIED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMITED = 'RATE_LIMITED'
}

interface DomainErrorHandler {
  handleError(error: DomainErrorType, context: DomainContext): Response;
}
```

### Fallback Strategies

```typescript
interface DomainFallbackStrategy {
  // When domain not found
  onDomainNotFound(hostname: string): {
    action: 'redirect_to_default' | 'show_404' | 'redirect_to_signup';
    redirectUrl?: string;
  };
  
  // When domain suspended
  onDomainSuspended(domain: Domain): {
    action: 'show_suspension_page' | 'redirect_to_support';
    message?: string;
  };
}
```

## 🔄 Migration Strategy

### Phase 1: Data Migration

```sql
-- Create default personal domain for each user
INSERT INTO Domain (id, name, slug, ownerId, createdAt, updatedAt)
SELECT 
  gen_random_uuid(),
  COALESCE(u.name || '''s Domain', u.email || '''s Domain', 'Personal Domain'),
  'user-' || u.id,
  u.id,
  u.createdAt,
  NOW()
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM Domain d WHERE d.ownerId = u.id);

-- Migrate existing content to domains
UPDATE Keeper SET domainId = (
  SELECT d.id FROM Domain d WHERE d.ownerId = Keeper.ownerId
) WHERE domainId IS NULL;

UPDATE Journey SET domainId = (
  SELECT d.id FROM Domain d WHERE d.ownerId = Journey.ownerId
) WHERE domainId IS NULL;

UPDATE Moment SET domainId = (
  SELECT d.id FROM Domain d WHERE d.ownerId = Moment.ownerId
) WHERE domainId IS NULL;
```

### Backward Compatibility

- Maintain existing API endpoints during transition
- Implement feature flags for gradual rollout
- Preserve current authentication flows
- Ensure zero downtime deployment

## 📊 Monitoring & Analytics

### Key Metrics

```typescript
interface DomainMetrics {
  // Usage metrics
  activeUsers: number;
  contentCreated: number;
  kip_interactions: number;
  
  // Performance metrics
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  
  // Business metrics
  customDomainAdoption: number;
  crossDomainShares: number;
  invitationAcceptanceRate: number;
}
```

### Health Monitoring

```typescript
interface DomainHealthCheck {
  checkDomainResolution(): Promise<HealthStatus>;
  checkCustomDomainSSL(): Promise<HealthStatus>;
  checkDatabaseConnectivity(): Promise<HealthStatus>;
  checkCachePerformance(): Promise<HealthStatus>;
}
```

## 🎯 Development Guidelines

### Code Organization

```
src/
├── domain/
│   ├── services/           # Domain business logic
│   ├── middleware/         # Request processing
│   ├── resolvers/          # GraphQL/API resolvers
│   ├── validators/         # Input validation
│   └── utils/             # Helper functions
├── shared/
│   ├── types/             # TypeScript interfaces
│   ├── constants/         # Domain constants
│   └── errors/            # Error definitions
└── tests/
    ├── unit/              # Unit tests
    ├── integration/       # Integration tests
    └── e2e/              # End-to-end tests
```

### Testing Strategy

1. **Unit Tests**: Service logic, validation, utilities
2. **Integration Tests**: Database operations, API endpoints
3. **E2E Tests**: Full domain resolution and permission flows
4. **Performance Tests**: Load testing domain resolution
5. **Security Tests**: Permission boundary validation

### Development Environment

```yaml
# docker-compose.override.yml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  postgres:
    environment:
      - POSTGRES_DB=keeper_dev
    volumes:
      - ./test-data:/docker-entrypoint-initdb.d
```

## 🔮 Future Enhancements

### Self-Hosting Preparation

```typescript
interface SelfHostingTools {
  exportDomain(domainId: string): Promise<DomainExportPackage>;
  importDomain(package: DomainExportPackage): Promise<Domain>;
  generateDockerCompose(domain: Domain): string;
  createMigrationScript(domain: Domain): string;
}
```

### Enterprise Features

- Multi-domain organizations
- Advanced analytics dashboards  
- White-label customization
- SSO integration
- Compliance reporting

## 🤝 Contributing

### Development Workflow

1. **Feature Branch**: Create branch from `main`
2. **Implementation**: Follow TDD approach
3. **Testing**: Ensure all tests pass
4. **Documentation**: Update relevant docs
5. **Review**: Submit PR for review
6. **Deployment**: Staged rollout with feature flags

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Consistent formatting
- **Testing**: >90% coverage requirement
- **Documentation**: JSDoc for all public APIs

---

This Domain Layer implementation represents a fundamental architectural shift that positions Keeper as a leading multi-domain platform while maintaining backward compatibility and preparing for future self-hosting capabilities. 