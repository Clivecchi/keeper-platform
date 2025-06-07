/**
 * Global auth and KAM types shared across the entire platform.
 * Examples:
 * - Session
 * - UserObject
 * - PermissionMap
 *
 * These types should remain platform-agnostic and be referenced by other KAM submodules.
 */
// Instruction:
// This file serves as the central index for all KAM-related TypeScript types.
// ✅ Always re-export types from individual KAM module folders (e.g., auth, api, hooks).
// ❌ Do not define new types here.
// ✅ Keep this index updated whenever new types.ts files are added to subfolders.
// Example usage:
// export * from '../auth/types'; 
//Use this file as the source of truth for type imports across KAM modules.
export * from '../auth/types';
export * from '../api/types';
export * from '../hooks/types';
