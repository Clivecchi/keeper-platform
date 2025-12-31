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
export { registerUserHandler, loginUserHandler, logoutUserHandler, createSession, getSessionHandler, invalidateSession } from './auth/index.js';
export { updateUserSettingsHandler, getUserSettingsHandler } from './settings/index.js';
export type * from './types/index.js';
export type { LoginInput, RegisterInput, UserSession, AuthUser, AuthResponse, AuthSuccessData, UpdateUserSettingsInput, SettingsResponse } from './types/index.js';
//# sourceMappingURL=index.d.ts.map