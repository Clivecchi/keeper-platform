/**
 * Database Query Helpers
 * ======================
 *
 * Common database operations that are used across the platform.
 * These functions provide higher-level abstractions over raw Prisma queries.
 */
import type { Prisma } from '@prisma/client';
/**
 * Get user with all their settings and theme information
 */
export declare function getUserWithSettings(userId: string): Promise<({
    UserSettings: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        themeMode: string | null;
        respectSystemTheme: boolean | null;
        preferred_theme_id: string;
    } | null;
} & {
    name: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
    settings: Prisma.JsonValue | null;
}) | null>;
/**
 * Get user by email address
 */
export declare function getUserByEmail(email: string): Promise<({
    UserSettings: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        themeMode: string | null;
        respectSystemTheme: boolean | null;
        preferred_theme_id: string;
    } | null;
} & {
    name: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
    settings: Prisma.JsonValue | null;
}) | null>;
/**
 * Create a new user with default settings
 * Automatically assigns the "Keeper Classic" theme
 */
export declare function createUserWithDefaultSettings(userData: {
    email: string;
    hashedPassword: string;
    name?: string;
    avatar_url?: string;
}): Promise<{
    UserSettings: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        themeMode: string | null;
        respectSystemTheme: boolean | null;
        preferred_theme_id: string;
    } | null;
} & {
    name: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
    settings: Prisma.JsonValue | null;
}>;
/**
 * Update user information
 */
export declare function updateUser(userId: string, data: Partial<{
    name: string;
    email: string;
    avatar_url: string;
}>): Promise<{
    UserSettings: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        themeMode: string | null;
        respectSystemTheme: boolean | null;
        preferred_theme_id: string;
    } | null;
} & {
    name: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
    settings: Prisma.JsonValue | null;
}>;
/**
 * Get user settings by user ID
 */
export declare function getUserSettings(userId: string): Promise<({
    users: {
        name: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
        email: string | null;
        emailVerified: Date | null;
        hashedPassword: string | null;
        resetPasswordToken: string | null;
        resetPasswordTokenExpiresAt: Date | null;
        emailVerificationToken: string | null;
        emailVerificationTokenExpiresAt: Date | null;
        avatar_url: string | null;
        settings: Prisma.JsonValue | null;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    themeMode: string | null;
    respectSystemTheme: boolean | null;
    preferred_theme_id: string;
}) | null>;
/**
 * Get user settings with theme data
 */
export declare function getUserSettingsWithTheme(userId: string): Promise<{
    theme: {
        id: string;
        tags: Prisma.JsonValue | null;
        label: string;
        slug: string;
        style: Prisma.JsonValue | null;
        palette: Prisma.JsonValue;
        source_image: string | null;
        inspired_by: string | null;
        default_mode: string;
        created_at: Date;
        updated_at: Date;
    } | null;
    users: {
        name: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
        email: string | null;
        emailVerified: Date | null;
        hashedPassword: string | null;
        resetPasswordToken: string | null;
        resetPasswordTokenExpiresAt: Date | null;
        emailVerificationToken: string | null;
        emailVerificationTokenExpiresAt: Date | null;
        avatar_url: string | null;
        settings: Prisma.JsonValue | null;
    };
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    themeMode: string | null;
    respectSystemTheme: boolean | null;
    preferred_theme_id: string;
} | null>;
/**
 * Update user theme preference
 */
export declare function updateUserTheme(userId: string, themeId: string, themeMode?: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    themeMode: string | null;
    respectSystemTheme: boolean | null;
    preferred_theme_id: string;
}>;
/**
 * Update user settings
 */
export declare function updateUserSettings(userId: string, settings: Partial<{
    preferred_theme_id: string;
    themeMode: string;
    respectSystemTheme: boolean;
}>): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    themeMode: string | null;
    respectSystemTheme: boolean | null;
    preferred_theme_id: string;
}>;
/**
 * Get all available themes
 */
export declare function getAllThemes(): Promise<{
    id: string;
    tags: Prisma.JsonValue | null;
    label: string;
    slug: string;
    style: Prisma.JsonValue | null;
    palette: Prisma.JsonValue;
    source_image: string | null;
    inspired_by: string | null;
    default_mode: string;
    created_at: Date;
    updated_at: Date;
}[]>;
/**
 * Get theme by slug
 */
export declare function getThemeBySlug(slug: string): Promise<{
    id: string;
    tags: Prisma.JsonValue | null;
    label: string;
    slug: string;
    style: Prisma.JsonValue | null;
    palette: Prisma.JsonValue;
    source_image: string | null;
    inspired_by: string | null;
    default_mode: string;
    created_at: Date;
    updated_at: Date;
} | null>;
/**
 * Get theme by ID
 */
export declare function getThemeById(id: string): Promise<{
    id: string;
    tags: Prisma.JsonValue | null;
    label: string;
    slug: string;
    style: Prisma.JsonValue | null;
    palette: Prisma.JsonValue;
    source_image: string | null;
    inspired_by: string | null;
    default_mode: string;
    created_at: Date;
    updated_at: Date;
} | null>;
/**
 * Get keeper mappings - note: no userId in KeeperMapping model
 */
export declare function getKeeperMappings(): Promise<{
    id: string;
    createdAt: Date;
    keeperId: string | null;
    journeyId: string | null;
    pathId: string | null;
    memoryCardId: string;
    suggestedType: string;
    suggestionStrength: number | null;
    status: string;
}[]>;
/**
 * Check if email exists
 */
export declare function emailExists(email: string): Promise<boolean>;
/**
 * Get user count
 */
export declare function getUserCount(): Promise<number>;
/**
 * Soft delete user (mark as inactive)
 */
export declare function softDeleteUser(userId: string): Promise<{
    name: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
    settings: Prisma.JsonValue | null;
}>;
//# sourceMappingURL=index.d.ts.map