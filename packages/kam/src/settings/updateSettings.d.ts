import type { UserSettings } from '@keeper/database';
import type { UpdateUserSettingsInput, SettingsResponse } from './types.js';
/**
 * Handles updating user settings for a given user ID.
 * Uses the centralized database package for all DB operations.
 *
 * @param userId - The ID of the user whose settings are to be updated.
 * @param data - The settings data to update, conforming to UpdateUserSettingsInput.
 * @returns SettingsResponse containing the updated UserSettings object or an error.
 */
export declare function updateUserSettingsHandler(userId: string, data: UpdateUserSettingsInput): Promise<SettingsResponse<UserSettings>>;
//# sourceMappingURL=updateSettings.d.ts.map