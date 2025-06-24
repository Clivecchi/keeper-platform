/**
 * Database Types & Utilities
 * ==========================
 * 
 * Additional types and utilities that extend the Prisma generated types.
 * These types are used across the platform for database operations.
 */

import type { Prisma } from '@prisma/client'

// Use Prisma model types - these will be available after generation
export type User = Prisma.usersGetPayload<{}>
export type UserSettings = Prisma.UserSettingsGetPayload<{}>
export type Theme = Prisma.themesGetPayload<{}>
export type KeeperMapping = Prisma.KeeperMappingGetPayload<{}>
export type MediaContent = Prisma.MediaContentGetPayload<{}>

// =============================================================================
// EXTENDED USER TYPES
// =============================================================================

/**
 * User with complete settings and theme information
 */
export type UserWithSettings = User & {
  userSettings: (UserSettings & {
    theme: Theme | null
  }) | null
}

/**
 * User creation input type
 */
export type CreateUserInput = {
  email: string
  hashedPassword: string
  name?: string
  avatar_url?: string
}

/**
 * User update input type
 */
export type UpdateUserInput = Partial<{
  name: string
  email: string
  avatar_url: string
}>

// =============================================================================
// USER SETTINGS TYPES
// =============================================================================

/**
 * User settings with theme information
 */
export type UserSettingsWithTheme = UserSettings & {
  theme: Theme | null
}

/**
 * User settings update input
 */
export type UpdateUserSettingsInput = Partial<{
  preferred_theme_id: string
  themeMode: string
  respectSystemTheme: boolean
}>

// =============================================================================
// THEME TYPES
// =============================================================================

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'auto'

/**
 * Theme creation input
 */
export type CreateThemeInput = {
  name: string
  slug: string
  default_mode: string
  palette: Prisma.JsonValue
  style: Prisma.JsonValue
}

// =============================================================================
// QUERY RESULT TYPES
// =============================================================================

/**
 * Standard database operation result
 */
export type DatabaseResult<T> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Paginated query result
 */
export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

/**
 * Database health check result
 */
export type DatabaseHealthResult = {
  status: 'healthy' | 'unhealthy'
  timestamp: Date
  error?: string
}

// =============================================================================
// KEEPER MAPPING TYPES
// =============================================================================

/**
 * Keeper mapping with relations
 */
export type KeeperMappingWithRelations = KeeperMapping & {
  user: User
  mediaContent?: MediaContent[]
}

// =============================================================================
// SEARCH & FILTER TYPES
// =============================================================================

/**
 * Generic search parameters
 */
export type SearchParams = {
  query?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * User search and filter parameters
 */
export type UserSearchParams = SearchParams & {
  hasSettings?: boolean
  themeId?: string
  createdAfter?: Date
  createdBefore?: Date
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Make certain fields optional for database operations
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Database model names
 */
export type ModelName = 'User' | 'UserSettings' | 'Theme' | 'KeeperMapping' | 'MediaContent'

/**
 * Common database fields
 */
export type CommonFields = {
  id: string
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Database error types
 */
export type DatabaseError = {
  type: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'DUPLICATE_KEY' | 'FOREIGN_KEY_CONSTRAINT' | 'UNKNOWN_ERROR'
  message: string
  field?: string
  code?: string
}

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

/**
 * Transaction context type for complex operations
 */
export type TransactionContext = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

// =============================================================================
// SEEDING TYPES
// =============================================================================

/**
 * Database seed data structure
 */
export type SeedData = {
  themes: CreateThemeInput[]
  users?: CreateUserInput[]
}

/**
 * Seed result
 */
export type SeedResult = {
  themes: number
  users: number
  totalOperations: number
  duration: number
} 