// 🌈 Dynamic theme preferences
// Based on KAM architectural rules and Prisma Model Reference

import { PrismaClient } from '@prisma/client';
import type { UserSettings, Prisma } from '@prisma/client'; // Import Prisma namespace for input types
import crypto from 'crypto'; // For generating ID if creating settings
import { UpdateUserSettingsSchema } from './types';
import type { UpdateUserSettingsInput, SettingsResponse } from './types';

const prisma = new PrismaClient();

// const DEFAULT_PREFERRED_THEME_ID = 'default-theme-id-placeholder'; // No longer needed due to Prisma @default

/**
 * Handles updating user settings for a given user ID.
 * Uses upsert to create settings if they don't exist, or update them if they do.
 * `preferred_theme_id` is a required string in the database with a Prisma @default value.
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
    const currentDate = new Date();

    // Data for the 'update' part of upsert
    const updatePayload: Prisma.UserSettingsUpdateInput = {
        updatedAt: currentDate, // Always update this field
    };
    if (themeMode !== undefined) updatePayload.themeMode = themeMode;
    if (respectSystemTheme !== undefined) updatePayload.respectSystemTheme = respectSystemTheme;
    if (preferred_theme_id !== undefined) {
       updatePayload.preferred_theme_id = preferred_theme_id;
    }
    
    
    // Data for the 'create' part of upsert
    const createPayload: Prisma.UserSettingsCreateInput = {
        id: crypto.randomUUID(), // Assuming linter/Prisma still requires manual ID
        users: { connect: { id: userId } }, 
        updatedAt: currentDate,    // Assuming linter/Prisma still requires manual updatedAt
        // themeMode and respectSystemTheme will be set if provided, otherwise Prisma defaults (or null for themeMode if not defaulted in schema)
        ...(themeMode !== undefined && { themeMode: themeMode }),
        ...(respectSystemTheme !== undefined && { respectSystemTheme: respectSystemTheme }),
        // If preferred_theme_id is provided in input, use it.
        // Otherwise, omit it: Prisma's @default will be used.
        ...(preferred_theme_id !== undefined && { preferred_theme_id: preferred_theme_id }),
    };

    const settings = await prisma.userSettings.upsert({
      where: { userId: userId }, 
      update: updatePayload,
      create: createPayload,
    });

    return {
      success: true,
      data: settings,
    };

  } catch (error) {
    console.error(`Error updating user settings for userId ${userId}:`, error);
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred while updating settings.',
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
  }
} 