/**
 * KIP Agent Service API
 * ===================
 * 
 * Handles KIP (Keeper Interface Protocol) agent operations
 * Provides endpoints for managing and running agents
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@keeper/database';
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
import { ModelProviderService, ModelMessage } from '../../services/ModelProviderService.js';

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
      messages: {
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
          select: { messages: true }
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

  const [logs, total] = await Promise.all([
    prisma.kip_agent_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.kip_agent_logs.count({ where })
  ]);

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
const AgentRunSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  input: z.string().min(1, 'Input is required'),
  userId: z.string().optional(),
  sessionId: z.string().optional()
});

const CreateSessionSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  userId: z.string().optional(),
  sessionName: z.string().optional()
});

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
      // Validate agent exists
      const agent = await this.getAgentSafely(agentId);
      
      const sessionData: KipSessionInput = {
        agent_id: agent.id,
        user_id: userId || 'anonymous',
        session_name: sessionName || `Session with ${agent.name}`
      };

      return await createKipSession(sessionData);
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  static async callAIModel(agent: TypedAgent, input: string, previousMessages: KipMessageWithRelations[], userId?: string): Promise<string> {
    try {
      const modelProvider = agent.model_provider || 'openai';
      const modelSettings = agent.model_settings || ModelProviderService.getDefaultSettings(modelProvider);
      
      // Build conversation messages for the AI model
      const messages: ModelMessage[] = [];
      
      // Add system message with agent context
      const config = agent.config || {};
      const systemPrompt = `You are ${agent.name}, ${agent.purpose}. ${config.tagline || ''}

Key capabilities: ${agent.tools?.join(', ') || 'general assistance'}
Personality: ${config.personality || 'helpful and professional'}
Context scope: ${agent.context_scope || 'general'}

Please respond in character, using your specific capabilities and personality. Keep responses conversational and helpful.`;
      
      messages.push({
        role: 'system',
        content: systemPrompt
      });
      
      // Add conversation history (last 10 messages to avoid token limits)
      const recentMessages = previousMessages.slice(-10);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
      
      // Add current user message
      messages.push({
        role: 'user',
        content: input
      });
      
      // Call the model provider
      const response = await ModelProviderService.callModel({
        messages,
        settings: modelSettings,
        provider: modelProvider,
        userId
      });
      
      if (response.success) {
        return response.content;
      } else {
        console.error('AI model call failed:', response.error);
        throw new Error(`AI model call failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Error calling AI model:', error);
      throw error;
    }
  }

  /**
   * Run an agent with provided input, comprehensive logging, and memory persistence
   */
  static async runAgent(agentId: string, input: string, userId?: string, sessionId?: string): Promise<AgentResponse | KipCommandIntent> {
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
        const response = await this.callAIModel(agent, input, previousMessages, userId);
        
        // Save agent response to memory if we have a session
        if (agent.memory_enabled && currentSessionId) {
          try {
            await this.saveMessage(currentSessionId, 'agent', response, 'assistant', {
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
            response: response,
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
                const subResult = await this.runAgent(subAgent.id, input, userId, sessionId);
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
      console.error('Error running agent:', error);
      
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
        data: { error: errorMessage },
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

/**
 * Express route handler for /api/kip/agents
 */
export default async function handler(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        // Handle different GET routes
        const { id, slug, logs, agentId: queryAgentId, userId: queryUserId, page, pageSize, stats, sessions, sessionId: querySessionId, messages } = req.query;
        
        // Get session messages
        if (messages === 'true' && querySessionId) {
          if (typeof querySessionId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid session ID' });
          }
          const sessionMessages = await KipAgentService.getSessionMemory(querySessionId);
          return res.status(200).json({ success: true, data: sessionMessages });
        }
        
        // Get sessions for an agent
        if (sessions === 'true' && queryAgentId) {
          if (typeof queryAgentId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid agent ID' });
          }
          
          const options = {
            page: page ? parseInt(page as string) : undefined,
            pageSize: pageSize ? parseInt(pageSize as string) : undefined
          };
          
          // Validate pagination parameters
          if (options.page && (isNaN(options.page) || options.page < 1)) {
            return res.status(400).json({ success: false, error: 'Invalid page number' });
          }
          if (options.pageSize && (isNaN(options.pageSize) || options.pageSize < 1 || options.pageSize > 100)) {
            return res.status(400).json({ success: false, error: 'Invalid page size (must be 1-100)' });
          }
          
          const sessionsResult = await getSessionsByAgentId(queryAgentId, options);
          return res.status(200).json({ success: true, data: sessionsResult });
        }
        
        // Get specific session by ID
        if (querySessionId && !messages) {
          if (typeof querySessionId !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid session ID' });
          }
          const session = await getKipSessionById(querySessionId);
          if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
          }
          return res.status(200).json({ success: true, data: session });
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
            return res.status(400).json({ success: false, error: 'Invalid page number' });
          }
          if (options.pageSize && (isNaN(options.pageSize) || options.pageSize < 1 || options.pageSize > 100)) {
            return res.status(400).json({ success: false, error: 'Invalid page size (must be 1-100)' });
          }
          
          const logsResult = await getKipAgentLogs(options);
          return res.status(200).json({ success: true, data: logsResult });
        }
        
        // Get agent statistics
        if (stats === 'true') {
          const statsResult = await getAgentStats(queryAgentId as string);
          return res.status(200).json({ success: true, data: statsResult });
        }
        
        // Get specific agent by ID
        if (id) {
          if (typeof id !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid agent ID' });
          }
          const agent = await getKipAgentById(id);
          if (!agent) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
          }
          return res.status(200).json({ success: true, data: agent });
        }
        
        // Get specific agent by slug
        if (slug) {
          if (typeof slug !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid agent slug' });
          }
          const agent = await getKipAgentBySlug(slug);
          if (!agent) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
          }
          return res.status(200).json({ success: true, data: agent });
        }
        
        // Get all agents
        const agents = await KipAgentService.getAllAgents();
        return res.status(200).json({ success: true, data: agents });

      case 'POST':
        // Handle agent execution or creation
        const { action, agentId, input, userId, sessionId, sessionName, ...createData } = req.body;
        
        if (action === 'run') {
          // Validate using Zod schema
          const validation = AgentRunSchema.safeParse({ agentId, input, userId, sessionId });
          if (!validation.success) {
            return res.status(400).json({ 
              success: false, 
              error: 'Invalid request data',
              details: validation.error.errors
            });
          }
          
          const result = await KipAgentService.runAgent(agentId, input, userId, sessionId);
          return res.status(200).json({ success: true, data: result });
        }
        
        if (action === 'createSession') {
          // Validate using Zod schema
          const validation = CreateSessionSchema.safeParse({ agentId, userId, sessionName });
          if (!validation.success) {
            return res.status(400).json({ 
              success: false, 
              error: 'Invalid request data',
              details: validation.error.errors
            });
          }
          
          const session = await KipAgentService.createSession(agentId, userId, sessionName);
          return res.status(201).json({ success: true, data: session });
        }
        
        // Create new agent
        if (!createData.name || !createData.slug) {
          return res.status(400).json({ 
            success: false, 
            error: 'Agent name and slug are required'
          });
        }
        
        const newAgent = await KipAgentService.createAgent(createData);
        return res.status(201).json({ success: true, data: newAgent });

      case 'PUT':
        // Handle agent update
        const { id: updateId, ...updateData } = req.body;
        
        if (!updateId || typeof updateId !== 'string') {
          return res.status(400).json({ 
            success: false, 
            error: 'Valid agent ID is required for updating an agent' 
          });
        }
        
        const updatedAgent = await KipAgentService.updateAgent(updateId, updateData);
        return res.status(200).json({ success: true, data: updatedAgent });

      case 'DELETE':
        // Handle agent deletion
        const { id: deleteId } = req.body;
        
        if (!deleteId || typeof deleteId !== 'string') {
          return res.status(400).json({ 
            success: false, 
            error: 'Valid agent ID is required for deleting an agent' 
          });
        }
        
        const deleteResult = await KipAgentService.deleteAgent(deleteId);
        return res.status(200).json({ success: true, data: deleteResult });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('KIP Agents API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
} 