/**
 * Settings-related types.
 * For example:
 * - ThemePreference
 * - UserSettingsInput
 *
 * These support the logic in /kam/settings and may be reused across KAM.
 */
import { z } from 'zod';
/**
 * Zod schema for updating user settings.
 * All fields are optional, allowing partial updates.
 * - themeMode: "light" | "dark" | "system"
 * - respectSystemTheme: boolean
 * - preferred_theme_id: string (now non-nullable if provided for update, required on create)
 */
export const UpdateUserSettingsSchema = z.object({
    themeMode: z.enum(["light", "dark", "system"]).optional(),
    respectSystemTheme: z.boolean().optional(),
    preferred_theme_id: z.string().optional(), // If provided, must be a string.
});
