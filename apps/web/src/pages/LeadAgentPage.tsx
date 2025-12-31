import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { KipApi, KipAgent, KipMessage } from '../lib/kipApi';

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

const LeadAgentPage: React.FC = () => {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agent, setAgent] = useState<KipAgent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (agentSlug) {
      loadAgent(agentSlug);
    }
  }, [agentSlug]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [agent]);

  const loadAgent = async (slug: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const leadAgent = await KipApi.getLeadAgent(slug);
      setAgent(leadAgent);
      
      // Check for existing sessionId in URL params
      const urlSessionId = searchParams.get('sessionId');
      
      if (leadAgent.memory_enabled) {
        if (urlSessionId) {
          // Load existing session and its memory
          await loadSessionMemory(urlSessionId, leadAgent);
        } else {
          // Create new session for memory-enabled agents
          await createNewSession(leadAgent);
        }
      } else {
        // Non-memory agent, just show welcome message
        const welcomeMessage: Message = {
          id: `welcome_${Date.now()}`,
          type: 'agent',
          content: `Hello! I'm ${leadAgent.name}. ${leadAgent.config?.tagline || 'How can I help you today?'}`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent');
      console.error('Error loading lead agent:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionMemory = async (sessionId: string, agent: KipAgent) => {
    try {
      setIsLoadingMemory(true);
      const sessionMessages = await KipApi.getSessionMessages(sessionId);
      
      // Convert KipMessage[] to Message[]
      const convertedMessages: Message[] = sessionMessages.map((msg: KipMessage) => ({
        id: msg.id,
        type: msg.sender === 'user' ? 'user' : 'agent',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      }));
      
      setMessages(convertedMessages);
      setSessionId(sessionId);
      
      // Update URL to include sessionId
      if (!searchParams.get('sessionId')) {
        setSearchParams({ sessionId });
      }
    } catch (error) {
      console.error('Error loading session memory:', error);
      // Fall back to creating new session
      await createNewSession(agent);
    } finally {
      setIsLoadingMemory(false);
    }
  };

  const createNewSession = async (agent: KipAgent) => {
    try {
      const session = await KipApi.createSession(agent.id);
      setSessionId(session.id);
      
      // Update URL with new sessionId
      setSearchParams({ sessionId: session.id });
      
      // Add welcome message to new session
      const welcomeMessage: Message = {
        id: `welcome_${Date.now()}`,
        type: 'agent',
        content: `Hello! I'm ${agent.name}. ${agent.config?.tagline || 'How can I help you today?'} I'll remember our conversation.`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error creating session:', error);
      // Fall back to non-memory mode
      const welcomeMessage: Message = {
        id: `welcome_${Date.now()}`,
        type: 'agent',
        content: `Hello! I'm ${agent.name}. ${agent.config?.tagline || 'How can I help you today?'}`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agent || isSubmitting) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: `loading_${Date.now()}`,
      type: 'agent',
      content: '',
      timestamp: new Date(),
      loading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsSubmitting(true);

    try {
      const response = await KipApi.runAgent(agent.id, userMessage.content, undefined, sessionId || undefined);
      type AgentAPIData = { response?: string; session_id?: string };
      type AgentAPIEnvelope = { data?: AgentAPIData };
      
      if (response.success) {
        const env = (response as unknown) as { data: AgentAPIEnvelope };
        const payload: AgentAPIData = env?.data?.data ?? {};
        const agentMessage: Message = {
          id: `agent_${Date.now()}`,
          type: 'agent',
          content: payload.response ?? 'I processed your request successfully.',
          timestamp: new Date()
        };

        setMessages(prev => prev.filter(msg => !msg.loading).concat([agentMessage]));
        
        // Update sessionId if it was returned (for new sessions created during execution)
        if (payload.session_id && !sessionId) {
          setSessionId(payload.session_id);
          setSearchParams({ sessionId: payload.session_id });
        }
      } else {
        throw new Error('Failed to get agent response');
      }
    } catch (error) {
      console.error('Error running agent:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: 'agent',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => prev.filter(msg => !msg.loading).concat([errorMessage]));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    // Allow Enter to create new lines (default behavior)
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-lg text-muted-foreground">Loading {agentSlug}...</span>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Agent Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || `The agent "${agentSlug}" could not be found or is not a Lead agent.`}
          </p>
          <a 
            href="/" 
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  const config = agent.config as any;
  const themeColor = config?.theme_color || '#3b82f6';
  const avatar = config?.avatar || '🤖';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
            >
              {avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-foreground">{agent.name}</h1>
                {agent.memory_enabled && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    💾 Memory {isLoadingMemory ? 'Loading...' : 'On'}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {config?.tagline || agent.purpose}
              </p>
              {sessionId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Session: {sessionId.slice(0, 8)}... • {messages.length} messages
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  } rounded-lg px-4 py-3 shadow-sm`}>
                    {message.loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm">Thinking...</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p className={`text-xs mt-2 opacity-70 ${
                      message.type === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="border-t border-border bg-card p-4">
            <form onSubmit={handleSubmit} className="flex space-x-3 items-end">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message ${agent.name}... (Shift+Enter to send)`}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring resize-none min-h-[40px] max-h-[120px]"
                  disabled={isSubmitting}
                  rows={1}
                  style={{ 
                    height: 'auto',
                    minHeight: '40px'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isSubmitting}
                className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-md transition-colors flex items-center justify-center"
                style={{ backgroundColor: themeColor, minHeight: '40px' }}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadAgentPage; 