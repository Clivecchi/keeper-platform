/**
 * Domain Middleware
 * Core middleware functions for domain-based request handling
 */

export { resolveDomainContext } from './resolveDomainContext.js';
export { requireAuth } from './requireAuth.js';
export { requireDomainPermission } from './requireDomainPermission.js';
export { requireMemoryAccess } from './requireMemoryAccess.js';
export {
  createDomainPipeline,
  createBasicDomainGuard,
  createWriteDomainGuard,
  createAdminDomainGuard,
  createMemoryGuard,
  createDomainMemoryGuard,
  createCrossDomainGuard,
  createPublicDomainGuard,
  createOwnerOnlyGuard,
  fullDomainMemoryGuard,
  fullDomainMemoryWriteGuard,
  fullDomainMemoryAdminGuard,
} from './pipeline.js';

// Export types
export type { DomainContextStrategy } from './resolveDomainContext.js';
export type { DomainPermissionType } from './requireDomainPermission.js';

// Export utility functions
export { extractDomainId, extractSubdomain, validateDomainId } from './utils.js';