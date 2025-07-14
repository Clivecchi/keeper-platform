/**
 * @keeper/kam - Keeper Access Management Package
 * ==============================================
 * 
 * This is the main entry point for KAM (Keeper Access Management).
 * All auth, settings, and user management functionality is exported from here.
 * 
 * Usage Examples:
 * 
 * ```typescript
 * // Import authentication functions
 * import { loginUserHandler, registerUserHandler } from '@keeper/kam'
 * 
 * // Import user settings management
 * import { updateUserSettingsHandler, getUserSettingsHandler } from '@keeper/kam'
 * 
 * // Import types
 * import type { AuthUser, UserSession, LoginInput } from '@keeper/kam/types'
 * ```
 */

// =============================================================================
// AUTHENTICATION EXPORTS
// =============================================================================
export {
  registerUserHandler,
  loginUserHandler,
  logoutUserHandler,
  createSession,
  getSessionHandler,
  invalidateSession
} from './auth/index'

// =============================================================================
// SETTINGS & PREFERENCES EXPORTS
// =============================================================================
export {
  updateUserSettingsHandler,
  getUserSettingsHandler
} from './settings/index'

// =============================================================================
// DOMAIN AUTH EXPORTS
// =============================================================================
export {
  DomainAuthManager,
  createDomainAuthMiddleware
} from './auth/domainAuth'
export type {
  DomainAuthUser,
  DomainAuthSession,
  DomainAuthOptions
} from './auth/domainAuth'

// =============================================================================
// TYPE EXPORTS
// =============================================================================
export type * from './types/index'

// Re-export commonly used types for convenience
export type {
  // Auth types
  LoginInput,
  RegisterInput,
  UserSession,
  AuthUser,
  AuthResponse,
  AuthSuccessData,
  
  // Settings types
  UpdateUserSettingsInput,
  SettingsResponse
} from './types/index'

// =============================================================================
// UTILITY EXPORTS (if needed)
// =============================================================================
// Export utility functions from lib if they need to be public
// export * from './lib/index' 