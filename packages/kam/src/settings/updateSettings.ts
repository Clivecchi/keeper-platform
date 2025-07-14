// 🌈 Dynamic theme preferences
// Based on KAM architectural rules and Prisma Model Reference

import { updateUserSettings } from '@keeper/database';
import type { UserSettings } from '@keeper/database';
import { UpdateUserSettingsSchema } from './types';
import type { UpdateUserSettingsInput, SettingsResponse } from './types';



/**
 * Handles updating user settings for a given user ID.
 * Uses the centralized database package for all DB operations.
 * 
 * @param userId - The ID of the user whose settings are to be updated.
 * @param data - The settings data to update, conforming to UpdateUserSettingsInput.
 * @returns SettingsResponse containing the updated UserSettings object or an error.
 */
export async function updateUserSettingsHandler(
  userId: string,
  data: UpdateUserSettingsInput
): Promise<SettingsResponse<UserSettings>> {
  try {
    const validationResult = UpdateUserSettingsSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: {
          message: 'Invalid settings data',
          code: 'VALIDATION_ERROR',
        },
      };
    }

    const { themeMode, respectSystemTheme, preferred_theme_id } = validationResult.data;

    // Build the settings object to update
    const settingsUpdate: Partial<{
      preferred_theme_id: string
      themeMode: string
      respectSystemTheme: boolean
    }> = {};

    if (themeMode !== undefined) settingsUpdate.themeMode = themeMode;
    if (respectSystemTheme !== undefined) settingsUpdate.respectSystemTheme = respectSystemTheme;
    if (preferred_theme_id !== undefined) settingsUpdate.preferred_theme_id = preferred_theme_id;

    const settings = await updateUserSettings(userId, settingsUpdate);

    return {
      success: true,
      data: settings,
    };

  } catch (error) {
    console.error(`Error updating user settings for userId ${userId}:`, error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred while updating settings.',
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
  }
} 