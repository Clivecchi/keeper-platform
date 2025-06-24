// TASK: Create a handler to retrieve user settings by userId
// 📄 File: src/kam/settings/getSettings.ts

import { getUserSettings } from '@keeper/database';
import type { UserSettings } from '@keeper/database';

/**
 * Retrieves user settings by user ID.
 * If none exist, returns null.
 *
 * @param userId - The ID of the user to look up
 * @returns A UserSettings object or null
 */
export async function getUserSettingsHandler(userId: string): Promise<UserSettings | null> {
  return getUserSettings(userId);
} 