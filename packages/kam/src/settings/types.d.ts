/**
 * Settings-related types.
 * For example:
 * - ThemePreference
 * - UserSettingsInput
 *
 * These support the logic in /kam/settings and may be reused across KAM.
 */
import { z } from 'zod';
import type { UserSettings } from '@keeper/database';
/**
 * Zod schema for updating user settings.
 * All fields are optional, allowing partial updates.
 * - themeMode: "light" | "dark" | "system"
 * - respectSystemTheme: boolean
 * - preferred_theme_id: string (now non-nullable if provided for update, required on create)
 */
export declare const UpdateUserSettingsSchema: z.ZodObject<{
    themeMode: z.ZodOptional<z.ZodEnum<["light", "dark", "system"]>>;
    respectSystemTheme: z.ZodOptional<z.ZodBoolean>;
    preferred_theme_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    themeMode?: "system" | "light" | "dark" | undefined;
    respectSystemTheme?: boolean | undefined;
    preferred_theme_id?: string | undefined;
}, {
    themeMode?: "system" | "light" | "dark" | undefined;
    respectSystemTheme?: boolean | undefined;
    preferred_theme_id?: string | undefined;
}>;
export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsSchema>;
/**
 * Generic success response for settings operations.
 */
export interface SettingsSuccessResponse<T = UserSettings> {
    success: true;
    data: T;
}
/**
 * Generic error response for settings operations.
 */
export interface SettingsErrorResponse {
    success: false;
    error: {
        message: string;
        code?: string;
    };
}
export type SettingsResponse<T = UserSettings> = SettingsSuccessResponse<T> | SettingsErrorResponse;
//# sourceMappingURL=types.d.ts.map