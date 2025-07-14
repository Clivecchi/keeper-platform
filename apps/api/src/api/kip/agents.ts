/**
 * KIP Agent Service API
 * ===================
 * 
 * Handles KIP (Keeper Interface Protocol) agent operations
 * Provides endpoints for managing and running agents
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { 
  getAllKipAgents,
  getKipAgentById,
  getKipAgentBySlug,
  createKipAgent,
  updateKipAgent,
  createKipAgentLog,
  getKipAgentLogs,
  getLogsByAgentId,
  getAgentStats,
  createKipSession,
  getKipSessionById,
  getSessionsByAgentId,
  createKipMessage,
  getSessionMessages,
  deleteKipAgent
} from '@keeper/database';
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
import { ModelProviderService, ModelMessage } from '../../services/ModelProviderService';

/**
 * KipAgentService - Core agent management functions
 */
export class KipAgentService {
  /**
   * Generate response for Lead agents with conversational intelligence
   */
  static generateLeadAgentResponse(agent: unknown, input: string): string {
    const typedAgent = agent as { 
      config?: { personality?: string; tagline?: string; capabilities?: string[] }; 
      slug?: string; 
      name?: string; 
    };
    const config = typedAgent.config;
    const personality = config?.personality || 'helpful';
    
    // Generate contextual responses based on agent personality and capabilities
    if (typedAgent.slug === 'kip') {
      return `Hello! I'm Kip, ${config?.tagline || 'your AI companion'}. I understand you said: "${input}". As your thought processing assistant, I can help you organize ideas, analyze patterns, and coordinate tasks. How would you like me to assist you with this today?`;
    } else if (typedAgent.slug === 'ceox') {
      return `Greetings. I'm CeoX, ${config?.tagline || 'your strategic AI partner'}. You've shared: "${input}". From an executive perspective, I can provide strategic analysis, business intelligence, and decision support. What strategic insights or recommendations would be most valuable for you regarding this matter?`;
    } else {
      // Generic Lead agent response
      return `Hello! I'm ${typedAgent.name}. I see you've mentioned: "${input}". Based on my capabilities in ${config?.capabilities?.join(', ') || 'general assistance'}, I'm here to help. What specific assistance can I provide?`;
    }
  }

  /**
   * Get all available agents
   */
  static async getAllAgents() {
    try {
      const agents = await getAllKipAgents();
      return agents;
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw new Error('Failed to fetch agents');
    }
  }

  /**
   * Update an existing agent
   */
  static async updateAgent(id: string, input: Partial<AgentInput>) {
    try {
      // Get agent by ID or slug, similar to runAgent
      let existingAgent;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        existingAgent = await getKipAgentById(id);
      } else {
        existingAgent = await getKipAgentBySlug(id);
      }
      
      if (!existingAgent) {
        throw new Error(`Agent with ${isUUID ? 'ID' : 'slug'} ${id} not found`);
      }

      // Update the agent using the actual UUID
      const updatedAgent = await updateKipAgent(existingAgent.id, input);
      return updatedAgent;
    } catch (error) {
      console.error('Error updating agent:', error);
      throw new Error('Failed to update agent');
    }
  }

  /**
   * Delete an agent
   */
  static async deleteAgent(id: string) {
    try {
      // Get agent by ID or slug, similar to runAgent
      let existingAgent;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        existingAgent = await getKipAgentById(id);
      } else {
        existingAgent = await getKipAgentBySlug(id);
      }
      
      if (!existingAgent) {
        throw new Error(`Agent with ${isUUID ? 'ID' : 'slug'} ${id} not found`);
      }

      // Delete the agent using the actual UUID
      await deleteKipAgent(existingAgent.id);
      return { success: true, message: 'Agent deleted successfully' };
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw new Error('Failed to delete agent');
    }
  }

  /**
   * Create a new agent
   */
  static async createAgent(input: AgentInput) {
    try {
      const agent = await createKipAgent(input);
      return agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error('Failed to create agent');
    }
  }

  /**
   * Create a new session for an agent
   */
  static async createSession(agentId: string, userId?: string, sessionName?: string): Promise<KipSessionWithRelations> {
    try {
      // Get agent by ID or slug to ensure we use the correct UUID
      let agent;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
      
      if (isUUID) {
        agent = await getKipAgentById(agentId);
      } else {
        agent = await getKipAgentBySlug(agentId);
      }
      
      if (!agent) {
        throw new Error(`Agent with ${isUUID ? 'ID' : 'slug'} ${agentId} not found`);
      }

      const sessionData: KipSessionInput = {
        agent_id: agent.id, // Use the actual UUID
        user_id: userId,
        session_name: sessionName
      };
      
      const session = await createKipSession(sessionData);
      return session as KipSessionWithRelations;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get session with all messages (memory)
   */
  static async getSessionMemory(sessionId: string): Promise<KipMessageWithRelations[]> {
    try {
      const messages = await getSessionMessages(sessionId);
      return messages as KipMessageWithRelations[];
    } catch (error) {
      console.error('Error fetching session memory:', error);
      throw new Error('Failed to fetch session memory');
    }
  }

  /**
   * Save a message to session memory
   */
  static async saveMessage(sessionId: string, sender: 'user' | 'agent', content: string, role?: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      const messageData: KipMessageInput = {
        session_id: sessionId,
        sender,
        content,
        role,
        metadata
      };
      
      await createKipMessage(messageData);
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error('Failed to save message');
    }
  }

  /**
   * Generate Lead agent response with memory context (Legacy - for fallback)
   */
  static generateLeadAgentResponseWithMemory(agent: unknown, input: string, previousMessages: KipMessageWithRelations[]): string {
    const typedAgent = agent as { 
      config?: { personality?: string; tagline?: string; capabilities?: string[] }; 
      slug?: string; 
      name?: string; 
    };
    const config = typedAgent.config;
    const personality = config?.personality || 'helpful';
    
    // Build context from previous messages
    const recentContext = previousMessages.slice(-6).map(msg => 
      `${msg.sender}: ${msg.content}`
    ).join('\n');
    
    const hasContext = previousMessages.length > 0;
    const contextPrompt = hasContext ? 
      `\n\nBased on our previous conversation:\n${recentContext}\n\nNow responding to: "${input}"` :
      `\n\nResponding to: "${input}"`;
    
    if (typedAgent.slug === 'kip') {
      const greeting = hasContext ? 'I remember our conversation.' : 'Hello! I\'m Kip, your AI companion.';
      return `${greeting} ${contextPrompt}\n\nAs your thought processing assistant with memory of our discussion, I can help you build on our previous insights, analyze patterns, and coordinate tasks. How would you like me to assist you with this continuation of our conversation?`;
    } else if (typedAgent.slug === 'ceox') {
      const greeting = hasContext ? 'Continuing our strategic discussion.' : 'Greetings. I\'m CeoX, your strategic AI partner.';
      return `${greeting} ${contextPrompt}\n\nWith the context of our previous exchanges, I can provide strategic analysis that builds on our earlier insights, business intelligence that connects to previous decisions, and decision support that considers our conversation history. What strategic insights would be most valuable for you regarding this matter?`;
    } else {
      const greeting = hasContext ? `Continuing our conversation, I'm ${typedAgent.name}.` : `Hello! I'm ${typedAgent.name}.`;
      return `${greeting} ${contextPrompt}\n\nBased on my capabilities in ${config?.capabilities?.join(', ') || 'general assistance'} and our conversation history, I'm here to help. What specific assistance can I provide?`;
    }
  }

  /**
   * Call real AI model with conversation context
   */
  static async callAIModel(agent: unknown, input: string, previousMessages: KipMessageWithRelations[], userId?: string): Promise<string> {
    try {
      const typedAgent = agent as {
        model_provider?: ModelProvider;
        model_settings?: ModelSettings;
        config?: { tagline?: string; personality?: string; [key: string]: unknown };
        name?: string;
        purpose?: string;
        tools?: string[];
        context_scope?: string;
      };
      
      const modelProvider = typedAgent.model_provider || 'openai';
      const modelSettings = typedAgent.model_settings || ModelProviderService.getDefaultSettings(modelProvider);
      
      // Build conversation messages for the AI model
      const messages: ModelMessage[] = [];
      
      // Add system message with agent context
      const config = typedAgent.config;
      const systemPrompt = `You are ${typedAgent.name}, ${typedAgent.purpose}. ${config?.tagline || ''}

Key capabilities: ${typedAgent.tools?.join(', ') || 'general assistance'}
Personality: ${config?.personality || 'helpful and professional'}
Context scope: ${typedAgent.context_scope || 'general'}

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
        // TEMPORARILY DISABLED: Fallback to see real errors
        // return this.generateLeadAgentResponseWithMemory(agent, input, previousMessages);
        throw new Error(`AI model call failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Error calling AI model:', error);
      // TEMPORARILY DISABLED: Fallback to see real errors
      // return this.generateLeadAgentResponseWithMemory(agent, input, previousMessages);
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
      // Try to get agent by ID first (UUID format), then by slug if that fails
      let agent;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
      
      if (isUUID) {
        agent = await getKipAgentById(agentId);
      } else {
        // If not a UUID, try to get by slug
        agent = await getKipAgentBySlug(agentId);
      }
      
      if (!agent) {
        const error = `Agent with ${isUUID ? 'ID' : 'slug'} ${agentId} not found`;
        logData.error = error;
        logData.execution_time_ms = Date.now() - startTime;
        
        // Log the failed execution
        try {
          await createKipAgentLog(logData);
        } catch (logError) {
          console.warn('Failed to log agent execution:', logError);
        }
        
        throw new Error(error);
      }

      // Update log to use the actual agent UUID for consistency
      logData.agent_id = agent.id;
      logData.model = agent.model;

      // Mock agent execution based on agent type or class
      let result: unknown;

      // Handle Lead agents - interactive chat experience with memory
      if (agent.agent_class === 'Lead') {
        const config = (agent as { config?: { 
          avatar?: string; 
          tagline?: string; 
          personality?: string; 
          capabilities?: string[]; 
          theme_color?: string; 
          bundle?: string[];
        } }).config;
        let currentSessionId = sessionId;
        let previousMessages: KipMessageWithRelations[] = [];
        
        // Handle memory for memory-enabled agents
        if (agent.memory_enabled) {
          if (sessionId) {
            // Load existing session memory
            try {
              previousMessages = await KipAgentService.getSessionMemory(sessionId);
            } catch (error) {
              console.warn('Failed to load session memory:', error);
              // Continue without memory if loading fails
            }
          } else {
            // Create new session for memory-enabled agents
            try {
              const newSession = await KipAgentService.createSession(agentId, userId);
              currentSessionId = newSession.id;
            } catch (error) {
              console.warn('Failed to create session:', error);
              // Continue without memory if session creation fails
            }
          }
          
          // Save user message to memory if we have a session
          if (currentSessionId) {
            try {
              await KipAgentService.saveMessage(currentSessionId, 'user', input, 'user', {
                timestamp: new Date().toISOString(),
                agent_id: agentId
              });
            } catch (error) {
              console.warn('Failed to save user message:', error);
            }
          }
        }
        
        // Generate response using real AI model with memory context
        const response = await KipAgentService.callAIModel(agent, input, previousMessages, userId);
        
        // Save agent response to memory if we have a session
        if (agent.memory_enabled && currentSessionId) {
          try {
            await KipAgentService.saveMessage(currentSessionId, 'agent', response, 'assistant', {
              timestamp: new Date().toISOString(),
              agent_id: agentId,
              model: agent.model
            });
          } catch (error) {
            console.warn('Failed to save agent response:', error);
          }
        }
        
        result = {
          action: 'lead_interaction',
          keeper_id: userId || 'lead_user',
          type: 'conversation',
          data: {
            response: response,
            agent_name: agent.name,
            agent_avatar: config?.avatar || '🤖',
            agent_tagline: config?.tagline || 'Your AI assistant',
            personality: config?.personality || 'helpful',
            capabilities: config?.capabilities || [],
            theme_color: config?.theme_color || '#3b82f6',
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
        const config = (agent as { config?: { 
          bundle?: string[]; 
          [key: string]: unknown;
        } }).config;
        const subAgentSlugs = config?.bundle ?? [];
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
                const subResult = await KipAgentService.runAgent(subAgent.id, input, userId, sessionId);
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
        switch (agent.slug) {
        case 'type-agent':
          result = {
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
          break;

        case 'platform-agent':
          result = {
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
          break;

        case 'code-agent':
          result = {
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
          break;

        default:
          result = {
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
          const sessionMessages = await KipAgentService.getSessionMemory(querySessionId as string);
          return res.status(200).json({ success: true, data: sessionMessages });
        }
        
        // Get sessions for an agent
        if (sessions === 'true' && queryAgentId) {
          const options = {
            page: page ? parseInt(page as string) : undefined,
            pageSize: pageSize ? parseInt(pageSize as string) : undefined
          };
          
          const sessionsResult = await getSessionsByAgentId(queryAgentId as string, options);
          return res.status(200).json({ success: true, data: sessionsResult });
        }
        
        // Get specific session by ID
        if (querySessionId && !messages) {
          const session = await getKipSessionById(querySessionId as string);
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
          const agent = await getKipAgentById(id as string);
          if (!agent) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
          }
          return res.status(200).json({ success: true, data: agent });
        }
        
        // Get specific agent by slug
        if (slug) {
          const agent = await getKipAgentBySlug(slug as string);
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
        const { action, agentId, input, userId, sessionId, ...createData } = req.body;
        
        if (action === 'run') {
          if (!agentId || !input) {
            return res.status(400).json({ 
              success: false, 
              error: 'agentId and input are required for running an agent' 
            });
          }
          
          // Extract user ID and session ID from request
          const result = await KipAgentService.runAgent(agentId, input, userId, sessionId);
          return res.status(200).json({ success: true, data: result });
        }
        
        if (action === 'createSession') {
          if (!agentId) {
            return res.status(400).json({ 
              success: false, 
              error: 'agentId is required for creating a session' 
            });
          }
          
          const { sessionName } = req.body;
          const session = await KipAgentService.createSession(agentId, userId, sessionName);
          return res.status(201).json({ success: true, data: session });
        }
        
        // Create new agent
        const newAgent = await KipAgentService.createAgent(createData);
        return res.status(201).json({ success: true, data: newAgent });

      case 'PUT':
        // Handle agent update
        const { id: updateId, ...updateData } = req.body;
        if (!updateId || typeof updateId !== 'string') {
          return res.status(400).json({ success: false, error: 'id is required for updating an agent' });
        }
        const updatedAgent = await KipAgentService.updateAgent(updateId, updateData);
        return res.status(200).json({ success: true, data: updatedAgent });

      case 'DELETE':
        // Handle agent deletion
        const { id: deleteId } = req.body;
        if (!deleteId || typeof deleteId !== 'string') {
          return res.status(400).json({ success: false, error: 'id is required for deleting an agent' });
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