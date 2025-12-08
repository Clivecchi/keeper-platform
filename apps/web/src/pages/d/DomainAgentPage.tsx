/**
 * Domain Agent Page
 * =================
 *
 * Agent workspace for the V0 shell.
 * Route: /d/:domainSlug/agent
 *
 * Renders inside KeeperDashboardLayout.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { KeeperDashboardLayout } from '../../layouts/KeeperDashboardLayout';
import { apiFetch } from '../../lib/api';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { executeDomainAgent } from '../../lib/kipApi';

interface DomainData {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const createChatMessage = (role: 'user' | 'assistant', content: string): ChatMessage => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${role}-${Date.now()}-${Math.random()}`,
  role,
  content,
  createdAt: new Date().toISOString(),
});

const formatTimestamp = (value: string) => {
  try {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

type AgentErrorCode =
  | 'NO_PRIMARY_AGENT'
  | 'MISSING_API_KEY'
  | 'INVALID_MODEL'
  | 'PROVIDER_UNAVAILABLE'
  | 'AGENT_MISCONFIGURED'
  | 'UNKNOWN';

type ApiError = Error & {
  status?: number;
  code?: string;
  data?: {
    error?: string;
    message?: string;
  };
};

const friendlyAgentErrorMessage = (code?: string, fallback?: string): string => {
  switch (code as AgentErrorCode | undefined) {
    case 'NO_PRIMARY_AGENT':
      return 'No primary agent is configured for this domain yet. Configure Kip from Studio or the Domain Board.';
    case 'MISSING_API_KEY':
      return 'Kip can’t run yet because this domain is missing an AI provider API key. Ask an admin to add one in Studio.';
    case 'INVALID_MODEL':
      return 'The model configured for Kip is not available. Update the agent to use a supported model.';
    case 'PROVIDER_UNAVAILABLE':
      return 'The AI provider is temporarily unavailable. Please try again in a few minutes.';
    case 'AGENT_MISCONFIGURED':
      return 'Kip’s configuration looks incomplete. Re-save the agent in Studio or assign a different primary agent.';
    default:
      return fallback || 'Kip ran into an unexpected issue. Please try again.';
  }
};

export default function DomainAgentPage() {
  const { slug } = useParams<{ slug: string }>();
  const [domain, setDomain] = useState<DomainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [noAgentConfigured, setNoAgentConfigured] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasWelcome, setHasWelcome] = useState(false);

  useEffect(() => {
    if (slug) {
      loadDomain();
    }
  }, [slug]);

  useEffect(() => {
    if (domain && !hasWelcome) {
      setMessages([createChatMessage('assistant', `Hi, I'm Kip for ${domain.name}. What would you like to explore?`)]);
      setHasWelcome(true);
    }
  }, [domain, hasWelcome]);

  async function loadDomain() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/domains/by-slug/${slug}`);

      if (response.error || !response.id) {
        throw new Error('Domain not found');
      }

      setDomain({
        id: response.id,
        name: response.name || response.slug,
        slug: response.slug,
        description: response.description,
      });
      setMessages([]);
      setHasWelcome(false);
      setSessionId(null);
      setNoAgentConfigured(false);
      setAgentError(null);
    } catch (err) {
      console.error('Error loading domain:', err);
      setError('Domain not found');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!domain) {
      return;
    }

    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }

    const userMessage = createChatMessage('user', trimmed);
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setAgentError(null);
    setNoAgentConfigured(false);
    setIsSending(true);

    try {
      const response = await executeDomainAgent(domain.id, {
        message: trimmed,
        context: { location: 'kip' },
        sessionId: sessionId ?? undefined,
      });

      const assistantMessage = createChatMessage(
        'assistant',
        response.reply || 'Kip responded but did not provide additional details.'
      );

      setSessionId(response.metadata?.sessionId ?? null);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const execError = err as ApiError;
      const errorCode = (execError.code || execError.data?.error) as AgentErrorCode | undefined;
      if (errorCode === 'NO_PRIMARY_AGENT') {
        setNoAgentConfigured(true);
      } else {
        setNoAgentConfigured(false);
      }
      setAgentError(friendlyAgentErrorMessage(errorCode, execError.message));
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <KeeperDashboardLayout title="Agent Workspace" subtitle="Your collaborative agent environment">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96E59] mx-auto mb-4" />
            <p className="text-gray-600">Loading agent workspace...</p>
          </div>
        </div>
      </KeeperDashboardLayout>
    );
  }

  if (error || !domain) {
    return (
      <KeeperDashboardLayout title="Agent Workspace" subtitle="Your collaborative agent environment">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Domain Not Found</h2>
          <p className="text-gray-600 mb-4">The domain "{slug}" could not be found.</p>
        </div>
      </KeeperDashboardLayout>
    );
  }

  return (
    <KeeperDashboardLayout
      title="Agent Workspace"
      subtitle="Your collaborative agent environment"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col min-h-[32rem]">
        <div className="pb-4 border-b border-gray-200 mb-4 flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-700">{`Talking with Kip — Lead Agent for ${domain.name}`}</p>
          <p className="text-xs text-gray-500">Ask about feed activity, keepers, journeys, or reflections.</p>
          {sessionId && (
            <span className="text-xs text-gray-400">{`Session ${sessionId.slice(0, 8)}`}</span>
          )}
        </div>

        {noAgentConfigured && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No primary agent is configured for this domain yet. Head to Studio → Domain Board to assign Kip.
          </div>
        )}

        {agentError && !noAgentConfigured && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {agentError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-6">
          {messages.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500">
              Say hello to Kip to start a conversation.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xl rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-[#C96E59] text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                  <span
                    className={`mt-2 block text-xs ${
                      message.role === 'user' ? 'text-white/80' : 'text-gray-500'
                    }`}
                  >
                    {formatTimestamp(message.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex justify-start text-sm text-gray-500 pl-1">
              Kip is thinking…
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={noAgentConfigured ? 'Configure a primary agent to start chatting' : 'Share your thoughts, ask for guidance, or reflect...'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C96E59] focus:border-transparent disabled:bg-gray-100"
              disabled={isSending || noAgentConfigured}
            />
            <button
              type="submit"
              disabled={isSending || noAgentConfigured || !inputValue.trim()}
              className="inline-flex items-center justify-center px-4 py-3 bg-[#C96E59] text-white rounded-lg hover:bg-[#B85D4A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <span className="text-sm font-medium">Sending…</span>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>

        <div className="pt-4 mt-4 border-t border-gray-100 text-sm text-gray-500">
          Tip: Ask Kip to summarize your feed, review recent keepers, or help plan the next journey.
        </div>
      </div>
    </KeeperDashboardLayout>
  );
}

