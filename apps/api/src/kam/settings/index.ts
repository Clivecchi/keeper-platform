// 🌈 Dynamic theme preferences
// Based on KAM architectural rules and Prisma Model Reference
/**
 * User-level system preferences live here.
 * Primary focus: themeMode, onboarding flags, etc.
 * Connected to the UserSettings model in Prisma.
 * 
 * Cursor Rule: Use Prisma-generated types when handling themeMode logic.
 */

export { updateUserSettingsHandler } from './updateSettings.js';
export * from './getSettings.js';
// Add other exports for retrieving settings etc. when implemented 