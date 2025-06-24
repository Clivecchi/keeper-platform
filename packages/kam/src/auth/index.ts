// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference
/**
 * Entry point for the KAM auth module.
 * Export all public-facing functions (e.g., signIn, signUp) from this file.
 * Internal logic lives in subfolders (e.g., api, hooks, types).
 */

export { registerUserHandler } from './register.js';
export { loginUserHandler } from './login.js';
export { logoutUserHandler } from './logout.js';
export { createSession, getSessionHandler, invalidateSession } from './session.js';

// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference 