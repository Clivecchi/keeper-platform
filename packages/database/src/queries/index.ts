/**
 * Database Query Helpers
 * ======================
 * 
 * Common database operations that are used across the platform.
 * These functions provide higher-level abstractions over raw Prisma queries.
 */

import { prisma } from '../index.js'
import type { users as User, UserSettings, themes as Theme, Prisma } from '@prisma/client'
import * as crypto from 'crypto'

// =============================================================================
// USER QUERIES
// =============================================================================

/**
 * Get user with all their settings and theme information
 */
export async function getUserWithSettings(userId: string) {
  return prisma.users.findUnique({
    where: { id: userId },
    include: { 
      UserSettings: true
    }
  })
}

/**
 * Get user by email address
 */
export async function getUserByEmail(email: string) {
  return prisma.users.findUnique({
    where: { email },
    include: {
      UserSettings: true
    }
  })
}

/**
 * Create a new user with default settings
 * Automatically assigns the "Keeper Classic" theme
 */
export async function createUserWithDefaultSettings(userData: {
  email: string
  hashedPassword: string
  name?: string
  avatar_url?: string
}) {
  // First, get the Keeper Classic theme by slug
  const keeperClassicTheme = await prisma.themes.findFirst({
    where: { slug: 'keeper-classic' }
  })

  if (!keeperClassicTheme) {
    throw new Error('Keeper Classic theme not found in database')
  }

  const userId = crypto.randomUUID()
  const currentTime = new Date()

  return prisma.users.create({
    data: {
      id: userId,
      email: userData.email,
      hashedPassword: userData.hashedPassword,
      name: userData.name,
      avatar_url: userData.avatar_url,
      updatedAt: currentTime,
      UserSettings: {
        create: {
          id: crypto.randomUUID(),
          preferred_theme_id: keeperClassicTheme.id,
          themeMode: keeperClassicTheme.default_mode || 'light',
          respectSystemTheme: true,
          updatedAt: currentTime
        }
      }
    },
    include: {
      UserSettings: true
    }
  })
}

/**
 * Update user information
 */
export async function updateUser(userId: string, data: Partial<{
  name: string
  email: string
  avatar_url: string
}>) {
  return prisma.users.update({
    where: { id: userId },
    data,
    include: {
      UserSettings: true
    }
  })
}

// =============================================================================
// USER SETTINGS QUERIES
// =============================================================================

/**
 * Get user settings by user ID
 */
export async function getUserSettings(userId: string) {
  return prisma.userSettings.findFirst({
    where: { userId },
    include: {
      users: true
    }
  })
}

/**
 * Get user settings with theme data
 */
export async function getUserSettingsWithTheme(userId: string) {
  const userSettings = await prisma.userSettings.findFirst({
    where: { userId },
    include: {
      users: true
    }
  })

  if (!userSettings) {
    return null
  }

  // Manually fetch the theme if preferred_theme_id exists
  const theme = userSettings.preferred_theme_id 
    ? await prisma.themes.findUnique({
        where: { id: userSettings.preferred_theme_id }
      })
    : null

  return {
    ...userSettings,
    theme
  }
}

/**
 * Update user theme preference
 */
export async function updateUserTheme(userId: string, themeId: string, themeMode?: string) {
  const userSettings = await prisma.userSettings.findFirst({
    where: { userId }
  })

  if (!userSettings) {
    throw new Error('User settings not found')
  }

  return prisma.userSettings.update({
    where: { id: userSettings.id },
    data: {
      preferred_theme_id: themeId,
      themeMode: themeMode,
      updatedAt: new Date()
    }
  })
}

/**
 * Update user settings
 */
export async function updateUserSettings(userId: string, settings: Partial<{
  preferred_theme_id: string
  themeMode: string
  respectSystemTheme: boolean
}>) {
  const userSettings = await prisma.userSettings.findFirst({
    where: { userId }
  })

  if (!userSettings) {
    throw new Error('User settings not found')
  }

  return prisma.userSettings.update({
    where: { id: userSettings.id },
    data: {
      ...settings,
      updatedAt: new Date()
    }
  })
}

// =============================================================================
// THEME QUERIES
// =============================================================================

/**
 * Get all available themes
 */
export async function getAllThemes() {
  return prisma.themes.findMany({
    orderBy: { label: 'asc' }
  })
}

/**
 * Get theme by slug
 */
export async function getThemeBySlug(slug: string) {
  return prisma.themes.findFirst({
    where: { slug }
  })
}

/**
 * Get theme by ID
 */
export async function getThemeById(id: string) {
  return prisma.themes.findUnique({
    where: { id }
  })
}

// =============================================================================
// KEEPER MAPPING QUERIES (for future use)
// =============================================================================

/**
 * Get keeper mappings - note: no userId in KeeperMapping model
 */
export async function getKeeperMappings() {
  return prisma.keeperMapping.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

// =============================================================================
// UTILITY QUERIES
// =============================================================================

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { email },
    select: { id: true }
  })
  return !!user
}

/**
 * Get user count
 */
export async function getUserCount(): Promise<number> {
  return prisma.users.count()
}

/**
 * Soft delete user (mark as inactive)
 */
export async function softDeleteUser(userId: string) {
  return prisma.users.update({
    where: { id: userId },
    data: {
      updatedAt: new Date()
      // Add isActive: false when that field is added to schema
    }
  })
} 