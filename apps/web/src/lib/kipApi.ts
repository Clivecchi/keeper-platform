/**
 * KIP API Client
 * ==============
 * 
 * API client for KIP (Keeper Interface Protocol) operations
 * Handles agent management and execution
 */

import { apiFetch } from './api';
import {
  normalizeDraftSpecJson,
  type DraftPoint,
  type DraftPointStatus,
  type DraftPointType,
  type DraftSpecJson,
} from '@keeper/shared';

export type {
  DraftPoint,
  DraftPointStatus,
  DraftPointType,
  DraftSpecJson,
} from '@keeper/shared';

export { normalizeDraftSpecJson };

// Types matching the backend
const shouldUseMockFallback = (error: unknown): boolean =>
  error instanceof TypeError && Boolean((import.meta as any)?.env?.DEV);

const pickErrorMessage = (response: any, fallback: string): string =>
  response?.message ||
  (typeof response?.error === 'string' ? response.error : response?.error?.message) ||
  fallback;

type ApiErrorShape = Error & { status?: number; response?: Response; requestId?: string; data?: any };

const enrichApiError = (error: unknown, fallback: string): ApiErrorShape => {
  const err = error as ApiErrorShape;
  const status = err?.status || (err as any)?.response?.status;
  const requestId =
    err?.requestId ||
    (err as any)?.response?.headers?.get?.('x-request-id') ||
    (err as any)?.response?.headers?.get?.('x-railway-request-id') ||
    undefined;
  const apiMessage = (err as any)?.data?.error?.message || (err as any)?.data?.message;
  const message = err?.message || apiMessage || fallback;

  const nextError: ApiErrorShape = new Error(message) as ApiErrorShape;
  nextError.status = status;
  nextError.requestId = requestId;
  nextError.data = (err as any)?.data;
  nextError.response = err?.response;
  return nextError;
};

export type AgentRole = 'Standard' | 'Coordinator' | 'Lead' | 'Persona';
export type ModelProvider = 'openai' | 'anthropic' | 'together-ai' | 'elevenlabs';

export interface ModelSettings {
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
}

export interface KipAgent {
  id: string;
  slug: string;
  name: string;
  purpose: string;
  model: string;
  role: AgentRole;
  context_scope?: string | null;
  memory_enabled: boolean;
  tools: string[];
  permissions: string[];
  capabilities: string[];
  config: Record<string, unknown>;
  status: string;
  model_provider: ModelProvider;
  model_settings: ModelSettings;
  visibility?: 'private' | 'public' | 'shared';
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AgentInput {
  slug: string;
  name: string;
  purpose: string;
  model: string;
  role?: AgentRole;
  context_scope?: string;
  memory_enabled?: boolean;
  tools?: string[];
  permissions?: string[];
  config?: Record<string, unknown>;
  status?: string;
  model_provider?: ModelProvider;
  model_settings?: ModelSettings;
  visibility?: 'private' | 'public' | 'shared';
}

export interface AgentResponse {
  id: string;
  success: boolean;
  data: unknown;
  processing_time_ms: number;
}

export type AgentModeKey = 'domain' | 'debug';
export type ModeOutputStyle = 'concise' | 'normal' | 'expanded';

/** Action pack: entity.capability grouped by entity (e.g. draft.create, moment.create) */
export type ActionPack = {
  draft: string[];
  keeper: string[];
  journey: string[];
  moment: string[];
  [key: string]: string[];
};

export type ModeConfig = {
  lensId?: string | null;
  outputStyle?: ModeOutputStyle;
  limits?: { maxChars?: number | null };
  contextFlags?: Record<string, boolean>;
  captureN?: number;
  autoBrief?: boolean;
  includeFixPlan?: boolean;
};

export type AgentModeState = {
  activeMode: AgentModeKey;
  modeConfigs: Record<AgentModeKey, ModeConfig>;
  domainKey?: string;
  lenses?: { domainLensId: string | null; debugLensId: string | null };
};

export type KipDraftStatus = 'draft' | 'reviewed' | 'approved' | 'promoted' | 'archived';
export interface DomainPolicy {
  version: string;
  policy: unknown;
  updatedAt?: string | Date | null;
  source?: 'domain' | 'default';
}

export interface KipDraftSummary {
  id: string;
  kind: string;
  key: string;
  title: string;
  status: KipDraftStatus;
  summary?: string | null;
  updatedAt?: string | Date | null;
  /** When set, draft is scoped to this keeper */
  keeperId?: string | null;
}

export interface KipDraft extends KipDraftSummary {
  domain_id?: string;
  owner_id?: string;
  agent_id?: string | null;
  spec?: DraftSpecJson;
  created_at?: string | Date;
}

export interface KipEnvironmentBundle {
  domain: { id: string; slug?: string | null; name?: string | null };
  actor: { userId: string; roles?: string[] };
  ui?: Record<string, unknown>;
  activeDraft?: KipDraftSummary;
  policyPack?: {
    policyVersion: string;
    resolvedBy: string;
    actions: { allow: string[] };
    entities: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>;
  };
  policy?: { version: string; policy: unknown; source?: string; updatedAt?: string | Date | null };
  draftsDirectory?: KipDraftSummary[];
  [key: string]: unknown;
}

export interface KipLens {
  id: string;
  domainId: string | null;
  name: string;
  systemPrompt: string;
  rulesJson?: unknown;
  outputSchemaJson?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface KipCommandIntent {
  action: string;
  keeper_id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface KipSession {
  id: string;
  agent_id: string;
  user_id?: string | null;
  session_name?: string | null;
  topic?: string | null;
  summary?: string | null;
  tags?: string[];
  primary_keeper_id?: string | null;
  primary_journey_id?: string | null;
  active_draft_id?: string | null;
  activeDraftId?: string | null;
  primaryKeeperId?: string | null;
  primaryJourneyId?: string | null;
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
  messages?: KipMessage[];
}

export interface KipMessage {
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

export interface SessionInput {
  agent_id: string;
  user_id?: string;
  session_name?: string;
  topic?: string | null;
  summary?: string | null;
  tags?: string[];
  primary_keeper_id?: string | null;
  primary_journey_id?: string | null;
}

export type SessionMetadataUpdate = {
  session_name?: string | null;
  topic?: string | null;
  summary?: string | null;
  tags?: any;
  primaryKeeperId?: string | null;
  primaryJourneyId?: string | null;
};

export type DomainAgentLocation = 'kip' | 'feed' | 'keepers' | 'journeys' | 'profile';

export interface DomainAgentExecuteContext {
  location?: DomainAgentLocation;
  keeperId?: string;
  journeyId?: string;
  extra?: Record<string, unknown>;
}

export interface DomainAgentExecuteRequest {
  message: string;
  context?: DomainAgentExecuteContext;
  sessionId?: string;
}

export interface DomainAgentExecuteMetadata {
  agentId: string;
  domainId: string;
  model?: string;
  usedMemoryPattern?: string | null;
  executionId?: string | null;
  sessionId?: string | null;
  context?: {
    location: DomainAgentLocation;
    keeperId?: string | null;
    journeyId?: string | null;
    extra?: Record<string, unknown>;
  };
}

export interface DomainAgentExecuteResponse {
  reply: string;
  metadata: DomainAgentExecuteMetadata;
}

// Mock data for fallback
const mockAgents: KipAgent[] = [
  {
    id: 'type-agent-mock',
    slug: 'type-agent',
    name: 'TypeAgent',
    purpose: 'Text analysis and intent extraction for user thoughts and ideas',
    model: 'claude-3-5-sonnet-20241022',
    role: 'Standard',
    context_scope: 'thought_processing',
    memory_enabled: true,
    tools: ['text_analysis', 'intent_extraction', 'sentiment_analysis'],
    permissions: ['read_thoughts', 'analyze_content'],
    config: { confidence_threshold: 0.7, supported_formats: ['json', 'yaml'] },
    status: 'ready',
    model_provider: 'anthropic',
    model_settings: {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.1,
      max_tokens: 4000,
      retry: { max_retries: 3, retry_delay_ms: 1000 }
    },
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'platform-agent-mock',
    slug: 'platform-agent',
    name: 'PlatformAgent',
    purpose: 'System orchestration and platform management',
    model: 'gpt-4o',
    role: 'Standard',
    context_scope: 'system_management',
    memory_enabled: false,
    tools: ['system_analysis', 'orchestration', 'monitoring'],
    permissions: ['system_admin', 'platform_control'],
    config: { system_access_level: 'admin', monitoring_interval: 300 },
    status: 'ready',
    model_provider: 'openai',
    model_settings: {
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 8000,
      top_p: 0.9,
      retry: { max_retries: 5, retry_delay_ms: 2000 }
    },
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'code-agent-mock',
    slug: 'code-agent',
    name: 'CodeAgent',
    purpose: 'Code analysis, generation, and technical assistance',
    model: 'gpt-4o',
    role: 'Standard',
    context_scope: 'development',
    memory_enabled: true,
    tools: ['code_analysis', 'generation', 'debugging', 'optimization'],
    permissions: ['read_code', 'generate_code', 'analyze_patterns'],
    config: { supported_languages: ['typescript', 'javascript', 'sql', 'prisma'], code_style: 'strict' },
    status: 'ready',
    model_provider: 'openai',
    model_settings: {
      model: 'gpt-4o',
      temperature: 0.0,
      max_tokens: 8000,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      retry: { max_retries: 3, retry_delay_ms: 1500 }
    },
    created_at: new Date(),
    updated_at: new Date()
  },
  // Lead Agents for standalone experiences
  {
    id: 'kip-lead-mock',
    slug: 'kip',
    name: 'Kip',
    purpose: 'Your intelligent assistant for thought processing, idea organization, and creative collaboration. Kip helps you capture insights, analyze patterns, and coordinate tasks across the Keeper platform.',
    model: 'claude-3-5-sonnet-20241022',
    role: 'Lead',
    context_scope: 'user_interaction',
    memory_enabled: true,
    tools: ['thought_analysis', 'idea_organization', 'task_coordination', 'conversation'],
    permissions: ['read_user_data', 'create_memories', 'coordinate_agents', 'access_platform'],
    config: {
      tagline: 'Your AI companion for thoughts and ideas',
      personality: 'helpful, insightful, organized',
      capabilities: ['thought processing', 'idea organization', 'task coordination'],
      avatar: '🤖',
      theme_color: '#3b82f6'
    },
    status: 'ready',
    model_provider: 'anthropic',
    model_settings: {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      max_tokens: 4000,
      retry: { max_retries: 3, retry_delay_ms: 1000 }
    },
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'ceox-lead-mock',
    slug: 'ceox',
    name: 'CeoX',
    purpose: 'Executive AI assistant specialized in strategic thinking, business analysis, and leadership support. CeoX provides high-level insights, strategic recommendations, and executive decision support.',
    model: 'gpt-4o',
    role: 'Lead',
    context_scope: 'executive',
    memory_enabled: true,
    tools: ['strategic_analysis', 'business_intelligence', 'decision_support', 'leadership_coaching'],
    permissions: ['access_business_data', 'generate_reports', 'strategic_planning', 'executive_support'],
    config: {
      tagline: 'Your strategic AI executive partner',
      personality: 'strategic, analytical, decisive',
      capabilities: ['strategic analysis', 'business intelligence', 'executive coaching'],
      avatar: '👔',
      theme_color: '#dc2626'
    },
    status: 'ready',
    model_provider: 'openai',
    model_settings: {
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 3000,
      top_p: 0.9,
      retry: { max_retries: 3, retry_delay_ms: 1500 }
    },
    created_at: new Date(),
    updated_at: new Date()
  }
];

/**
 * KIP API Client Class
 */
export class KipApi {
  /**
   * Get all available KIP agents
   */
  static async getAllAgents(): Promise<KipAgent[]> {
    try {
      const response = await apiFetch('/api/kip/agents');
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch agents');
    } catch (error) {
      console.error('Error fetching agents:', error);
      // If the API is not available, fall back to mock data for development
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('API server not available, using mock data');
        return mockAgents;
      }
      throw error;
    }
  }

  /**
   * Get a specific agent by ID
   */
  static async getAgentById(id: string): Promise<KipAgent> {
    try {
      const response = await apiFetch(`/api/kip/agents?id=${id}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Agent not found');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agent not found';
      if (shouldUseMockFallback(error)) {
        console.warn('API connection failed, using mock data:', error);
        const mockAgent = mockAgents.find(agent => agent.id === id);
        if (mockAgent) {
          return mockAgent;
        }
      }
      throw new Error(message);
    }
  }

  /**
   * Get a specific agent by slug
   */
  static async getAgentBySlug(slug: string): Promise<KipAgent> {
    try {
      const response = await apiFetch(`/api/kip/agents?slug=${slug}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Agent not found');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agent not found';
      if (shouldUseMockFallback(error)) {
        console.warn('API connection failed, using mock data:', error);
        const mockAgent = mockAgents.find(agent => agent.slug === slug);
        if (mockAgent) {
          return mockAgent;
        }
      }
      throw new Error(message);
    }
  }

  /**
   * Get Lead agent by slug for standalone agent pages
   */
  static async getLeadAgent(slug: string): Promise<KipAgent> {
    try {
      const agent = await this.getAgentBySlug(slug);
      if (agent.role !== 'Lead') {
        throw new Error(`Agent "${slug}" is not a Lead agent`);
      }
      return agent;
    } catch (error) {
      console.warn(`Failed to load Lead agent "${slug}":`, error);
      throw error;
    }
  }

  /**
   * Create a new KIP agent
   */
  static async createAgent(input: AgentInput): Promise<KipAgent> {
    try {
      const response = await apiFetch('/api/kip/agents', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to create agent');
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  /**
   * Update an existing agent
   */
  static async updateAgent(id: string, input: Partial<AgentInput>): Promise<KipAgent> {
    try {
      const response = await apiFetch('/api/kip/agents', {
        method: 'PUT',
        body: JSON.stringify({ id, ...input })
      });
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to update agent');
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }

  /**
   * Delete an agent
   */
  static async deleteAgent(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiFetch('/api/kip/agents', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      });
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to delete agent');
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }

  /**
   * Run an agent with input text and optional session for memory
   */
  static async runAgent(
    agentId: string,
    input: string,
    userId?: string,
    sessionId?: string,
    options?: {
      domainId?: string | null
      domainSlug?: string | null
      mode?: AgentModeKey
      debugBundle?: unknown
      activeJourneyId?: string | null
      activeKeeperId?: string | null
      attachments?: Array<{ url: string; name: string; type: "image" | "file" }>
      /** agentContext — from domain frame JSON, injected into Kip's environment */
      agentContext?: Record<string, unknown>
      /** IDE director mode — server runs instrument then Lead synthesis. */
      directorDelegation?: {
        instrumentSlug: "cloud" | "rendr"
        userMessage: string
        taskMessage?: string
        directorDisplayName: string
      }
    },
  ): Promise<AgentResponse> {
    const response = await apiFetch('/api/kip/agents', {
      method: 'POST',
      body: JSON.stringify({
        action: 'run',
        agentId,
        input,
        userId,
        sessionId,
        domainId: options?.domainId ?? undefined,
        domainSlug: options?.domainSlug ?? undefined,
        mode: options?.mode,
        debugBundle: options?.debugBundle,
        activeJourneyId: options?.activeJourneyId ?? undefined,
        activeKeeperId: options?.activeKeeperId ?? undefined,
        attachments: options?.attachments ?? undefined,
        agentContext: options?.agentContext ?? undefined,
        directorDelegation: options?.directorDelegation ?? undefined,
      })
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to run agent');
    }

    // The API returns 200 even when the agent execution fails internally.
    // Check the inner AgentResponse for success: false and surface the real error.
    const agentResult = response.data as AgentResponse;

    if (agentResult && agentResult.success === false) {
      const dataAny = agentResult.data as any;
      const innerError =
        dataAny?.error ||
        dataAny?.data?.error ||
        'The agent was unable to process your request';
      const errorCode =
        dataAny?.errorCode ||
        dataAny?.data?.errorCode ||
        '';

      // Provide user-friendly messages for known error codes
      if (errorCode === 'QUOTA_EXCEEDED') {
        throw new Error(
          'Kip is temporarily unavailable — the AI model has run out of credits. ' +
          'Please add credits to the API key or contact your administrator.'
        );
      }
      if (errorCode === 'MISSING_API_KEY') {
        throw new Error(
          innerError && typeof innerError === 'string' && innerError.includes('ANTHROPIC_API_KEY')
            ? innerError
            : innerError && typeof innerError === 'string' && innerError.includes('OPENAI_API_KEY')
              ? innerError
              : 'Kip cannot respond — the AI model API key is missing or invalid. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to your Railway environment variables.'
        );
      }

      throw new Error(innerError);
    }

    return agentResult;
  }

  /**
   * Get action pack (tools/actions the agent can use) for a given agent and domain
   */
  static async getActionPack(
    agentId: string,
    domainId?: string | null,
    keeperId?: string | null,
    options?: { journeyId?: string | null; composePrompt?: boolean }
  ): Promise<{
    actionPack: ActionPack;
    allowedActions: string[];
    soleStatus?: { soleActive: boolean; keeperSharpening?: boolean; memoryCount?: number };
    composedSystemPrompt?: string | null;
  }> {
    const params = new URLSearchParams();
    params.set('actionPack', 'true');
    params.set('agentId', agentId);
    if (domainId) params.set('domainId', domainId);
    if (keeperId) params.set('keeperId', keeperId);
    if (options?.journeyId) params.set('journeyId', options.journeyId);
    if (options?.composePrompt) params.set('composePrompt', 'true');
    const response = await apiFetch(`/api/kip/agents?${params.toString()}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to load action pack');
    }
    const data = response.data as {
      actionPack?: ActionPack;
      allowedActions?: string[];
      soleStatus?: { soleActive: boolean; keeperSharpening?: boolean; memoryCount?: number };
      composedSystemPrompt?: string | null;
    };
    if (!data?.actionPack || !Array.isArray(data.allowedActions)) {
      throw new Error('Invalid action pack response');
    }
    return {
      actionPack: data.actionPack,
      allowedActions: data.allowedActions,
      soleStatus: data.soleStatus,
      composedSystemPrompt: data.composedSystemPrompt ?? null,
    };
  }

  /**
   * Mode + Lens helpers
   */
  static async getLenses(domainId?: string): Promise<KipLens[]> {
    const params = new URLSearchParams();
    if (domainId) params.set('domainId', domainId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiFetch(`/api/kip/lenses${query}`);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to load lenses');
  }

  static async createLens(input: { domainId?: string; name: string; systemPrompt: string; rulesJson?: unknown; outputSchemaJson?: unknown }): Promise<KipLens> {
    const response = await apiFetch('/api/kip/lenses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to create lens');
  }

  static async updateLens(id: string, input: Partial<KipLens>): Promise<KipLens> {
    const response = await apiFetch(`/api/kip/lenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update lens');
  }

  static async getModeConfig(agentId: string, domainId?: string): Promise<AgentModeState> {
    const params = new URLSearchParams();
    if (domainId) params.set('domainId', domainId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiFetch(`/api/kip/agents/${agentId}/mode-config${query}`);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to load mode config');
  }

  static async updateModeConfig(agentId: string, payload: Partial<AgentModeState> & { domainId?: string | null }): Promise<AgentModeState> {
    const params = new URLSearchParams();
    if (payload.domainId) params.set('domainId', payload.domainId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const { domainId, ...body } = payload;
    const response = await apiFetch(`/api/kip/agents/${agentId}/mode-config${query}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (response.success) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update mode config');
  }

  /**
   * Drafts (domain-scoped, optionally filtered by keeper)
   */
  static async listDrafts(domainId: string, keeperId?: string | null): Promise<KipDraftSummary[]> {
    const query = keeperId ? `?keeperId=${encodeURIComponent(keeperId)}` : '';
    const response = await apiFetch(`/api/domains/${domainId}/kip/drafts${query}`);
    if (response?.drafts) {
      return response.drafts as KipDraftSummary[];
    }
    if (response?.data?.drafts) {
      return response.data.drafts as KipDraftSummary[];
    }
    throw new Error(pickErrorMessage(response, 'Failed to load drafts'));
  }

  static async getDraft(domainId: string, draftId: string): Promise<KipDraft> {
    const response = await apiFetch(`/api/domains/${domainId}/kip/drafts/${draftId}`);
    if (response?.draft) {
      const draft = response.draft as KipDraft;
      return {
        ...draft,
        spec: normalizeDraftSpecJson(draft.spec),
      };
    }
    throw new Error(pickErrorMessage(response, 'Failed to load draft'));
  }

  static async createDraft(
    domainId: string,
    payload: { kind: string; key: string; title: string; summary?: string; spec?: unknown; agentId?: string | null; keeperId?: string | null },
  ): Promise<KipDraft> {
    const response = await apiFetch(`/api/domains/${domainId}/kip/drafts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (response?.draft) {
      return response.draft as KipDraft;
    }
    throw new Error(pickErrorMessage(response, 'Failed to create draft'));
  }

  static async updateDraft(
    domainId: string,
    draftId: string,
    payload: Partial<Pick<KipDraft, 'title' | 'summary' | 'status'>> & { spec?: unknown },
  ): Promise<KipDraft> {
    const response = await apiFetch(`/api/domains/${domainId}/kip/drafts/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (response?.draft) {
      const draft = response.draft as KipDraft;
      return { ...draft, spec: normalizeDraftSpecJson(draft.spec) };
    }
    throw new Error(pickErrorMessage(response, 'Failed to update draft'));
  }

  static async acceptDraftPoint(
    domainId: string,
    draftId: string,
    pointId: string,
  ): Promise<{ success: boolean; result: { status: string; message: string; data?: { point?: DraftPoint } } }> {
    const response = await apiFetch(
      `/api/domains/${domainId}/kip/drafts/${draftId}/points/${pointId}/accept`,
      { method: 'POST' },
    );
    if (response?.success && response?.result) {
      return response as { success: boolean; result: { status: string; message: string; data?: { point?: DraftPoint } } };
    }
    throw new Error(pickErrorMessage(response, 'Failed to accept draft point'));
  }

  static async deleteDraft(domainId: string, draftId: string): Promise<void> {
    const response = await apiFetch(`/api/domains/${domainId}/kip/drafts/${draftId}`, {
      method: 'DELETE',
    });
    if (!response?.success) {
      throw new Error(pickErrorMessage(response, 'Failed to delete draft'));
    }
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const response = await apiFetch('/api/kip/agents', {
      method: 'DELETE',
      body: JSON.stringify({ type: 'session', id: sessionId }),
    });
    if (!response?.success) {
      throw new Error(pickErrorMessage(response, 'Failed to delete session'));
    }
  }

  static async deleteJourney(journeyId: string): Promise<void> {
    const response = await apiFetch(`/api/journeys/${encodeURIComponent(journeyId)}`, {
      method: 'DELETE',
    });
    if (!response?.success) {
      throw new Error(pickErrorMessage(response, 'Failed to delete journey'));
    }
  }

  static async deleteKeeper(keeperId: string): Promise<void> {
    const response = await apiFetch(`/api/keepers/${encodeURIComponent(keeperId)}`, {
      method: 'DELETE',
    });
    if (response?.error) {
      throw new Error(pickErrorMessage(response, 'Failed to delete keeper'));
    }
  }

  static async deletePath(pathId: string): Promise<void> {
    const response = await apiFetch(`/api/paths/${encodeURIComponent(pathId)}`, {
      method: 'DELETE',
    });
    if (response?.error) {
      throw new Error(pickErrorMessage(response, 'Failed to delete path'));
    }
  }

  static async deleteMoment(momentId: string): Promise<void> {
    const response = await apiFetch(`/api/moments/${encodeURIComponent(momentId)}`, {
      method: 'DELETE',
    });
    if (response?.error) {
      throw new Error(pickErrorMessage(response, 'Failed to delete moment'));
    }
  }

  static async publishDraft(domainId: string, draftId: string): Promise<{ success: boolean; idempotent?: boolean; domain?: { id: string; slug: string }; status?: string }> {
    const response = await apiFetch(`/api/domains/${domainId}/kip/drafts/${draftId}/publish`, {
      method: 'POST',
    });
    if (!response?.success) {
      throw new Error(pickErrorMessage(response, 'Failed to publish draft'));
    }
    return response;
  }

  /**
   * Get domain-scoped agents (only agents assigned to the domain)
   */
  static async getDomainAgents(domainId: string): Promise<KipAgent[]> {
    try {
      const response = await apiFetch(`/api/domains/${domainId}/kip/agents`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch domain agents');
    } catch (error) {
      console.error('Error fetching domain agents:', error);
      throw error;
    }
  }

  static async setActiveDraft(domainId: string, sessionId: string, draftId: string): Promise<KipDraftSummary | null> {
    const response = await apiFetch(`/api/domains/${domainId}/kip/sessions/${sessionId}/active-draft`, {
      method: 'POST',
      body: JSON.stringify({ draftId }),
    });
    if (response?.activeDraft) {
      return response.activeDraft as KipDraftSummary;
    }
    return null;
  }

  static async clearActiveDraft(domainId: string, sessionId: string): Promise<void> {
    await apiFetch(`/api/domains/${domainId}/kip/sessions/${sessionId}/active-draft`, {
      method: 'DELETE',
    });
  }

  static async getEnvironment(domainId: string, sessionId?: string): Promise<KipEnvironmentBundle> {
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiFetch(`/api/domains/${domainId}/kip/environment${query}`);
    if (response?.environment) {
      return response.environment as KipEnvironmentBundle;
    }
    throw new Error(pickErrorMessage(response, 'Failed to load Kip environment'));
  }

  /**
   * Domain policy (domain-scoped)
   */
  static async getDomainPolicy(domainId: string): Promise<DomainPolicy> {
    const response = await apiFetch(`/api/domains/${domainId}/policy`);
    if (response?.policy) {
      return response.policy as DomainPolicy;
    }
    throw new Error(pickErrorMessage(response, 'Failed to load policy'));
  }

  static async updateDomainPolicy(domainId: string, policy: unknown, version?: string): Promise<DomainPolicy> {
    const response = await apiFetch(`/api/domains/${domainId}/policy`, {
      method: 'PATCH',
      body: JSON.stringify({ policy, version }),
    });
    if (response?.policy) {
      return response.policy as DomainPolicy;
    }
    throw new Error(pickErrorMessage(response, 'Failed to save policy'));
  }

  /**
   * Get agent execution logs with pagination
   */
  static async getAgentLogs(options: {
    page?: number;
    pageSize?: number;
    agentId?: string;
    userId?: string;
  } = {}): Promise<unknown> {
    try {
      const params = new URLSearchParams();
      params.append('logs', 'true');
      if (options.page) params.append('page', options.page.toString());
      if (options.pageSize) params.append('pageSize', options.pageSize.toString());
      if (options.agentId) params.append('agentId', options.agentId);
      if (options.userId) params.append('userId', options.userId);

      const response = await apiFetch(`/api/kip/agents?${params.toString()}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch agent logs');
    } catch (error) {
      console.error('Error fetching agent logs:', error);
      throw error;
    }
  }

  /**
   * Get logs for a specific agent
   */
  static async getLogsByAgentId(agentId: string, options: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<unknown> {
    return this.getAgentLogs({ ...options, agentId });
  }

  /**
   * Get agent execution statistics
   */
  static async getAgentStats(agentId?: string): Promise<unknown> {
    try {
      const params = new URLSearchParams();
      params.append('stats', 'true');
      if (agentId) params.append('agentId', agentId);

      const response = await apiFetch(`/api/kip/agents?${params.toString()}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch agent stats');
    } catch (error) {
      console.error('Error fetching agent stats:', error);
      throw error;
    }
  }

  /**
   * Create a new session for an agent
   */
  static async createSession(
    agentId: string,
    userId?: string,
    sessionName?: string,
    options: {
      domainId?: string | null;
      domainSlug?: string | null;
      dialogBoard?: string;
      dialogFrame?: string;
      dialogSubject?: string;
      dialogScope?: 'admin' | 'keeper';
    } = {},
  ): Promise<KipSession> {
    try {
      const payload = {
        action: 'createSession',
        agentId,
        userId,
        sessionName,
        ...(options.domainId ? { domainId: options.domainId } : {}),
        ...(options.domainSlug ? { domainSlug: options.domainSlug } : {}),
        ...(options.dialogBoard && options.dialogFrame && options.dialogScope
          ? {
              dialogBoard: options.dialogBoard,
              dialogFrame: options.dialogFrame,
              ...(options.dialogSubject ? { dialogSubject: options.dialogSubject } : {}),
              dialogScope: options.dialogScope,
            }
          : {}),
      };

      console.info?.('[KipApi] createSession payload', {
        url: '/api/kip/agents',
        method: 'POST',
        body: payload,
      });

      const response = await apiFetch('/api/kip/agents', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.success) {
        return response.data;
      }
      const message = pickErrorMessage(response, 'Failed to create session');
      throw enrichApiError(new Error(message), 'Failed to create session');
    } catch (error) {
      const enriched = enrichApiError(error, 'Failed to create session');
      console.error('Error creating session:', enriched);
      throw enriched;
    }
  }

  /**
   * Update topic/summary metadata for a session
   */
  static async updateSessionMetadata(
    agentId: string,
    sessionId: string,
    updates: { session_name?: string; summary?: string | null; tags?: any },
  ): Promise<KipSession> {
    try {
      const response = await apiFetch('/api/kip/agents', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'updateSessionMetadata',
          agentId,
          sessionId,
          updates: {
            ...(updates.session_name !== undefined ? { session_name: updates.session_name } : {}),
            ...(updates.summary !== undefined ? { summary: updates.summary } : {}),
            ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
          },
        }),
      });

      if (response?.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to update session metadata');
    } catch (error) {
      console.error('Error updating session metadata:', error);
      throw error;
    }
  }

  /**
   * Get session by ID with all messages
   */
  static async getSessionById(sessionId: string): Promise<KipSession> {
    try {
      const response = await apiFetch(`/api/kip/agents?sessionId=${sessionId}`);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Session not found');
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  }

  /**
   * Get all messages for a session
   */
  static async getSessionMessages(sessionId: string): Promise<KipMessage[]> {
    try {
      const response = await apiFetch(`/api/kip/agents?messages=true&sessionId=${sessionId}`);
      if (response.success) {
        return response.data;
      }
      const message = pickErrorMessage(response, 'Failed to fetch session messages');
      throw enrichApiError(new Error(message), 'Failed to fetch session messages');
    } catch (error) {
      const enriched = enrichApiError(error, 'Failed to fetch session messages');
      console.error('Error fetching session messages:', enriched);
      throw enriched;
    }
  }

  /**
   * Get all sessions for an agent
   */
  static async getSessionsByAgentId(
    agentId: string,
    options: {
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<KipSession[]> {
    try {
      const params = new URLSearchParams();
      params.append('sessions', 'true');
      params.append('agentId', agentId);
      if (options.page) params.append('page', options.page.toString());
      if (options.pageSize) params.append('pageSize', options.pageSize.toString());

      const response = await apiFetch(`/api/kip/agents?${params.toString()}`);
      // Backend returns { success, data: KipSession[] } or { success, data: { sessions, total, ... } }
      if (response?.success) {
        const data = response.data as
          | KipSession[]
          | { sessions?: KipSession[]; total?: number; page?: number; pageSize?: number };

        if (Array.isArray(data)) {
          return data;
        }

        if (data && Array.isArray((data as any).sessions)) {
          return (data as any).sessions as KipSession[];
        }

        return [];
      }

      const message = pickErrorMessage(response, 'Failed to fetch sessions');
      throw new Error(message);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }

  /**
   * Fetch model catalog from API (providers, models, defaults).
   * Use for model selection UI. Falls back to getAvailableModels/getDefaultSettings if API fails.
   */
  static async getModelCatalog(provider?: ModelProvider): Promise<{
    providers: string[];
    models: Array<{ id: string; label: string; provider: string; defaultSettings?: Partial<ModelSettings>; capabilities?: string[] }>;
    defaults: Record<string, string>;
  } | null> {
    try {
      const url = provider ? `/api/kip/models?provider=${provider}` : '/api/kip/models';
      const res = await apiFetch(url) as { success?: boolean; data?: { providers: string[]; models: Array<{ id: string; label: string; provider: string; defaultSettings?: Partial<ModelSettings>; capabilities?: string[] }>; defaults: Record<string, string> } };
      if (res?.success && res?.data) {
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get available models for a provider (fallback when catalog API unavailable)
   */
  static getAvailableModels(provider: ModelProvider): string[] {
    const FALLBACK: Record<ModelProvider, string[]> = {
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
      anthropic: ['claude-sonnet-4-6', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      'together-ai': ['meta-llama/Llama-2-70b-chat-hf', 'meta-llama/Llama-2-13b-chat-hf', 'meta-llama/Llama-2-7b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
      elevenlabs: ['eleven_monolingual_v1', 'eleven_multilingual_v2', 'eleven_turbo_v2'],
    };
    return FALLBACK[provider] ?? [];
  }

  /**
   * Get default settings for a provider (fallback when catalog API unavailable)
   */
  static getDefaultSettings(provider: ModelProvider): ModelSettings {
    const baseSettings = {
      retry: {
        max_retries: 3,
        retry_delay_ms: 1000
      }
    };

    switch (provider) {
      case 'openai':
        return {
          ...baseSettings,
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 1.0,
          frequency_penalty: 0,
          presence_penalty: 0
        };
      case 'anthropic':
        return {
          ...baseSettings,
          model: 'claude-sonnet-4-6',
          temperature: 0.7,
          max_tokens: 4000
        };
      case 'together-ai':
        return {
          ...baseSettings,
          model: 'meta-llama/Llama-2-70b-chat-hf',
          temperature: 0.7,
          max_tokens: 2000
        };
      case 'elevenlabs':
        return {
          ...baseSettings,
          model: 'eleven_multilingual_v2',
          temperature: 0.5,
          max_tokens: 1000
        };
      default:
        return baseSettings as ModelSettings;
    }
  }
}

export async function executeDomainAgent(
  domainId: string,
  payload: DomainAgentExecuteRequest
): Promise<DomainAgentExecuteResponse> {
  const normalizedBody = {
    ...payload,
    context: {
      location: payload.context?.location ?? 'kip',
      keeperId: payload.context?.keeperId,
      journeyId: payload.context?.journeyId,
      extra: payload.context?.extra ?? {},
    },
  };

  return apiFetch(`/api/domains/${domainId}/agent/execute`, {
    method: 'POST',
    body: JSON.stringify(normalizedBody),
  });
}

/**
 * Legacy TypeAgent class for backward compatibility
 * Now uses the real API instead of mock data
 */
export class TypeAgent {
  static async extract(input: string): Promise<KipCommandIntent> {
    try {
      // Find the TypeAgent by slug
      const agents = await KipApi.getAllAgents();
      const typeAgent = agents.find(agent => agent.slug === 'type-agent');
      
      if (!typeAgent) {
        throw new Error('TypeAgent not found');
      }

      // Run the agent
      const result = await KipApi.runAgent(typeAgent.id, input);
      
      if (result.success) {
        return result.data as KipCommandIntent;
      }
      
      throw new Error('TypeAgent extraction failed');
    } catch (error) {
      console.error('TypeAgent extraction error:', error);
      throw error;
    }
  }
} 