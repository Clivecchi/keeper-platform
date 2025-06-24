import type { UserSettings } from '@keeper/database';
/**
 * Retrieves user settings by user ID.
 * If none exist, returns null.
 *
 * @param userId - The ID of the user to look up
 * @returns A UserSettings object or null
 */
export declare function getUserSettingsHandler(userId: string): Promise<UserSettings | null>;
//# sourceMappingURL=getSettings.d.ts.map