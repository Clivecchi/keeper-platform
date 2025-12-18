/**
 * KIP Agent Service API
 * ===================
 * 
 * Handles KIP (Keeper Interface Protocol) agent operations
 * Provides endpoints for managing and running agents
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { Prisma, prisma } from '@keeper/database';
import { isDbDisabled } from '../../lib/env.js';
import { MOCK_AGENTS } from '../../services/kip/mockAgents.js';
import { resolveAgentEnvironment, type AgentEnvironmentContext } from '../../services/kip/resolveAgentEnvironment.js';
import type { KipEnvironmentContext } from '../../services/kip/buildKipEnvironmentContext.js';
import type { 
  AgentInput, 
  AgentResponse, 
  KipCommandIntent, 
  KipSessionInput, 
  KipMessageInput,
  KipSessionWithRelations,
  KipMessageWithRelations,
  ModelProvider,
  ModelSettings
} from '@keeper/database';
import { ModelProviderService, ModelMessage, ModelProviderErrorCode } from '../../services/ModelProviderService.js';
import { loadModeState } from '../../services/kip/modeConfig.js';
import type { AgentModeKey, AgentModeState, ModeConfig, OutputStyle } from '../../services/kip/modeConfig.js';
import type { DomainResolvedRequest } from '../../middleware/domainResolutionMiddleware.js';
import { DEFAULT_POLICY_PACK_V1, buildPolicyPackFromEnvironment } from '../../policy/policyPack.js';

type AgentErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_MODEL'
  | 'PROVIDER_UNAVAILABLE'
  | 'AGENT_MISCONFIGURED'
  | 'UNKNOWN';

type DebugBundleEntry = {
  id?: string;
  requestId?: string;
  method?: string;
  url?: string;
  status?: number | null;
  action?: string | null;
  durationMs?: number | null;
  error?: {
    message?: string;
    code?: string;
    constraint?: string;
  };
};

type DebugBundleInput = {
  entries?: DebugBundleEntry[];
  failures?: DebugBundleEntry[];
  authContextKeysPresent?: {
    hasUser?: boolean;
    hasAuth?: boolean;
    hasKam?: boolean;
    userKeys?: string[];
    authKeys?: string[];
    kamKeys?: string[];
    authorizationHeaderPresent?: boolean;
  };
  symptom?: string | null;
};

type RunAgentOptions = {
  domainId?: string | null;
  domainSlug?: string | null;
  mode?: AgentModeKey;
  debugBundle?: DebugBundleInput | null;
  environment?: AgentEnvironmentContext | KipEnvironmentContext | null;
};

class AgentExecutionError extends Error {
  code: AgentErrorCode;
  details?: Record<string, unknown>;

  constructor(code: AgentErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AgentExecutionError';
    this.code = code;
    this.details = details;
  }
}

type StructuredAgentAction = { type: string; payload?: Record<string, any> | null };
type ActionExecutionResult = {
  type: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
  data?: unknown;
};

const ACTION_DRAFT_LIMIT = 25;

function buildAllowedActions(environment?: AgentEnvironmentContext | KipEnvironmentContext | null): Set<string> {
  const pack = buildPolicyPackFromEnvironment(environment);
  return new Set(Array.isArray(pack?.actions?.allow) ? pack.actions.allow : DEFAULT_POLICY_PACK_V1.actions.allow);
}

function slugifyKey(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'draft'
  );
}

function parseStructuredAgentResponse(raw: string): { responseText: string; actions: StructuredAgentAction[]; raw: string } {
  const trimmed = raw.trim();
  const unfenced = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
    : trimmed;

  try {
    const parsed = JSON.parse(unfenced);
    const responseText = typeof parsed?.response === 'string' ? parsed.response : raw;
    const actions = Array.isArray(parsed?.actions)
      ? parsed.actions
          .filter((action: any) => action && typeof action.type === 'string')
          .map((action: any) => ({
            type: action.type,
            payload: action.payload ?? null,
          }))
      : [];

    return { responseText, actions, raw };
  } catch {
    return { responseText: raw, actions: [], raw };
  }
}

async function executeAgentActions(
  actions: StructuredAgentAction[],
  ctx: { domainId?: string | null; userId?: string; agentId?: string | null; allowlist: Set<string> },
): Promise<{ results: ActionExecutionResult[]; failedMessage: string | null }> {
  const results: ActionExecutionResult[] = [];
  if (!actions.length) return { results, failedMessage: null };

  await prisma.$transaction(async (tx) => {
    for (const action of actions) {
      const baseResult: ActionExecutionResult = { type: action.type, status: 'skipped' };

      try {
        if (!ctx.allowlist.has(action.type)) {
          results.push({ ...baseResult, status: 'error', message: 'Action not allowed by policy' });
          continue;
        }

        if (!ctx.domainId || !ctx.userId) {
          results.push({ ...baseResult, status: 'error', message: 'Missing domain or user context' });
          continue;
        }

        switch (action.type) {
          case 'draft.create': {
            const payload = action.payload ?? {};
            const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'Draft';
            const kind = typeof payload.kind === 'string' && payload.kind.trim() ? payload.kind.trim() : 'draft';
            const status = typeof payload.status === 'string' && payload.status.trim() ? payload.status.trim() : 'draft';
            const summary = typeof payload.summary === 'string' ? payload.summary : null;
            const spec = payload.spec ?? {};

            let key = slugifyKey(payload.key || title || `draft-${Date.now()}`);
            let created: any | null = null;
            let attempts = 0;

            while (!created && attempts < 2) {
              try {
                created = await tx.kip_drafts.create({
                  data: {
                    domain_id: ctx.domainId,
                    owner_id: ctx.userId,
                    agent_id: ctx.agentId ?? null,
                    kind,
                    key,
                    title,
                    summary,
                    status,
                    spec_json: spec,
                    updated_at: new Date(),
                  },
                });
              } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                  key = slugifyKey(`${key}-${Date.now()}`);
                  attempts += 1;
                  continue;
                }
                throw error;
              }
            }

            if (!created) {
              results.push({ ...baseResult, status: 'error', message: 'Failed to create draft' });
              break;
            }

            results.push({
              type: action.type,
              status: 'success',
              data: {
                id: created.id,
                title: created.title,
                kind: created.kind,
                status: created.status,
                key: created.key,
                summary: created.summary,
              },
            });
            break;
          }
          case 'draft.update': {
            const payload = action.payload ?? {};
            const draftId = payload.draftId || payload.id;
            const kind = payload.kind;
            const key = payload.key;

            const draft = await tx.kip_drafts.findFirst({
              where: {
                domain_id: ctx.domainId,
                owner_id: ctx.userId,
                ...(draftId
                  ? { id: draftId }
                  : kind && key
                    ? { kind: String(kind), key: String(key) }
                    : {}),
              },
            });

            if (!draft) {
              results.push({ ...baseResult, status: 'error', message: 'Draft not found for update' });
              break;
            }

            const updated = await tx.kip_drafts.update({
              where: { id: draft.id },
              data: {
                title: typeof payload.title === 'string' ? payload.title : draft.title,
                summary: typeof payload.summary === 'string' ? payload.summary : draft.summary,
                status: typeof payload.status === 'string' ? payload.status : draft.status,
                spec_json: payload.spec ?? draft.spec_json ?? {},
                updated_at: new Date(),
              },
            });

            results.push({
              type: action.type,
              status: 'success',
              data: {
                id: updated.id,
                title: updated.title,
                kind: updated.kind,
                status: updated.status,
                key: updated.key,
                summary: updated.summary,
              },
            });
            break;
          }
          case 'draft.list': {
            const drafts = await tx.kip_drafts.findMany({
              where: { domain_id: ctx.domainId, owner_id: ctx.userId },
              select: { id: true, kind: true, key: true, title: true, status: true, summary: true, updated_at: true },
              orderBy: { updated_at: 'desc' },
              take: ACTION_DRAFT_LIMIT,
            });

            results.push({
              type: action.type,
              status: 'success',
              data: drafts.map((draft) => ({
                id: draft.id,
                title: draft.title,
                kind: draft.kind,
                status: draft.status,
                key: draft.key,
                summary: draft.summary,
                updatedAt: draft.updated_at,
              })),
            });
            break;
          }
          case 'draft.get':
          case 'draft.read': {
            const payload = action.payload ?? {};
            const draftId = payload.draftId || payload.id;
            const kind = payload.kind;
            const key = payload.key;

            const draft = await tx.kip_drafts.findFirst({
              where: {
                domain_id: ctx.domainId,
                owner_id: ctx.userId,
                ...(draftId
                  ? { id: draftId }
                  : kind && key
                    ? { kind: String(kind), key: String(key) }
                    : {}),
              },
            });

            if (!draft) {
              results.push({ ...baseResult, status: 'error', message: 'Draft not found' });
              break;
            }

            results.push({
              type: action.type,
              status: 'success',
              data: {
                id: draft.id,
                title: draft.title,
                kind: draft.kind,
                status: draft.status,
                key: draft.key,
                summary: draft.summary,
                spec: draft.spec_json,
                updatedAt: draft.updated_at,
              },
            });
            break;
          }
          default:
            results.push({ ...baseResult, status: 'skipped', message: 'Unhandled action type' });
            break;
        }
      } catch (error) {
        results.push({
          type: action.type,
          status: 'error',
          message: error instanceof Error ? error.message : 'Action failed',
        });
      }
    }
  });

  const failed = results.find((result) => result.status === 'error');
  return { results, failedMessage: failed?.message || null };
}

// Database helper functions
const getAllKipAgents = async () => {
  return prisma.kip_agents.findMany({
    orderBy: [
      { status: 'asc' },
      { name: 'asc' }
    ]
  });
};

const getKipAgentById = async (id: string) => {
  return prisma.kip_agents.findUnique({
    where: { id }
  });
};

const getKipAgentBySlug = async (slug: string) => {
  return prisma.kip_agents.findUnique({
    where: { slug }
  });
};

const createKipAgent = async (data: AgentInput) => {
  return prisma.kip_agents.create({
    data: {
      ...data,
      updated_at: new Date()
    }
  });
};

const updateKipAgent = async (id: string, data: Partial<AgentInput>) => {
  return prisma.kip_agents.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date()
    }
  });
};

const deleteKipAgent = async (id: string) => {
  return prisma.kip_agents.delete({
    where: { id }
  });
};

const createKipAgentLog = async (data: {
  agent_id: string;
  user_id?: string;
  input: string;
  output?: string;
  error?: string;
  model?: string;
  execution_time_ms: number;
}) => {
  return prisma.kip_agent_logs.create({
    data
  });
};

const createKipSession = async (data: KipSessionInput) => {
  return prisma.kip_sessions.create({
    data: {
      ...data,
      updated_at: new Date()
    }
  });
};

const getKipSessionById = async (sessionId: string) => {
  return prisma.kip_sessions.findUnique({
    where: { id: sessionId },
    include: {
      kip_messages: {
        orderBy: { created_at: 'asc' }
      }
    }
  });
};

const getSessionsByAgentId = async (agentId: string, options: { page?: number; pageSize?: number } = {}) => {
  const { page = 1, pageSize = 50 } = options;
  const skip = (page - 1) * pageSize;

  const [sessions, total] = await Promise.all([
    prisma.kip_sessions.findMany({
      where: { agent_id: agentId },
      include: {
        _count: {
          select: { kip_messages: true }
        }
      },
      orderBy: { updated_at: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.kip_sessions.count({ where: { agent_id: agentId } })
  ]);

  return {
    sessions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrevious: page > 1
  };
};

const createKipMessage = async (data: KipMessageInput) => {
  return prisma.kip_messages.create({
    data
  });
};

const getSessionMessages = async (sessionId: string) => {
  return prisma.kip_messages.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: 'asc' }
  });
};

const getKipAgentLogs = async (options: {
  page?: number;
  pageSize?: number;
  agentId?: string;
  userId?: string;
} = {}) => {
  const { page = 1, pageSize = 50, agentId, userId } = options;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(agentId && { agent_id: agentId }),
    ...(userId && { user_id: userId })
  };

  const [rawLogs, total] = await Promise.all([
    prisma.kip_agent_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
      include: {
        kip_agents: {
          select: { id: true, name: true, slug: true }
        },
        users: {
          select: { id: true, name: true, email: true }
        }
      }
    }),
    prisma.kip_agent_logs.count({ where })
  ]);

  const logs = rawLogs.map(({ kip_agents, users, ...log }) => ({
    ...log,
    agent: kip_agents
      ? {
          id: kip_agents.id,
          name: kip_agents.name,
          slug: kip_agents.slug
        }
      : null,
    user: users
      ? {
          id: users.id,
          name: users.name,
          email: users.email
        }
      : null
  }));

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrevious: page > 1
  };
};

const getLogsByAgentId = async (agentId: string, options: { page?: number; pageSize?: number } = {}) => {
  return getKipAgentLogs({ ...options, agentId });
};

const getAgentStats = async (agentId?: string) => {
  const where = agentId ? { agent_id: agentId } : {};
  
  const [totalExecutions, totalErrors, avgExecutionTime] = await Promise.all([
    prisma.kip_agent_logs.count({ where }),
    prisma.kip_agent_logs.count({ where: { ...where, error: { not: null } } }),
    prisma.kip_agent_logs.aggregate({
      where,
      _avg: { execution_time_ms: true }
    })
  ]);

  return {
    totalExecutions,
    totalErrors,
    successRate: totalExecutions > 0 ? ((totalExecutions - totalErrors) / totalExecutions) * 100 : 0,
    avgExecutionTime: avgExecutionTime._avg.execution_time_ms || 0
  };
};

// Define proper types for agents
interface AgentConfig {
  avatar?: string;
  tagline?: string;
  personality?: string;
  capabilities?: string[];
  theme_color?: string;
  bundle?: string[];
}

interface TypedAgent {
  id: string;
  slug: string;
  name: string;
  agent_class: string;
  model: string;
  memory_enabled?: boolean;
  model_provider?: ModelProvider;
  model_settings?: ModelSettings;
  purpose?: string;
  tools?: string[];
  context_scope?: string;
  config?: AgentConfig;
}

// Input validation schemas
const DebugBundleEntrySchema = z.object({
  id: z.string().optional(),
  requestId: z.string().optional(),
  method: z.string().optional(),
  url: z.string().optional(),
  status: z.number().nullable().optional(),
  action: z.string().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  error: z
    .object({
      message: z.string().optional(),
      code: z.string().optional(),
      constraint: z.string().optional(),
    })
    .optional(),
});

const DebugBundleSchema = z.object({
  entries: z.array(DebugBundleEntrySchema).optional(),
  failures: z.array(DebugBundleEntrySchema).optional(),
  authContextKeysPresent: z
    .object({
      hasUser: z.boolean().optional(),
      hasAuth: z.boolean().optional(),
      hasKam: z.boolean().optional(),
      userKeys: z.array(z.string()).optional(),
      authKeys: z.array(z.string()).optional(),
      kamKeys: z.array(z.string()).optional(),
      authorizationHeaderPresent: z.boolean().optional(),
    })
    .optional(),
  symptom: z.string().nullable().optional(),
}).optional();

const AgentRunSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  input: z.string().min(1, 'Input is required'),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  domainId: z.string().optional(),
  domainSlug: z.string().optional(),
  mode: z.enum(['domain', 'debug']).optional(),
  debugBundle: DebugBundleSchema,
});

const CreateSessionSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  sessionName: z.string().optional(),
});

const TagsInputSchema = z.union([z.array(z.any()), z.string(), z.record(z.any())]).optional();

const SessionMetadataUpdatesSchema = z.object({
  session_name: z.string().optional(),
  summary: z.string().optional().nullable(),
  tags: TagsInputSchema,
});

const UpdateSessionMetadataSchema = z.object({
  action: z.literal('updateSessionMetadata').optional(),
  agentId: z.string().optional(),
  sessionId: z.string().min(1, 'Session ID is required'),
  updates: SessionMetadataUpdatesSchema.optional(),
  // Back-compat top-level fields
  session_name: z.string().optional(),
  summary: z.string().optional().nullable(),
  tags: TagsInputSchema,
});

type NormalizedSessionMetadataUpdates = {
  session_name?: string;
  summary?: string | null;
  tags?: string[];
};

type UpdateSessionMetadataParams = {
  sessionId: string;
  agentId: string;
  userId: string;
  updates: NormalizedSessionMetadataUpdates;
};

const cleanTagValue = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const bracketMatch = text.match(/^\[(.*)\]$/);
  const stripped = bracketMatch ? bracketMatch[1]?.trim() : text;
  return stripped || null;
};

const normalizeTagsInput = (raw: unknown): { tags?: string[]; error?: string } => {
  if (raw === undefined) return { tags: undefined };
  if (raw === null) return { tags: [] };

  const finalize = (values: unknown[]) => {
    const normalized = values
      .map(cleanTagValue)
      .filter((item): item is string => Boolean(item));
    return Array.from(new Set(normalized));
  };

  if (Array.isArray(raw)) {
    return { tags: finalize(raw) };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { tags: [] };

    if (/^[\[{].*[\]}]$/.test(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return { tags: finalize(parsed) };
        }
      } catch {
        // Fall through to comma/segment parsing
      }
    }

    const segments = trimmed.includes(',') ? trimmed.split(',') : [trimmed];
    return { tags: finalize(segments) };
  }

  if (typeof raw === 'object') {
    const values = Object.values(raw as Record<string, unknown>);
    return { tags: finalize(values) };
  }

  return { error: 'Invalid tags format' };
};

const normalizeSessionMetadataUpdates = (
  input: z.infer<typeof UpdateSessionMetadataSchema>
): { updates: NormalizedSessionMetadataUpdates; error?: string } => {
  const source = input.updates || {};
  const sessionName = input.session_name ?? (source as any).session_name;
  const summary = input.summary ?? (source as any).summary;
  const tagsRaw = input.tags !== undefined ? input.tags : (source as any).tags;

  const updates: NormalizedSessionMetadataUpdates = {};

  if (sessionName !== undefined) {
    updates.session_name = sessionName;
  }

  if (summary !== undefined) {
    updates.summary = summary ?? null;
  }

  if (tagsRaw !== undefined) {
    const normalizedTags = normalizeTagsInput(tagsRaw);
    if (normalizedTags.error) {
      return { updates: {}, error: normalizedTags.error };
    }
    if (normalizedTags.tags !== undefined) {
      updates.tags = normalizedTags.tags;
    }
  }

  return { updates };
};

/**
 * KipAgentService - Core agent management functions
 */
export class KipAgentService {
  /**
   * Generate response for Lead agents with conversational intelligence
   */
  static generateLeadAgentResponse(agent: TypedAgent, input: string): string {
    const config = agent.config || {};
    const personality = config.personality || 'helpful';
    
    // Generate contextual responses based on agent personality and capabilities
    switch (agent.slug) {
      case 'kip':
        return `Hello! I'm Kip, ${config.tagline || 'your AI companion'}. I understand you said: "${input}". As your thought processing assistant, I can help you organize ideas, analyze patterns, and coordinate tasks. How would you like me to assist you with this today?`;
      
      case 'ceox':
        return `Greetings. I'm CeoX, ${config.tagline || 'your strategic AI partner'}. You've shared: "${input}". From an executive perspective, I can provide strategic analysis, business intelligence, and decision support. What strategic insights or recommendations would be most valuable for you regarding this matter?`;
      
      default:
        return `Hello! I'm ${agent.name}. I see you've mentioned: "${input}". Based on my capabilities in ${config.capabilities?.join(', ') || 'general assistance'}, I'm here to help. What specific assistance can I provide?`;
    }
  }

  /**
   * Validate agent data before processing
   */
  static validateAgent(agent: unknown): TypedAgent {
    if (!agent || typeof agent !== 'object') {
      throw new Error('Invalid agent data');
    }

    const typedAgent = agent as Partial<TypedAgent>;

    if (!typedAgent.id || !typedAgent.slug || !typedAgent.name) {
      throw new Error('Agent missing required fields: id, slug, name');
    }

    return {
      id: typedAgent.id,
      slug: typedAgent.slug,
      name: typedAgent.name,
      agent_class: typedAgent.agent_class || 'Lead',
      model: typedAgent.model || 'gpt-3.5-turbo',
      memory_enabled: typedAgent.memory_enabled || false,
      model_provider: typedAgent.model_provider || 'openai',
      model_settings: typedAgent.model_settings || ModelProviderService.getDefaultSettings('openai'),
      purpose: typedAgent.purpose || 'General assistance',
      tools: typedAgent.tools || [],
      context_scope: typedAgent.context_scope || 'general',
      config: typedAgent.config || {}
    };
  }

  /**
   * Create a new agent with validation
   */
  static async createAgent(input: AgentInput): Promise<TypedAgent> {
    try {
      // Validate input
      if (!input.name || !input.slug) {
        throw new Error('Agent name and slug are required');
      }

      // Check if agent with slug already exists
      const existingAgent = await getKipAgentBySlug(input.slug);
      if (existingAgent) {
        throw new Error(`Agent with slug '${input.slug}' already exists`);
      }

      const agent = await createKipAgent(input);
      return this.validateAgent(agent);
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all available agents
   */
  static async getAllAgents(): Promise<TypedAgent[]> {
    try {
      const agents = await getAllKipAgents();
      return agents.map((agent: any) => this.validateAgent(agent));
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw new Error('Failed to fetch agents');
    }
  }

  /**
   * Get agent by ID or slug safely
   */
  static async getAgentSafely(identifier: string): Promise<TypedAgent> {
    try {
      let agent;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      if (isUUID) {
        agent = await getKipAgentById(identifier);
      } else {
        agent = await getKipAgentBySlug(identifier);
      }

      if (!agent) {
        throw new Error(`Agent with ${isUUID ? 'ID' : 'slug'} '${identifier}' not found`);
      }

      return this.validateAgent(agent);
    } catch (error) {
      console.error('Error fetching agent:', error);
      throw new Error(`Failed to fetch agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing agent
   */
  static async updateAgent(id: string, input: Partial<AgentInput>): Promise<TypedAgent> {
    try {
      const existingAgent = await this.getAgentSafely(id);
      const updatedAgent = await updateKipAgent(existingAgent.id, input);
      return this.validateAgent(updatedAgent);
    } catch (error) {
      console.error('Error updating agent:', error);
      throw new Error(`Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an agent
   */
  static async deleteAgent(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const existingAgent = await this.getAgentSafely(id);
      await deleteKipAgent(existingAgent.id);
      return { success: true, message: `Agent '${existingAgent.name}' deleted successfully` };
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw new Error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new session with validation
   */
  static async createSession(agentId: string, userId?: string, sessionName?: string): Promise<KipSessionWithRelations> {
    try {
      if (!userId) {
        throw new Error('User ID is required to create a session');
      }
      // Validate agent exists
      const agent = await this.getAgentSafely(agentId);
      
      const sessionData: KipSessionInput = {
        agent_id: agent.id,
        user_id: userId,
        session_name: sessionName || `Session with ${agent.name}`,
      };

      return await createKipSession(sessionData);
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update session metadata (name, summary, tags)
   */
  static async updateSessionMetadata(input: UpdateSessionMetadataParams): Promise<KipSessionWithRelations> {
    try {
      const payload = {
        ...(input.updates.session_name !== undefined ? { session_name: input.updates.session_name } : {}),
        ...(input.updates.summary !== undefined ? { summary: input.updates.summary } : {}),
        ...(input.updates.tags !== undefined ? { tags: input.updates.tags } : {}),
      };

      if (Object.keys(payload).length === 0) {
        throw new Error('No session metadata provided to update');
      }

      const updated = await prisma.kip_sessions.updateMany({
        where: {
          id: input.sessionId,
          agent_id: input.agentId,
          user_id: input.userId,
        },
        data: {
          ...payload,
          updated_at: new Date(),
        },
      });

      if (!updated.count) {
        throw new Error('Session not found for user/agent');
      }

      const session = await prisma.kip_sessions.findUnique({
        where: { id: input.sessionId },
        include: {
          kip_messages: {
            orderBy: { created_at: 'asc' },
          },
        },
      });

      if (!session) {
        throw new Error('Session not found after update');
      }

      return session as unknown as KipSessionWithRelations;
    } catch (error) {
      console.error('Error updating session metadata:', error);
      throw new Error(`Failed to update session metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get session memory safely
   */
  static async getSessionMemory(sessionId: string): Promise<KipMessageWithRelations[]> {
    try {
      const session = await getKipSessionById(sessionId);
      if (!session) {
        throw new Error(`Session with ID '${sessionId}' not found`);
      }
      
      return await getSessionMessages(sessionId);
    } catch (error) {
      console.error('Error fetching session memory:', error);
      throw new Error(`Failed to fetch session memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save message to session with validation
   */
  static async saveMessage(
    sessionId: string, 
    sender: 'user' | 'agent', 
    content: string, 
    role: string, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      if (!sessionId || !sender || !content || !role) {
        throw new Error('Session ID, sender, content, and role are required');
      }

      const messageData: KipMessageInput = {
        session_id: sessionId,
        sender,
        content,
        role,
        metadata: metadata || {}
      };
      
      await createKipMessage(messageData);
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error(`Failed to save message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Lead agent response with memory context (Legacy - for fallback)
   */
  static generateLeadAgentResponseWithMemory(agent: TypedAgent, input: string, previousMessages: KipMessageWithRelations[]): string {
    const config = agent.config || {};
    const personality = config.personality || 'helpful';
    
    // Build context from previous messages
    const recentContext = previousMessages.slice(-6).map(msg => 
      `${msg.sender}: ${msg.content}`
    ).join('\n');
    
    const hasContext = previousMessages.length > 0;
    const contextPrompt = hasContext ? 
      `\n\nBased on our previous conversation:\n${recentContext}\n\nNow responding to: "${input}"` :
      `\n\nResponding to: "${input}"`;
    
    switch (agent.slug) {
      case 'kip':
        const greeting = hasContext ? 'I remember our conversation.' : 'Hello! I\'m Kip, your AI companion.';
        return `${greeting} ${contextPrompt}\n\nAs your thought processing assistant with memory of our discussion, I can help you build on our previous insights, analyze patterns, and coordinate tasks. How would you like me to assist you with this continuation of our conversation?`;
      
      case 'ceox':
        const greeting2 = hasContext ? 'Continuing our strategic discussion.' : 'Greetings. I\'m CeoX, your strategic AI partner.';
        return `${greeting2} ${contextPrompt}\n\nWith the context of our previous exchanges, I can provide strategic analysis that builds on our earlier insights, business intelligence that connects to previous decisions, and decision support that considers our conversation history. What strategic insights would be most valuable for you regarding this matter?`;
      
      default:
        const greeting3 = hasContext ? `Continuing our conversation, I'm ${agent.name}.` : `Hello! I'm ${agent.name}.`;
        return `${greeting3} ${contextPrompt}\n\nBased on my capabilities in ${config.capabilities?.join(', ') || 'general assistance'} and our conversation history, I'm here to help. What specific assistance can I provide?`;
    }
  }

  /**
   * Call real AI model with conversation context
   */
  static async callAIModel(
    agent: TypedAgent,
    input: string,
    previousMessages: KipMessageWithRelations[],
    userId?: string,
    promptOptions?: {
      mode: AgentModeKey;
      modeConfig: ModeConfig;
      lens?: { systemPrompt?: string | null };
      debugSummary?: string | null;
      maxChars?: number | null;
      outputStyle?: OutputStyle;
      includeFixPlan?: boolean;
      autoBrief?: boolean;
      environment?: AgentEnvironmentContext | KipEnvironmentContext | null;
    },
  ): Promise<string> {
    try {
      const modelProvider = agent.model_provider || 'openai';
      const modelSettings = agent.model_settings || ModelProviderService.getDefaultSettings(modelProvider);
      
      // Build conversation messages for the AI model
      const messages: ModelMessage[] = [];
      
      // Add system message with agent context
      const config = agent.config || {};
      const styleHelper: Record<OutputStyle, string> = {
        concise: 'Keep replies compact and bullet-first where possible.',
        normal: 'Balance clarity with brevity; surface key evidence first.',
        expanded: 'Provide fuller reasoning and details while staying structured.',
      };
      const outputStyle = (promptOptions?.outputStyle as OutputStyle) || 'normal';
      const maxChars = typeof promptOptions?.maxChars === 'number' ? promptOptions.maxChars : null;
      const mode = promptOptions?.mode || 'domain';
      const systemPrompt = [
        promptOptions?.lens?.systemPrompt || '',
        `You are ${agent.name}, ${agent.purpose}. ${config.tagline || ''}`.trim(),
        `Mode: ${mode.toUpperCase()}. Output style: ${styleHelper[outputStyle]}`,
        maxChars && maxChars > 0
          ? `Hard limit: keep the Debug Brief under ${maxChars} characters; prefer concise evidence.`
          : 'No hard character limit configured for this mode.',
        mode === 'debug' && promptOptions?.autoBrief !== false
          ? `When in Debug mode, start with a "Debug Brief" that fits within the limit, including sections: Summary (bullets), Evidence (requestId/action/id/auth context), Error (code/constraint/message), Probable cause, Next actions (3-6 bullets)${promptOptions?.includeFixPlan ? ', and Fix Plan' : ''}. Cite evidence and ask for at most one missing fact. Avoid dumping raw bundles unless explicitly requested.`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n');
      
      messages.push({
        role: 'system',
        content: systemPrompt
      });

      if (mode === 'debug' && promptOptions?.debugSummary) {
        messages.push({
          role: 'system',
          content: `Bounded debug bundle:\n${promptOptions.debugSummary}`,
        });
      }

      const environmentContext = promptOptions?.environment ?? null;
      const modelInput = {
        input,
        environment: environmentContext,
        agent: { id: agent.id },
      };

      if (environmentContext) {
        messages.push({
          role: 'system',
          content: `Environment context (resolved via KAM):\n${JSON.stringify(environmentContext, null, 2)}`,
        });

        const policyPack = buildPolicyPackFromEnvironment(environmentContext as any);
        const allowList =
          Array.isArray(policyPack?.actions?.allow) && policyPack.actions.allow.length
            ? policyPack.actions.allow
            : DEFAULT_POLICY_PACK_V1.actions.allow;

        const draftRules = (environmentContext as any)?.policy?.policy?.drafts ?? {};
        messages.push({
          role: 'system',
          content: [
            'Structured response required: reply with JSON containing "response" (string) and optional "actions" (array).',
            `Allowed actions: ${allowList.join(', ')}.`,
            'Each action must include a "type" and optional "payload".',
            'Do not state that drafts were saved unless you return a draft.create or draft.update action.',
            draftRules?.autoDraft?.enabled
              ? `If autoDraft thresholds are met (sections >= ${draftRules?.autoDraft?.thresholds?.minSections ?? 0}, chars >= ${draftRules?.autoDraft?.thresholds?.minChars ?? 0}) or the user explicitly asks for a draft, include draft.create (or draft.update) with a short confirmation message.`
              : 'If the user explicitly asks for a draft, include draft.create (or draft.update) with a short confirmation message.',
          ]
            .filter(Boolean)
            .join('\n'),
        });
      }
      
      // Add conversation history (last 10 messages to avoid token limits)
      const recentMessages = previousMessages.slice(-10);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
      
      // Add current user message
      const userContent = typeof modelInput.input === 'string' ? modelInput.input : JSON.stringify(modelInput.input);
      messages.push({
        role: 'user',
        content: userContent
      });
      
      // Call the model provider
      const response = await ModelProviderService.callModel({
        messages,
        settings: modelSettings,
        provider: modelProvider,
        userId,
        environment: promptOptions?.environment ?? undefined,
      });
      
      if (response.success) {
        return response.content;
      }

      const mappedCode = mapProviderCodeToAgentCode(response.errorCode);
      throw new AgentExecutionError(
        mappedCode,
        response.error || 'AI model call failed',
        {
          provider: modelProvider,
          model: modelSettings.model,
          retries: response.retries_used
        }
      );
    } catch (error) {
      console.error('Error calling AI model:', error);
      throw error;
    }
  }

  /**
   * Run an agent with provided input, comprehensive logging, and memory persistence
   */
  static async runAgent(
    agentId: string,
    input: string,
    userId?: string,
    sessionId?: string,
    options?: RunAgentOptions,
  ): Promise<AgentResponse | KipCommandIntent> {
    const startTime = Date.now();
    const logData = {
      agent_id: agentId,
      user_id: userId,
      input: input,
      model: undefined as string | undefined,
      output: undefined as string | undefined,
      error: undefined as string | undefined,
      execution_time_ms: 0
    };
    
    try {
      // Validate input
      if (!agentId || !input) {
        throw new Error('Agent ID and input are required');
      }

      // Get agent safely using our helper method
      const agent = await this.getAgentSafely(agentId);

      // Update log to use the actual agent UUID for consistency
      logData.agent_id = agent.id;
      logData.model = agent.model;

      // Resolve mode configuration (per agent + domain)
      const modeState = isDbDisabled() ? null : await loadModeState(agent.id, options?.domainId);
      const activeMode: AgentModeKey =
        options?.mode === 'debug'
          ? 'debug'
          : options?.mode === 'domain'
            ? 'domain'
            : modeState?.state.activeMode || 'domain';
      const fallbackModeConfig: ModeConfig = {
        outputStyle: 'normal',
        limits: { maxChars: activeMode === 'debug' ? 2000 : 0 },
        captureN: 20,
        autoBrief: true,
        includeFixPlan: true,
      };
      const activeModeConfig = (modeState?.state.modeConfigs[activeMode] as ModeConfig) || fallbackModeConfig;
      const lensId =
        activeModeConfig.lensId ||
        (activeMode === 'debug' ? modeState?.lenses?.debugLensId : modeState?.lenses?.domainLensId) ||
        null;
      const lens =
        !isDbDisabled() && lensId ? await prisma.kip_lenses.findUnique({ where: { id: lensId } }) : null;
      const debugSummary =
        activeMode === 'debug' ? formatDebugBundleSummary(options?.debugBundle, activeModeConfig) : null;
      const maxChars = typeof activeModeConfig.limits?.maxChars === 'number' ? activeModeConfig.limits.maxChars : null;

      // Handle different agent classes
      let result: unknown;

      // Handle Lead agents - interactive chat experience with memory
      if (agent.agent_class === 'Lead') {
        let currentSessionId = sessionId;
        let previousMessages: KipMessageWithRelations[] = [];
        
        // Handle memory for memory-enabled agents
        if (agent.memory_enabled) {
          if (sessionId) {
            // Load existing session memory
            try {
              previousMessages = await this.getSessionMemory(sessionId);
            } catch (error) {
              console.warn('Failed to load session memory:', error);
              // Continue without memory if loading fails
            }
          } else {
            // Create new session for memory-enabled agents
            try {
              const newSession = await this.createSession(agentId, userId);
              currentSessionId = newSession.id;
            } catch (error) {
              console.warn('Failed to create session:', error);
              // Continue without memory if session creation fails
            }
          }
          
          // Save user message to memory if we have a session
          if (currentSessionId) {
            try {
              await this.saveMessage(currentSessionId, 'user', input, 'user', {
                timestamp: new Date().toISOString(),
                agent_id: agentId
              });
            } catch (error) {
              console.warn('Failed to save user message:', error);
            }
          }
        }
        
        // Generate response using real AI model with memory context
        const response = await this.callAIModel(agent, input, previousMessages, userId, {
          mode: activeMode,
          modeConfig: activeModeConfig,
          lens: { systemPrompt: lens?.systemPrompt || null },
          debugSummary,
          maxChars,
          outputStyle: (activeModeConfig.outputStyle as OutputStyle) || 'normal',
          includeFixPlan: activeModeConfig.includeFixPlan,
          autoBrief: activeModeConfig.autoBrief,
          environment: options?.environment ?? null,
        });

        const structured = parseStructuredAgentResponse(response);
        const allowActions = buildAllowedActions(options?.environment ?? null);

        let finalResponseText = structured.responseText;
        let actionResults: ActionExecutionResult[] = [];

        if (structured.actions.length) {
          const execution = await executeAgentActions(structured.actions, {
            domainId: options?.domainId ?? null,
            userId,
            agentId: agent.id,
            allowlist: allowActions,
          });
          actionResults = execution.results;

          if (execution.failedMessage) {
            finalResponseText = structured.responseText
              ? `${structured.responseText} I attempted to create a draft but saving failed: ${execution.failedMessage}`
              : `I attempted to create a draft but saving failed: ${execution.failedMessage}`;
          }
        }
        
        // Save agent response to memory if we have a session
        if (agent.memory_enabled && currentSessionId) {
          try {
            await this.saveMessage(currentSessionId, 'agent', finalResponseText, 'assistant', {
              timestamp: new Date().toISOString(),
              agent_id: agentId,
              model: agent.model
            });
          } catch (error) {
            console.warn('Failed to save agent response:', error);
          }
        }
        
        const config = agent.config || {};
        result = {
          action: 'lead_interaction',
          keeper_id: userId || 'lead_user',
          type: 'conversation',
          data: {
            response: finalResponseText,
            agent_name: agent.name,
            agent_avatar: config.avatar || '🤖',
            agent_tagline: config.tagline || 'Your AI assistant',
            personality: config.personality || 'helpful',
            capabilities: config.capabilities || [],
            theme_color: config.theme_color || '#3b82f6',
            session_id: currentSessionId || `lead_${agent.slug}_${Date.now()}`,
            memory_enabled: agent.memory_enabled,
            message_count: previousMessages.length + (agent.memory_enabled ? 2 : 0), // +2 for current user/agent messages
            model: agent.model,
            actions: actionResults,
            model_response_raw: response,
            timestamp: new Date().toISOString()
          }
        };
      }
      // Handle Coordinator agents
      else if (agent.agent_class === 'Coordinator') {
        const config = agent.config || {};
        const subAgentSlugs = config.bundle || [];
        console.log(`[Coordinator] Running ${subAgentSlugs.length} sub-agents:`, subAgentSlugs);
        
        if (subAgentSlugs.length === 0) {
          result = {
            action: 'coordinator_execution',
            keeper_id: userId || 'coordinator',
            type: 'coordination',
            data: {
              message: 'No sub-agents configured in bundle',
              agent_used: agent.name,
              model: agent.model,
              sub_agents: []
            }
          };
        } else {
          // Execute sub-agents in sequence
          const subResults = [];
          for (const slug of subAgentSlugs) {
            try {
              const subAgent = await getKipAgentBySlug(slug);
              if (subAgent) {
                const subResult = await this.runAgent(subAgent.id, input, userId, sessionId, options);
                const agentResponse = subResult as AgentResponse;
                subResults.push({
                  agent_slug: slug,
                  agent_name: subAgent.name,
                  success: agentResponse.success,
                  data: agentResponse.data,
                  execution_time_ms: agentResponse.processing_time_ms
                });
              } else {
                subResults.push({
                  agent_slug: slug,
                  agent_name: 'Unknown',
                  success: false,
                  error: `Agent with slug '${slug}' not found`,
                  execution_time_ms: 0
                });
              }
            } catch (error) {
              subResults.push({
                agent_slug: slug,
                agent_name: 'Unknown',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                execution_time_ms: 0
              });
            }
          }

          result = {
            action: 'coordinator_execution',
            keeper_id: userId || 'coordinator',
            type: 'coordination',
            data: {
              input: input,
              coordinator_agent: agent.name,
              model: agent.model,
              sub_agents_executed: subResults.length,
              successful_executions: subResults.filter(r => r.success).length,
              failed_executions: subResults.filter(r => !r.success).length,
              results: subResults
            }
          };
        }
      } else {
        // Standard agent execution based on agent slug
        result = this.getStandardAgentResult(agent, input, userId);
      }

      const processingTime = Date.now() - startTime;
      logData.execution_time_ms = processingTime;
      logData.output = JSON.stringify(result);

      // Log successful execution
      try {
        await createKipAgentLog(logData);
      } catch (logError) {
        console.warn('Failed to log agent execution:', logError);
      }

      // Return AgentResponse format for consistency
      return {
        id: agent.id,
        success: true,
        data: result,
        processing_time_ms: processingTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = resolveAgentErrorCode(error);
      const errorDetails = error instanceof AgentExecutionError ? error.details : undefined;
      console.error('Error running agent:', {
        message: errorMessage,
        code: errorCode,
      });
      
      logData.execution_time_ms = Date.now() - startTime;
      logData.error = errorMessage;

      // Log failed execution
      try {
        await createKipAgentLog(logData);
      } catch (logError) {
        console.warn('Failed to log agent execution error:', logError);
      }

      return {
        id: agentId,
        success: false,
        data: { error: errorMessage, errorCode, details: errorDetails },
        processing_time_ms: logData.execution_time_ms
      };
    }
  }

  /**
   * Get standard agent result based on agent slug
   */
  private static getStandardAgentResult(agent: TypedAgent, input: string, userId?: string): KipCommandIntent {
    switch (agent.slug) {
      case 'type-agent':
        return {
          action: 'capture_thought',
          keeper_id: userId || 'user_anonymous',
          type: 'reflection',
          data: {
            content: input,
            extracted_entities: ['thought', 'reflection'],
            sentiment: 'neutral',
            category: 'personal',
            confidence: 0.85,
            agent_used: agent.name,
            model: agent.model
          }
        };

      case 'platform-agent':
        return {
          action: 'system_analysis',
          keeper_id: 'system',
          type: 'platform_insight',
          data: {
            analysis: `Platform analysis of: ${input}`,
            recommendations: ['optimize_database_queries', 'enhance_user_experience'],
            priority: 'medium',
            agent_used: agent.name,
            model: agent.model
          }
        };

      case 'code-agent':
        return {
          action: 'code_analysis',
          keeper_id: 'codebase',
          type: 'technical_review',
          data: {
            analysis: `Code analysis for: ${input}`,
            suggestions: ['add_type_safety', 'improve_error_handling'],
            complexity_score: 6,
            agent_used: agent.name,
            model: agent.model
          }
        };

      default:
        return {
          action: 'generic_processing',
          keeper_id: userId || 'unknown',
          type: 'general',
          data: {
            processed_input: input,
            agent_used: agent.name,
            model: agent.model
          }
        };
    }
  }
}

function mapProviderCodeToAgentCode(code?: ModelProviderErrorCode): AgentErrorCode {
  switch (code) {
    case 'MISSING_API_KEY':
      return 'MISSING_API_KEY';
    case 'INVALID_MODEL':
      return 'INVALID_MODEL';
    case 'PROVIDER_UNAVAILABLE':
    default:
      return 'PROVIDER_UNAVAILABLE';
  }
}

function resolveAgentErrorCode(error: unknown): AgentErrorCode {
  if (error instanceof AgentExecutionError) {
    return error.code;
  }

  if (error instanceof Error && /not found/i.test(error.message)) {
    return 'AGENT_MISCONFIGURED';
  }

  return 'UNKNOWN';
}

type UserIdSource = 'req.user.id' | 'req.kam.userId' | 'req.auth.user.id' | 'res.locals.user.id';

function resolveUserId(req: Request, res?: Response): { userId?: string; source?: UserIdSource } {
  const fromResLocals = (res as any)?.locals?.user?.id;
  if (fromResLocals) return { userId: String(fromResLocals), source: 'res.locals.user.id' };

  const fromReqUser = (req as any).user?.id;
  if (fromReqUser) return { userId: String(fromReqUser), source: 'req.user.id' };

  const fromReqAuth = (req as any).auth?.kind === 'user' ? (req as any).auth.userId : undefined;
  if (fromReqAuth) return { userId: String(fromReqAuth), source: 'req.auth.user.id' };

  const fromKam = (req as any).kam?.userId;
  if (fromKam) return { userId: String(fromKam), source: 'req.kam.userId' };

  return { userId: undefined, source: undefined };
}

const resolveDomain = (req: DomainResolvedRequest): { domainId: string | null; domainSlug: string | null } => {
  const fromContext: any = req.domainContext?.domain;
  const ctxId = (fromContext && (fromContext.id || (fromContext as any).domainId)) ?? null;
  const ctxSlug = (fromContext && (fromContext.slug || (fromContext as any).domainSlug)) ?? req.domainContext?.resolvedSlug ?? null;

  const headerId = (req.headers['x-domain-id'] as string | undefined) || null;
  const headerSlug = (req.headers['x-domain-slug'] as string | undefined) || (req.headers['x-domain'] as string | undefined) || null;

  const bodyId = (req.body as any)?.domainId || null;
  const bodySlug = (req.body as any)?.domainSlug || null;

  return {
    domainId: ctxId || headerId || bodyId || null,
    domainSlug: ctxSlug || headerSlug || bodySlug || null,
  };
};

const buildContextFlags = (req: Request, userId?: string | null, domain?: { domainId: string | null; domainSlug: string | null }) => ({
  authCookiePresent: Boolean((req as any).cookies?.keeper_session),
  authHeaderPresent: Boolean(req.headers.authorization),
  resolvedUserIdPresent: Boolean(userId),
  domainContextPresent: Boolean((req as any).domainContext),
  xDomainHeadersPresent: Boolean(req.headers['x-domain-id'] || req.headers['x-domain-slug'] || req.headers['x-domain']),
  resolvedDomainIdPresent: Boolean(domain?.domainId),
});

const truncateValue = (value: string | undefined | null, limit = 160) => {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
};

const summarizeDebugEntry = (entry: DebugBundleEntry): string => {
  const method = entry.method || '';
  const url = entry.url ? truncateValue(entry.url, 140) : '';
  const status = typeof entry.status === 'number' ? entry.status : '—';
  const duration = typeof entry.durationMs === 'number' ? `${entry.durationMs}ms` : '';
  const requestId = entry.requestId ? `requestId=${entry.requestId}` : '';
  const action = entry.action ? `action=${entry.action}` : '';
  return [method, url, `→ ${status}`, duration, requestId, action].filter(Boolean).join(' ').trim();
};

const formatDebugBundleSummary = (bundle: DebugBundleInput | null | undefined, modeConfig?: ModeConfig): string | null => {
  if (!bundle) return null;
  const captureN = modeConfig?.captureN ?? 20;
  const entries = (bundle.entries || []).slice(-captureN);
  const failureCandidates = bundle.failures && bundle.failures.length > 0
    ? bundle.failures
    : entries.filter((entry) => (typeof entry.status === 'number' && entry.status >= 400) || entry.error);
  const failures = failureCandidates.slice(-5);
  const auth = bundle.authContextKeysPresent;
  const authLine = auth
    ? `Auth context: user=${auth.hasUser ? 'yes' : 'no'}, auth=${auth.hasAuth ? 'yes' : 'no'}, kam=${auth.hasKam ? 'yes' : 'no'}, authzHeader=${auth.authorizationHeaderPresent ? 'yes' : 'no'}, userKeys=${(auth.userKeys || []).join(',') || '—'}, authKeys=${(auth.authKeys || []).join(',') || '—'}, kamKeys=${(auth.kamKeys || []).join(',') || '—'}`
    : 'Auth context: unknown';

  const lines: string[] = [];
  if (bundle.symptom) {
    lines.push(`Symptom: ${truncateValue(bundle.symptom, 200)}`);
  }
  lines.push(authLine);
  lines.push(failures.length ? `Recent failures:\n${failures.map(summarizeDebugEntry).join('\n')}` : 'Recent failures: none captured');
  lines.push(entries.length ? `Recent requests (last ${entries.length}):\n${entries.map(summarizeDebugEntry).join('\n')}` : 'Recent requests: none captured');

  return lines.join('\n');
};

/**
 * Express route handler for /api/kip/agents
 */
export default async function handler(req: DomainResolvedRequest, res: Response) {
  const requestId = (req.headers['x-request-id'] as string) || `kip-agents-${Date.now()}`;
  const baseContext = {
    requestId,
    path: req.path,
    method: req.method,
    domainResolution: req.headers['x-domain-resolution'],
    domainSlug: req.headers['x-domain-slug'] || req.headers['x-domain'],
    origin: req.headers.origin,
  };
  let ctxFlags: ReturnType<typeof buildContextFlags> | undefined;
  try {
    const resolvedUser = resolveUserId(req, res);
    const resolvedDomain = resolveDomain(req);
    ctxFlags = buildContextFlags(req, resolvedUser.userId, resolvedDomain);
    const respond = (status: number, body: Record<string, unknown>) =>
      res.status(status).json({ ...body, ctx: ctxFlags });

    switch (req.method) {
      case 'GET':
        // Mock fallback when DB is disabled
        if (isDbDisabled()) {
          return respond(200, { success: true, agents: MOCK_AGENTS });
        }
        // Handle different GET routes
        const { id, slug, logs, agentId: queryAgentId, userId: queryUserId, page, pageSize, stats, sessions, sessionId: querySessionId, messages } = req.query;
        
        // Get session messages
        if (messages === 'true') {
          console.info('[kip/agents] messages request', {
            ...baseContext,
            sessionId: querySessionId,
            query: req.query,
          });

          if (!querySessionId || typeof querySessionId !== 'string') {
            return respond(400, {
              success: false,
              message: 'Invalid session ID',
              error: { code: 'BAD_REQUEST', message: 'Invalid session ID' },
            });
          }

          try {
            const sessionMessages = await KipAgentService.getSessionMemory(querySessionId);
            console.info('[kip/agents] messages success', {
              ...baseContext,
              sessionId: querySessionId,
              count: Array.isArray(sessionMessages) ? sessionMessages.length : null,
            });
            return respond(200, { success: true, data: sessionMessages });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load session messages';
            const isNotFound = /not found/i.test(message);
            console.error('[kip/agents] messages error', {
              ...baseContext,
              sessionId: querySessionId,
              message,
              stack: error instanceof Error ? error.stack : undefined,
            });
            return respond(isNotFound ? 404 : 500, {
              success: false,
              message,
              error: {
                code: isNotFound ? 'SESSION_NOT_FOUND' : 'FAILED_TO_LOAD_MESSAGES',
                message,
              },
            });
          }
        }
        
        // Get sessions for an agent
        if (sessions === 'true') {
          // Basic logging for debugging session failures
          console.info('[kip/agents] sessions request', {
            ...baseContext,
            queryAgentId,
            page,
            pageSize,
            domainId: (req.query as any)?.domainId,
          });

          if (!queryAgentId || typeof queryAgentId !== 'string') {
            return respond(400, { success: false, error: 'agentId required' });
          }
          
          const options = {
            page: page ? parseInt(page as string) : undefined,
            pageSize: pageSize ? parseInt(pageSize as string) : undefined
          };
          
          // Validate pagination parameters
          if (options.page && (isNaN(options.page) || options.page < 1)) {
            return respond(400, { success: false, error: 'Invalid page number' });
          }
          if (options.pageSize && (isNaN(options.pageSize) || options.pageSize < 1 || options.pageSize > 100)) {
            return respond(400, { success: false, error: 'Invalid page size (must be 1-100)' });
          }
          
          try {
            const sessionsResult = await getSessionsByAgentId(queryAgentId, options);
            console.info('[kip/agents] sessions success', {
              agentId: queryAgentId,
              count: Array.isArray((sessionsResult as any)?.sessions)
                ? (sessionsResult as any).sessions.length
                : Array.isArray(sessionsResult)
                  ? (sessionsResult as any).length
                  : null,
            });
            return respond(200, { success: true, data: sessionsResult });
          } catch (error) {
            console.error('[kip/agents] sessions error', {
              agentId: queryAgentId,
              message: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : undefined,
            });
            return respond(500, { success: false, error: 'Failed to load sessions' });
          }
        }
        
        // Get specific session by ID
        if (querySessionId && !messages) {
          if (typeof querySessionId !== 'string') {
            return respond(400, { success: false, error: 'Invalid session ID' });
          }
          const session = await getKipSessionById(querySessionId);
          if (!session) {
            return respond(404, { success: false, error: 'Session not found' });
          }
          return respond(200, { success: true, data: session });
        }
        
        // Get agent logs
        if (logs === 'true') {
          const options = {
            page: page ? parseInt(page as string) : undefined,
            pageSize: pageSize ? parseInt(pageSize as string) : undefined,
            agentId: queryAgentId as string,
            userId: queryUserId as string
          };
          
          // Validate pagination parameters
          if (options.page && (isNaN(options.page) || options.page < 1)) {
            return respond(400, { success: false, error: 'Invalid page number' });
          }
          if (options.pageSize && (isNaN(options.pageSize) || options.pageSize < 1 || options.pageSize > 100)) {
            return respond(400, { success: false, error: 'Invalid page size (must be 1-100)' });
          }
          
          const logsResult = await getKipAgentLogs(options);
          return respond(200, { success: true, data: logsResult });
        }
        
        // Get agent statistics
        if (stats === 'true') {
          const statsResult = await getAgentStats(queryAgentId as string);
          return respond(200, { success: true, data: statsResult });
        }
        
        // Get specific agent by ID
        if (id) {
          if (typeof id !== 'string') {
            return respond(400, { success: false, error: 'Invalid agent ID' });
          }
          const agent = await getKipAgentById(id);
          if (!agent) {
            return respond(404, { success: false, error: 'Agent not found' });
          }
          return respond(200, { success: true, data: agent });
        }
        
        // Get specific agent by slug
        if (slug) {
          if (typeof slug !== 'string') {
            return respond(400, { success: false, error: 'Invalid agent slug' });
          }
          const agent = await getKipAgentBySlug(slug);
          if (!agent) {
            return respond(404, { success: false, error: 'Agent not found' });
          }
          return respond(200, { success: true, data: agent });
        }
        
        // Get all agents
        const agents = await KipAgentService.getAllAgents();
        return respond(200, { success: true, data: agents });

      case 'POST':
        // Handle agent execution or creation
        const { action, agentId, input, sessionId, sessionName, ...createData } = req.body;
        const requestUserId = resolvedUser.userId;
        const requestUserIdSource: UserIdSource | 'body' | undefined = resolvedUser.source;
        console.info('[kip/agents] post request', {
          ...baseContext,
          action,
          body: req.body,
          query: req.query,
          requestUserId,
          requestUserIdSource,
          domain: resolvedDomain,
        });
        
        if (action === 'run') {
          // Validate using Zod schema
          const validation = AgentRunSchema.safeParse({
            agentId,
            input,
            userId: requestUserId,
            sessionId,
            domainId: resolvedDomain.domainId,
            domainSlug: resolvedDomain.domainSlug,
            mode: (req.body as any)?.mode,
            debugBundle: (req.body as any)?.debugBundle,
          });
          if (!validation.success) {
            return respond(400, { 
              success: false, 
              error: 'Invalid request data',
              details: validation.error.errors
            });
          }
          
          let environment: AgentEnvironmentContext | null = null;
          try {
            environment = await resolveAgentEnvironment({
              agentId,
              userId: requestUserId,
              domainId: validation.data.domainId ?? resolvedDomain.domainId ?? undefined,
              sessionId,
              intent: 'interactive',
            });
          } catch (error) {
            console.warn('[kip/agents] environment resolution failed', {
              requestId,
              agentId,
              userId: requestUserId,
              domainId: validation.data.domainId ?? resolvedDomain.domainId ?? null,
              error: error instanceof Error ? error.message : error,
            });
          }

          const environmentDebug = {
            resolvedBy: 'KAM' as const,
            resolvedAt: environment?.debug?.resolvedAt ?? new Date().toISOString(),
            injectedAt: new Date().toISOString(),
            canary: randomUUID(),
          };

          if (environment) {
            environment.debug = environmentDebug;
          } else {
            environment = {
              version: 'env-v1',
              domains: [],
              capabilities: { canDraft: false, canPromote: false },
              debug: environmentDebug,
            };
          }

          const result = await KipAgentService.runAgent(agentId, input, requestUserId, sessionId, {
            domainId: validation.data.domainId ?? resolvedDomain.domainId,
            domainSlug: validation.data.domainSlug ?? resolvedDomain.domainSlug,
            mode: validation.data.mode as AgentModeKey | undefined,
            debugBundle: validation.data.debugBundle || null,
            environment,
          });
          return respond(200, { success: true, data: result });
        }
        
        if (action === 'createSession') {
          const { userId: resolvedUserId, source: userIdSource } = resolvedUser;
          if (!resolvedUserId) {
            console.warn('[kip/agents] createSession missing userId', {
              ...baseContext,
              agentId,
              userIdSource: userIdSource || 'none',
              warning: 'Missing user context; auth middleware not mounted or cookie not parsed',
              ctx: ctxFlags,
            });
            return respond(401, {
              success: false,
              message: 'Unauthorized: user required',
              error: { code: 'UNAUTHORIZED', message: 'Missing user context' },
              warning: 'Missing user context; auth middleware not mounted or cookie not parsed',
            });
          }

          console.info('[kip/agents] createSession request', {
            ...baseContext,
            agentId,
            userId: resolvedUserId,
            sessionName,
            domainId: resolvedDomain.domainId,
            domainSlug: resolvedDomain.domainSlug,
            userIdSource: userIdSource || 'unknown',
            ctx: ctxFlags,
          });

          // Validate using Zod schema
          const validation = CreateSessionSchema.safeParse({ agentId, sessionName });
          if (!validation.success) {
            console.warn('[kip/agents] createSession validation failed', {
              ...baseContext,
              agentId,
              userId: resolvedUserId,
              sessionName,
              issues: validation.error.errors,
              ctx: ctxFlags,
            });
            return respond(400, { 
              success: false,
              message: 'Invalid request data',
              error: {
                code: 'BAD_REQUEST',
                message: 'Invalid request data',
                details: validation.error.errors
              }
            });
          }
          
          try {
            const session = await KipAgentService.createSession(agentId, resolvedUserId, sessionName);
            console.info('[kip/agents] createSession success', {
              requestId,
              agentId,
              sessionId: session?.id,
              userIdSource: userIdSource || 'unknown',
              ctx: ctxFlags,
            });
            return respond(201, { success: true, data: session });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create session';
            const isNotFound = /not found/i.test(message);
            const isBadInput = /invalid|required/i.test(message);
            const status = isNotFound ? 404 : isBadInput ? 400 : 500;

            console.error('[kip/agents] createSession error', {
              requestId,
              agentId,
              userId: resolvedUserId,
              sessionName,
              message,
              stack: error instanceof Error ? error.stack : undefined,
              ctx: ctxFlags,
            });

            return respond(status, { 
              success: false, 
              message,
              error: {
                code: isNotFound
                  ? 'AGENT_NOT_FOUND'
                  : isBadInput
                    ? 'BAD_REQUEST'
                    : 'FAILED_TO_CREATE_SESSION',
                message
              }
            });
          }
        }
        
        // Create new agent
        if (!createData.name || !createData.slug) {
          return respond(400, { 
            success: false, 
            error: 'Agent name and slug are required'
          });
        }
        
        const newAgent = await KipAgentService.createAgent(createData);
        return respond(201, { success: true, data: newAgent });

      case 'PATCH': {
        try {
          const validation = UpdateSessionMetadataSchema.safeParse(req.body);
          if (!validation.success) {
            return respond(400, {
              success: false,
              error: 'Invalid session metadata',
              details: validation.error.errors
            });
          }

          const resolvedUserId = resolvedUser.userId;
          if (!resolvedUserId) {
            console.warn('[kip/agents] updateSessionMetadata missing user', { requestId, ctx: ctxFlags });
            return respond(401, {
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Missing user context' },
              warning: 'Missing user context; auth middleware not mounted or cookie not parsed',
            });
          }

          const { sessionId } = validation.data;
          const existingSession = await prisma.kip_sessions.findUnique({
            where: { id: sessionId },
            select: { id: true, user_id: true, agent_id: true },
          });

          if (!existingSession || existingSession.user_id !== resolvedUserId) {
            console.warn('[kip/agents] updateSessionMetadata ownership mismatch', {
              requestId,
              sessionId,
              sessionUserId: existingSession?.user_id,
              resolvedUserId,
              ctx: ctxFlags,
            });
            return respond(404, {
              success: false,
              error: 'Session not found',
            });
          }

          const targetAgentId = validation.data.agentId ?? existingSession.agent_id;
          if (!targetAgentId || existingSession.agent_id !== targetAgentId) {
            console.warn('[kip/agents] updateSessionMetadata agent mismatch', {
              requestId,
              sessionId,
              existingAgentId: existingSession.agent_id,
              providedAgentId: validation.data.agentId,
              ctx: ctxFlags,
            });
            return respond(404, { success: false, error: 'Session not found' });
          }

          const { updates, error: normalizationError } = normalizeSessionMetadataUpdates(validation.data);
          if (normalizationError) {
            return respond(400, {
              success: false,
              error: 'Invalid session metadata',
              details: normalizationError,
            });
          }

          if (!Object.keys(updates).length) {
            return respond(400, {
              success: false,
              error: 'No session metadata provided to update',
            });
          }

          const updatedSession = await KipAgentService.updateSessionMetadata({
            sessionId,
            agentId: targetAgentId,
            userId: resolvedUserId,
            updates,
          });

          console.info('[kip/agents] updateSessionMetadata success', {
            requestId,
            sessionId,
            agentId: targetAgentId,
            ctx: ctxFlags,
          });

          return respond(200, { success: true, data: updatedSession });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update session metadata';
          const isNotFound = /not found/i.test(message);
          const isInvalid = /invalid|metadata|tags|No session metadata provided/i.test(message);
          console.error('[kip/agents] updateSessionMetadata error', {
            requestId,
            sessionId: (req.body as any)?.sessionId,
            agentId: (req.body as any)?.agentId,
            message,
            stack: error instanceof Error ? error.stack : undefined,
            ctx: ctxFlags,
          });
          return respond(isNotFound ? 404 : isInvalid ? 400 : 500, {
            success: false,
            error: message,
          });
        }
      }

      case 'PUT':
        // Handle agent update
        const { id: updateId, ...updateData } = req.body;
        
        if (!updateId || typeof updateId !== 'string') {
          return respond(400, { 
            success: false, 
            error: 'Valid agent ID is required for updating an agent' 
          });
        }
        
        const updatedAgent = await KipAgentService.updateAgent(updateId, updateData);
        return respond(200, { success: true, data: updatedAgent });

      case 'DELETE':
        // Handle agent deletion
        const { id: deleteId } = req.body;
        
        if (!deleteId || typeof deleteId !== 'string') {
          return respond(400, { 
            success: false, 
            error: 'Valid agent ID is required for deleting an agent' 
          });
        }
        
        const deleteResult = await KipAgentService.deleteAgent(deleteId);
        return respond(200, { success: true, data: deleteResult });

      default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
        return respond(405, { success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('KIP Agents API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error',
      ...(ctxFlags ? { ctx: ctxFlags } : {}),
    });
  }
} 