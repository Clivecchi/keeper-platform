/**
 * Domain Middleware
 * Core middleware functions for domain-based request handling
 */

export { resolveDomainContext } from './resolveDomainContext';
export { requireAuth } from './requireAuth';
export { requireDomainPermission } from './requireDomainPermission';
export { requireMemoryAccess } from './requireMemoryAccess';
export { createDomainPipeline } from './pipeline';

// Export domain guards
export { 
  fullDomainMemoryGuard, 
  fullDomainMemoryWriteGuard, 
  fullDomainMemoryAdminGuard,
  createCustomFullDomainMemoryGuard
} from './pipeline';

// Export types
export type { DomainContextStrategy } from './resolveDomainContext';
export type { DomainPermissionType } from './requireDomainPermission';

// Export utility functions
export { extractDomainId, extractSubdomain, validateDomainId } from './utils'; 