/**
 * KIP API Client
 * ==============
 * 
 * API client for KIP (Keeper Interface Protocol) operations
 * Handles agent management and execution
 */

import { apiFetch } from './api';

// Types matching the backend
export type AgentClass = 'Standard' | 'Coordinator' | 'Lead' | 'Persona';
export type ModelProvider = 'openai' | 'anthropic' | 'together' | 'elevenlabs';

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
  agent_class: AgentClass;
  context_scope?: string | null;
  memory_enabled: boolean;
  tools: string[];
  permissions: string[];
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
  agent_class?: AgentClass;
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
  topic?: string | null;
  summary?: string | null;
  tags?: string[] | null;
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
    agent_class: 'Standard',
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
    agent_class: 'Standard',
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
    agent_class: 'Standard',
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
    agent_class: 'Lead',
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
    agent_class: 'Lead',
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
      console.warn('API connection failed, using mock data:', error);
      // Return mock data as fallback
      const mockAgent = mockAgents.find(agent => agent.id === id);
      if (mockAgent) {
        return mockAgent;
      }
      throw new Error('Agent not found');
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
      console.warn('API connection failed, using mock data:', error);
      // Return mock data as fallback
      const mockAgent = mockAgents.find(agent => agent.slug === slug);
      if (mockAgent) {
        return mockAgent;
      }
      throw new Error('Agent not found');
    }
  }

  /**
   * Get Lead agent by slug for standalone agent pages
   */
  static async getLeadAgent(slug: string): Promise<KipAgent> {
    try {
      const agent = await this.getAgentBySlug(slug);
      if (agent.agent_class !== 'Lead') {
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
  static async runAgent(agentId: string, input: string, userId?: string, sessionId?: string): Promise<AgentResponse> {
    try {
      const response = await apiFetch('/api/kip/agents', {
        method: 'POST',
        body: JSON.stringify({
          action: 'run',
          agentId,
          input,
          userId,
          sessionId
        })
      });
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to run agent');
    } catch (error) {
      console.warn('API connection failed, using mock execution:', error);
      
      // Find the agent (with fallback to mock)
      const agent = mockAgents.find(a => a.id === agentId) || mockAgents.find(a => a.slug === 'type-agent');
      
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Return mock execution result
      const mockResult: AgentResponse = {
        id: agentId,
        success: true,
        data: {
          action: 'capture_thought',
          keeper_id: userId || 'user_mock',
          type: 'reflection',
          data: {
            content: input,
            extracted_entities: ['thought', 'reflection', 'organization'],
            sentiment: 'positive',
            category: 'personal_development',
            confidence: 0.87,
            agent_used: agent.name,
            model: agent.model,
            mock_mode: true
          }
        },
        processing_time_ms: 250
      };
      
      return mockResult;
    }
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
  static async createSession(agentId: string, userId?: string, sessionName?: string): Promise<KipSession> {
    try {
      const response = await apiFetch('/api/kip/agents', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createSession',
          agentId,
          userId,
          sessionName
        })
      });
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to create session');
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Update topic/summary metadata for a session
   */
  static async updateSessionMetadata(sessionId: string, updates: SessionMetadataUpdate): Promise<KipSession> {
    try {
      const response = await apiFetch('/api/kip/agents', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId,
          topic: updates.topic ?? null,
          summary: updates.summary ?? null,
          tags: updates.tags ?? null,
          primaryKeeperId: updates.primaryKeeperId ?? null,
          primaryJourneyId: updates.primaryJourneyId ?? null
        })
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
      throw new Error(response.error || 'Failed to fetch session messages');
    } catch (error) {
      console.error('Error fetching session messages:', error);
      throw error;
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
      // Backend returns { success, data: { sessions, total, page, ... } }
      if (response?.success) {
        const sessionsResult = response.data as
          | { sessions?: KipSession[]; total?: number; page?: number; pageSize?: number }
          | KipSession[];
        if (Array.isArray(sessionsResult)) {
          return sessionsResult;
        }
        return Array.isArray(sessionsResult?.sessions) ? sessionsResult.sessions : [];
      }
      throw new Error(response.error || 'Failed to fetch sessions');
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }

  /**
   * Get available models for a provider
   */
  static getAvailableModels(provider: ModelProvider): string[] {
    switch (provider) {
      case 'openai':
        return [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-4',
          'gpt-3.5-turbo'
        ];
      case 'anthropic':
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];
      case 'together':
        return [
          'meta-llama/Llama-2-70b-chat-hf',
          'meta-llama/Llama-2-13b-chat-hf',
          'meta-llama/Llama-2-7b-chat-hf',
          'mistralai/Mixtral-8x7B-Instruct-v0.1'
        ];
      case 'elevenlabs':
        return [
          'eleven_monolingual_v1',
          'eleven_multilingual_v2',
          'eleven_turbo_v2'
        ];
      default:
        return [];
    }
  }

  /**
   * Get default settings for a provider
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
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: 4000
        };
      case 'together':
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