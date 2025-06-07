// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference
/**
 * Entry point for the KAM auth module.
 * Export all public-facing functions (e.g., signIn, signUp) from this file.
 * Internal logic lives in subfolders (e.g., api, hooks, types).
 */
export { registerUserHandler } from './register';
export { loginUserHandler } from './login';
export { logoutUserHandler } from './logout';
export { createSession, getSessionHandler, invalidateSession } from './session';
// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference 
