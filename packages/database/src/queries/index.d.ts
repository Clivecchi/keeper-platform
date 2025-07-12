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
    settings: Prisma.JsonValue | null;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
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
    settings: Prisma.JsonValue | null;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
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
    settings: Prisma.JsonValue | null;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
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
    settings: Prisma.JsonValue | null;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
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
        settings: Prisma.JsonValue | null;
        lastLoginAt: Date | null;
        email: string | null;
        emailVerified: Date | null;
        hashedPassword: string | null;
        resetPasswordToken: string | null;
        resetPasswordTokenExpiresAt: Date | null;
        emailVerificationToken: string | null;
        emailVerificationTokenExpiresAt: Date | null;
        avatar_url: string | null;
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
        created_at: Date;
        updated_at: Date;
        palette: Prisma.JsonValue;
        source_image: string | null;
        inspired_by: string | null;
        default_mode: string;
    } | null;
    users: {
        name: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        settings: Prisma.JsonValue | null;
        lastLoginAt: Date | null;
        email: string | null;
        emailVerified: Date | null;
        hashedPassword: string | null;
        resetPasswordToken: string | null;
        resetPasswordTokenExpiresAt: Date | null;
        emailVerificationToken: string | null;
        emailVerificationTokenExpiresAt: Date | null;
        avatar_url: string | null;
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
    created_at: Date;
    updated_at: Date;
    palette: Prisma.JsonValue;
    source_image: string | null;
    inspired_by: string | null;
    default_mode: string;
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
    created_at: Date;
    updated_at: Date;
    palette: Prisma.JsonValue;
    source_image: string | null;
    inspired_by: string | null;
    default_mode: string;
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
    created_at: Date;
    updated_at: Date;
    palette: Prisma.JsonValue;
    source_image: string | null;
    inspired_by: string | null;
    default_mode: string;
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
    status: string;
    memoryCardId: string;
    suggestedType: string;
    suggestionStrength: number | null;
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
    settings: Prisma.JsonValue | null;
    lastLoginAt: Date | null;
    email: string | null;
    emailVerified: Date | null;
    hashedPassword: string | null;
    resetPasswordToken: string | null;
    resetPasswordTokenExpiresAt: Date | null;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    avatar_url: string | null;
}>;
/**
 * Get all KIP agents
 */
export declare function getAllKipAgents(): Promise<{
    model: string;
    name: string;
    id: string;
    permissions: string[];
    config: Prisma.JsonValue;
    purpose: string;
    slug: string;
    created_at: Date;
    updated_at: Date;
    status: string;
    visibility: string;
    agent_class: string;
    context_scope: string | null;
    memory_enabled: boolean;
    tools: string[];
    model_provider: string;
    model_settings: Prisma.JsonValue;
    created_by: string | null;
}[]>;
/**
 * Get a KIP agent by slug
 */
export declare function getKipAgentBySlug(slug: string): Promise<{
    model: string;
    name: string;
    id: string;
    permissions: string[];
    config: Prisma.JsonValue;
    purpose: string;
    slug: string;
    created_at: Date;
    updated_at: Date;
    status: string;
    visibility: string;
    agent_class: string;
    context_scope: string | null;
    memory_enabled: boolean;
    tools: string[];
    model_provider: string;
    model_settings: Prisma.JsonValue;
    created_by: string | null;
} | null>;
/**
 * Get a KIP agent by ID
 */
export declare function getKipAgentById(id: string): Promise<{
    model: string;
    name: string;
    id: string;
    permissions: string[];
    config: Prisma.JsonValue;
    purpose: string;
    slug: string;
    created_at: Date;
    updated_at: Date;
    status: string;
    visibility: string;
    agent_class: string;
    context_scope: string | null;
    memory_enabled: boolean;
    tools: string[];
    model_provider: string;
    model_settings: Prisma.JsonValue;
    created_by: string | null;
} | null>;
/**
 * Create a new KIP agent
 */
export declare function createKipAgent(data: {
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
}): Promise<{
    model: string;
    name: string;
    id: string;
    permissions: string[];
    config: Prisma.JsonValue;
    purpose: string;
    slug: string;
    created_at: Date;
    updated_at: Date;
    status: string;
    visibility: string;
    agent_class: string;
    context_scope: string | null;
    memory_enabled: boolean;
    tools: string[];
    model_provider: string;
    model_settings: Prisma.JsonValue;
    created_by: string | null;
}>;
/**
 * Update a KIP agent
 */
export declare function updateKipAgent(id: string, data: Partial<{
    slug: string;
    name: string;
    purpose: string;
    model: string;
    agent_class: string;
    context_scope: string;
    memory_enabled: boolean;
    tools: string[];
    permissions: string[];
    config: any;
    status: string;
}>): Promise<{
    model: string;
    name: string;
    id: string;
    permissions: string[];
    config: Prisma.JsonValue;
    purpose: string;
    slug: string;
    created_at: Date;
    updated_at: Date;
    status: string;
    visibility: string;
    agent_class: string;
    context_scope: string | null;
    memory_enabled: boolean;
    tools: string[];
    model_provider: string;
    model_settings: Prisma.JsonValue;
    created_by: string | null;
}>;
/**
 * Delete a KIP agent
 */
export declare function deleteKipAgent(id: string): Promise<{
    model: string;
    name: string;
    id: string;
    permissions: string[];
    config: Prisma.JsonValue;
    purpose: string;
    slug: string;
    created_at: Date;
    updated_at: Date;
    status: string;
    visibility: string;
    agent_class: string;
    context_scope: string | null;
    memory_enabled: boolean;
    tools: string[];
    model_provider: string;
    model_settings: Prisma.JsonValue;
    created_by: string | null;
}>;
/**
 * Create a new KIP agent log entry
 */
export declare function createKipAgentLog(data: {
    agent_id: string;
    user_id?: string;
    input: string;
    output?: string;
    error?: string;
    model?: string;
    execution_time_ms?: number;
}): Promise<{
    model: string | null;
    id: string;
    error: string | null;
    agent_id: string;
    created_at: Date;
    user_id: string | null;
    input: string;
    output: string | null;
    execution_time_ms: number | null;
}>;
/**
 * Get all KIP agent logs with pagination
 */
export declare function getKipAgentLogs(options?: {
    page?: number;
    pageSize?: number;
    agentId?: string;
    userId?: string;
}): Promise<{
    logs: ({
        agent: {
            model: string;
            name: string;
            id: string;
            slug: string;
        };
        user: {
            name: string | null;
            id: string;
            email: string | null;
        } | null;
    } & {
        model: string | null;
        id: string;
        error: string | null;
        agent_id: string;
        created_at: Date;
        user_id: string | null;
        input: string;
        output: string | null;
        execution_time_ms: number | null;
    })[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}>;
/**
 * Get logs for a specific agent
 */
export declare function getLogsByAgentId(agentId: string, options?: {
    page?: number;
    pageSize?: number;
}): Promise<{
    logs: ({
        agent: {
            model: string;
            name: string;
            id: string;
            slug: string;
        };
        user: {
            name: string | null;
            id: string;
            email: string | null;
        } | null;
    } & {
        model: string | null;
        id: string;
        error: string | null;
        agent_id: string;
        created_at: Date;
        user_id: string | null;
        input: string;
        output: string | null;
        execution_time_ms: number | null;
    })[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}>;
/**
 * Get logs for a specific user
 */
export declare function getLogsByUserId(userId: string, options?: {
    page?: number;
    pageSize?: number;
}): Promise<{
    logs: ({
        agent: {
            model: string;
            name: string;
            id: string;
            slug: string;
        };
        user: {
            name: string | null;
            id: string;
            email: string | null;
        } | null;
    } & {
        model: string | null;
        id: string;
        error: string | null;
        agent_id: string;
        created_at: Date;
        user_id: string | null;
        input: string;
        output: string | null;
        execution_time_ms: number | null;
    })[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}>;
/**
 * Get agent execution statistics
 */
export declare function getAgentStats(agentId?: string): Promise<{
    totalExecutions: number;
    avgExecutionTime: number | null;
    minExecutionTime: number | null;
    maxExecutionTime: number | null;
    errorCount: number;
    successRate: number;
}>;
/**
 * Create a new KIP session
 */
export declare function createKipSession(data: {
    agent_id: string;
    user_id?: string;
    session_name?: string;
}): Promise<{
    agent: {
        name: string;
        id: string;
        slug: string;
    };
    user: {
        name: string | null;
        id: string;
        email: string | null;
    } | null;
} & {
    id: string;
    agent_id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string | null;
    session_name: string | null;
}>;
/**
 * Get a KIP session by ID with messages
 */
export declare function getKipSessionById(sessionId: string): Promise<({
    messages: {
        id: string;
        content: string;
        created_at: Date;
        role: string;
        metadata: Prisma.JsonValue;
        session_id: string;
        sender: string;
    }[];
    agent: {
        name: string;
        id: string;
        slug: string;
    };
    user: {
        name: string | null;
        id: string;
        email: string | null;
    } | null;
} & {
    id: string;
    agent_id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string | null;
    session_name: string | null;
}) | null>;
/**
 * Get all sessions for an agent
 */
export declare function getSessionsByAgentId(agentId: string, options?: {
    page?: number;
    pageSize?: number;
}): Promise<{
    sessions: ({
        _count: {
            messages: number;
        };
        agent: {
            name: string;
            id: string;
            slug: string;
        };
        user: {
            name: string | null;
            id: string;
            email: string | null;
        } | null;
    } & {
        id: string;
        agent_id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string | null;
        session_name: string | null;
    })[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}>;
/**
 * Get all sessions for a user
 */
export declare function getSessionsByUserId(userId: string, options?: {
    page?: number;
    pageSize?: number;
}): Promise<{
    sessions: ({
        _count: {
            messages: number;
        };
        agent: {
            name: string;
            id: string;
            slug: string;
        };
        user: {
            name: string | null;
            id: string;
            email: string | null;
        } | null;
    } & {
        id: string;
        agent_id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string | null;
        session_name: string | null;
    })[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}>;
/**
 * Update session updated_at timestamp
 */
export declare function updateSessionTimestamp(sessionId: string): Promise<{
    id: string;
    agent_id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string | null;
    session_name: string | null;
}>;
/**
 * Delete a KIP session and all its messages
 */
export declare function deleteKipSession(sessionId: string): Promise<{
    id: string;
    agent_id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string | null;
    session_name: string | null;
}>;
/**
 * Create a new KIP message
 */
export declare function createKipMessage(data: {
    session_id: string;
    sender: 'user' | 'agent';
    content: string;
    role?: string;
    metadata?: any;
}): Promise<{
    session: {
        id: string;
        agent_id: string;
        user_id: string | null;
    };
} & {
    id: string;
    content: string;
    created_at: Date;
    role: string;
    metadata: Prisma.JsonValue;
    session_id: string;
    sender: string;
}>;
/**
 * Get all messages for a session
 */
export declare function getSessionMessages(sessionId: string): Promise<({
    session: {
        id: string;
        agent_id: string;
        user_id: string | null;
    };
} & {
    id: string;
    content: string;
    created_at: Date;
    role: string;
    metadata: Prisma.JsonValue;
    session_id: string;
    sender: string;
})[]>;
/**
 * Get latest messages for a session with limit
 */
export declare function getRecentSessionMessages(sessionId: string, limit?: number): Promise<({
    session: {
        id: string;
        agent_id: string;
        user_id: string | null;
    };
} & {
    id: string;
    content: string;
    created_at: Date;
    role: string;
    metadata: Prisma.JsonValue;
    session_id: string;
    sender: string;
})[]>;
/**
 * Delete all messages from a session
 */
export declare function deleteSessionMessages(sessionId: string): Promise<Prisma.BatchPayload>;
/**
 * Get message count for a session
 */
export declare function getSessionMessageCount(sessionId: string): Promise<number>;
//# sourceMappingURL=index.d.ts.map