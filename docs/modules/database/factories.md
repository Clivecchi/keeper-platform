# Domain Service Factories

## 📌 Purpose
This folder contains factory classes for creating domain-scoped services with fault-tolerant initialization and retry logic. The primary factory manages Redis and Prisma connections with comprehensive error handling.

## 🧱 Key Files
- `DomainServiceFactory.ts` - Main factory with retry logic for service creation
- `README.md` - This documentation file

## 🔄 Data & Behavior
The DomainServiceFactory manages:
- **Redis Connection**: Uses REDIS_URL environment variable with retry logic
- **Prisma Connection**: Database client with connection testing
- **Service Creation**: Domain services, cache services, and memory services
- **Fault Tolerance**: Exponential backoff retry strategy (up to 5 attempts)
- **Connection Testing**: Validates Redis (ping) and Prisma (query) connections
- **Graceful Shutdown**: Clean teardown of all connections

### Usage Example
```typescript
import { DomainServiceFactory } from '@keeper/database'

// Initialize factory with retry logic
await DomainServiceFactory.initialize({
  maxRetries: 3,
  retryDelayMs: 1000
})

// Check if ready
if (DomainServiceFactory.isReady()) {
  // Create services
  const domainService = DomainServiceFactory.createDomainService()
  const cacheService = DomainServiceFactory.createCacheService()
  const memoryService = DomainServiceFactory.createMemoryService()
}

// Get status
const status = DomainServiceFactory.getStatus()
console.log(status) // { initialized: true, initializing: false, ready: true }

// Shutdown gracefully
await DomainServiceFactory.shutdown()
```

## ⚠️ Notes & ToDo
- [ ] Factory requires REDIS_URL environment variable to be set
- [ ] Initialization should be called once at application startup
- [ ] Consider adding health check endpoints for monitoring
- [ ] Add metrics collection for connection retry attempts

## 📆 Update Log
- **2025-01-11**: Created DomainServiceFactory with retry logic and fault-tolerant initialization
- **2025-01-11**: Added comprehensive connection testing and graceful shutdown capabilities
- **2025-01-11**: Implemented exponential backoff retry strategy for resilient service initialization 