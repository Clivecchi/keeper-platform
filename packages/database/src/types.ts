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
export type FrameContent = Prisma.FrameContentGetPayload<{}>
// export type KipAgent = Prisma.kip_agentsGetPayload<{}> // Will be available after Prisma generation

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
// KIP AGENT TYPES
// =============================================================================

/**
 * Agent class types
 */
export type AgentClass = 'Standard' | 'Coordinator' | 'Lead' | 'Persona';

/**
 * Model provider types
 */
export type ModelProvider = 'openai' | 'anthropic' | 'together' | 'elevenlabs';

/**
 * Model settings configuration
 */
export type ModelSettings = {
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  retry?: {
    max_retries: number;
    retry_delay_ms: number;
  };
};

/**
 * KIP Agent input for creation
 */
export type AgentInput = {
  slug: string;
  name: string;
  purpose: string;
  model: string;
  agent_class?: AgentClass;
  context_scope?: string;
  memory_enabled?: boolean;
  tools?: string[];
  permissions?: string[];
  config?: any;
  status?: string;
  model_provider?: ModelProvider;
  model_settings?: ModelSettings;
  visibility?: AgentVisibility;
  created_by?: string;
}

/**
 * Agent response from running an agent
 */
export type AgentResponse = {
  id: string;
  success: boolean;
  data: unknown;
  processing_time_ms: number;
}

/**
 * Agent visibility options
 */
export type AgentVisibility = 'private' | 'public' | 'shared';

/**
 * Agent permission types
 */
export type AgentPermission = 'run' | 'edit' | 'delete' | 'share';

/**
 * KIP User Key input for creation
 */
export type UserKeyInput = {
  user_id: string;
  provider: ModelProvider;
  api_key: string;
}

/**
 * KIP Agent Permission input for creation
 */
export type AgentPermissionInput = {
  agent_id: string;
  user_id: string;
  permission: AgentPermission;
}

/**
 * Platform API Key for admin-level key management
 */
export type PlatformApiKey = {
  id: string;
  provider: string;
  api_key: string;
  label?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Platform API Key input for creation/update
 */
export type PlatformApiKeyInput = {
  provider: string;
  api_key: string;
  label?: string;
  is_active?: boolean;
  created_by?: string;
}

/**
 * KIP Command Intent (updated from frontend types)
 */
export type KipCommandIntent = {
  action: string;
  keeper_id: string;
  type: string;
  data: Record<string, unknown>;
}

/**
 * KIP Agent Log input for creation
 */
export type AgentLogInput = {
  agent_id: string;
  user_id?: string;
  input: string;
  output?: string;
  error?: string;
  model?: string;
  execution_time_ms?: number;
}

/**
 * KIP Agent Log with relations
 */
export type AgentLogWithRelations = {
  id: string;
  agent_id: string;
  user_id?: string | null;
  input: string;
  output?: string | null;
  error?: string | null;
  model?: string | null;
  execution_time_ms?: number | null;
  created_at: Date;
  agent?: {
    id: string;
    name: string;
    slug: string;
    model: string;
  };
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

/**
 * KIP Session input for creation
 */
export type KipSessionInput = {
  agent_id: string;
  user_id?: string;
  session_name?: string;
}

/**
 * KIP Session with relations
 */
export type KipSessionWithRelations = {
  id: string;
  agent_id: string;
  user_id?: string | null;
  session_name?: string | null;
  created_at: Date;
  updated_at: Date;
  agent?: {
    id: string;
    name: string;
    slug: string;
  };
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  messages?: KipMessageWithRelations[];
}

/**
 * KIP Message input for creation
 */
export type KipMessageInput = {
  session_id: string;
  sender: 'user' | 'agent';
  content: string;
  role?: string;
  metadata?: any;
}

/**
 * KIP Message with relations
 */
export type KipMessageWithRelations = {
  id: string;
  session_id: string;
  sender: string;
  content: string;
  role: string;
  metadata: unknown;
  created_at: Date;
  session?: {
    id: string;
    agent_id: string;
    user_id?: string | null;
  };
}

// =============================================================================
// KEEPER MAPPING TYPES
// =============================================================================

/**
 * Keeper mapping with relations
 */
export type KeeperMappingWithRelations = KeeperMapping & {
  user: User
  frameContent?: FrameContent[]
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
export type ModelName = 'User' | 'UserSettings' | 'Theme' | 'KeeperMapping' | 'FrameContent'

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