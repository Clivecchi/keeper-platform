/**
 * Database Query Helpers
 * ======================
 * 
 * Common database operations that are used across the platform.
 * These functions provide higher-level abstractions over raw Prisma queries.
 */

import { prisma } from '../index.js'
import { PrismaClient } from '@prisma/client';
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

// =============================================================================
// KIP AGENT QUERIES
// =============================================================================

/**
 * Get all KIP agents
 */
export async function getAllKipAgents() {
  return prisma.kip_agents.findMany({
    orderBy: [
      { status: 'asc' },
      { name: 'asc' }
    ]
  })
}

/**
 * Get a KIP agent by slug
 */
export async function getKipAgentBySlug(slug: string) {
  return prisma.kip_agents.findUnique({
    where: { slug }
  })
}

/**
 * Get a KIP agent by ID
 */
export async function getKipAgentById(id: string) {
  return prisma.kip_agents.findUnique({
    where: { id }
  })
}

/**
 * Create a new KIP agent
 */
export async function createKipAgent(data: {
  slug: string;
  name: string;
  purpose: string;
  model: string;
  agent_class?: string;
  context_scope?: string;
  memory_enabled?: boolean;
  tools?: string[];
  permissions?: string[];
  config?: any;
  status?: string;
}) {
  return prisma.kip_agents.create({
    data: {
      ...data,
      updated_at: new Date()
    }
  })
}

/**
 * Update a KIP agent
 */
export async function updateKipAgent(id: string, data: Partial<{
  slug: string;
  name: string;
  purpose: string;
  model: string;
  agent_class: string;
  context_scope: string;
  memory_enabled: boolean;
  tools: string[];
  permissions: string[];
  config: Record<string, unknown>;
  status: string;
}>) {
  const updateData: any = {
    ...data,
    updated_at: new Date()
  };

  // If config is present, serialize it properly for Prisma
  if (data.config) {
    updateData.config = JSON.parse(JSON.stringify(data.config)) as Prisma.InputJsonValue;
  }

  return prisma.kip_agents.update({
    where: { id },
    data: updateData
  })
}

/**
 * Delete a KIP agent
 */
export async function deleteKipAgent(id: string) {
  return prisma.kip_agents.delete({
    where: { id }
  })
}

// =============================================================================
// KIP AGENT LOG QUERIES
// =============================================================================

/**
 * Create a new KIP agent log entry
 */
export async function createKipAgentLog(data: {
  agent_id: string;
  user_id?: string;
  input: string;
  output?: string;
  error?: string;
  model?: string;
  execution_time_ms?: number;
}) {
  return prisma.kip_agent_logs.create({
    data
  })
}

/**
 * Get all KIP agent logs with pagination
 */
export async function getKipAgentLogs(options: {
  page?: number;
  pageSize?: number;
  agentId?: string;
  userId?: string;
} = {}) {
  const { page = 1, pageSize = 50, agentId, userId } = options
  const skip = (page - 1) * pageSize

  const where = {
    ...(agentId && { agent_id: agentId }),
    ...(userId && { user_id: userId })
  }

  const [logs, total] = await Promise.all([
    prisma.kip_agent_logs.findMany({
      where,
      include: {
        kip_agents: {
          select: {
            id: true,
            name: true,
            slug: true,
            model: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.kip_agent_logs.count({ where })
  ])

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrevious: page > 1
  }
}

/**
 * Get logs for a specific agent
 */
export async function getLogsByAgentId(agentId: string, options: {
  page?: number;
  pageSize?: number;
} = {}) {
  return getKipAgentLogs({ ...options, agentId })
}

/**
 * Get logs for a specific user
 */
export async function getLogsByUserId(userId: string, options: {
  page?: number;
  pageSize?: number;
} = {}) {
  return getKipAgentLogs({ ...options, userId })
}

/**
 * Get agent execution statistics
 */
export async function getAgentStats(agentId?: string) {
  const where = agentId ? { agent_id: agentId } : {}

  const stats = await prisma.kip_agent_logs.aggregate({
    where,
    _count: { id: true },
    _avg: { execution_time_ms: true },
    _min: { execution_time_ms: true },
    _max: { execution_time_ms: true }
  })

  const errorCount = await prisma.kip_agent_logs.count({
    where: {
      ...where,
      error: { not: null }
    }
  })

  return {
    totalExecutions: stats._count.id,
    avgExecutionTime: stats._avg.execution_time_ms,
    minExecutionTime: stats._min.execution_time_ms,
    maxExecutionTime: stats._max.execution_time_ms,
    errorCount,
    successRate: stats._count.id > 0 ? ((stats._count.id - errorCount) / stats._count.id) * 100 : 0
  }
}

// =============================================================================
// KIP SESSION QUERIES
// =============================================================================

/**
 * Create a new KIP session
 */
export async function createKipSession(data: {
  agent_id: string;
  user_id?: string;
  session_name?: string;
}) {
  return prisma.kip_sessions.create({
    data: {
      ...data,
      updated_at: new Date()
    },
    include: {
      kip_agents: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })
}

/**
 * Get a KIP session by ID with messages
 */
export async function getKipSessionById(sessionId: string) {
  return prisma.kip_sessions.findUnique({
    where: { id: sessionId },
    include: {
      kip_agents: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      kip_messages: {
        orderBy: { created_at: 'asc' }
      }
    }
  })
}

/**
 * Get all sessions for an agent
 */
export async function getSessionsByAgentId(agentId: string, options: {
  page?: number;
  pageSize?: number;
} = {}) {
  const { page = 1, pageSize = 50 } = options
  const skip = (page - 1) * pageSize

  const [sessions, total] = await Promise.all([
    prisma.kip_sessions.findMany({
      where: { agent_id: agentId },
      include: {
        kip_agents: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: { kip_messages: true }
        }
      },
      orderBy: { updated_at: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.kip_sessions.count({ where: { agent_id: agentId } })
  ])

  return {
    sessions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrevious: page > 1
  }
}

/**
 * Get all sessions for a user
 */
export async function getSessionsByUserId(userId: string, options: {
  page?: number;
  pageSize?: number;
} = {}) {
  const { page = 1, pageSize = 50 } = options
  const skip = (page - 1) * pageSize

  const [sessions, total] = await Promise.all([
    prisma.kip_sessions.findMany({
      where: { user_id: userId },
      include: {
        kip_agents: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: { kip_messages: true }
        }
      },
      orderBy: { updated_at: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.kip_sessions.count({ where: { user_id: userId } })
  ])

  return {
    sessions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrevious: page > 1
  }
}

/**
 * Update session updated_at timestamp
 */
export async function updateSessionTimestamp(sessionId: string) {
  return prisma.kip_sessions.update({
    where: { id: sessionId },
    data: { updated_at: new Date() }
  })
}

/**
 * Delete a KIP session and all its messages
 */
export async function deleteKipSession(sessionId: string) {
  return prisma.kip_sessions.delete({
    where: { id: sessionId }
  })
}

// =============================================================================
// KIP MESSAGE QUERIES
// =============================================================================

/**
 * Create a new KIP message
 */
export async function createKipMessage(data: {
  session_id: string;
  sender: 'user' | 'agent';
  content: string;
  role?: string;
  metadata?: any;
}) {
  // Update session timestamp when adding a message
  await updateSessionTimestamp(data.session_id)

  return prisma.kip_messages.create({
    data: {
      ...data,
      role: data.role || (data.sender === 'user' ? 'user' : 'assistant')
    },
    include: {
      kip_sessions: {
        select: {
          id: true,
          agent_id: true,
          user_id: true
        }
      }
    }
  })
}

/**
 * Get all messages for a session
 */
export async function getSessionMessages(sessionId: string) {
  return prisma.kip_messages.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: 'asc' },
    include: {
      kip_sessions: {
        select: {
          id: true,
          agent_id: true,
          user_id: true
        }
      }
    }
  })
}

/**
 * Get latest messages for a session with limit
 */
export async function getRecentSessionMessages(sessionId: string, limit: number = 50) {
  return prisma.kip_messages.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: {
      kip_sessions: {
        select: {
          id: true,
          agent_id: true,
          user_id: true
        }
      }
    }
  })
}

/**
 * Delete all messages from a session
 */
export async function deleteSessionMessages(sessionId: string) {
  return prisma.kip_messages.deleteMany({
    where: { session_id: sessionId }
  })
}

/**
 * Get message count for a session
 */
export async function getSessionMessageCount(sessionId: string) {
  return prisma.kip_messages.count({
    where: { session_id: sessionId }
  })
} 