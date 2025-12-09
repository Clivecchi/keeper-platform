import { useCallback, useEffect, useState } from 'react';
import { KipApi, KipSession } from '../lib/kipApi';

export interface AgentConversationSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
  sessionName?: string | null;
}

const truncate = (value: string, limit = 96): string => {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value;
};

const readableDate = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const normalizeSession = (session: KipSession): AgentConversationSession => {
  const createdAtDate = session.created_at ? new Date(session.created_at) : new Date();
  const updatedAtDate = session.updated_at ? new Date(session.updated_at) : createdAtDate;
  const lastMessage = session.messages?.[session.messages.length - 1];

  return {
    id: session.id,
    title: session.session_name?.trim() || `Session • ${readableDate(createdAtDate)}`,
    createdAt: createdAtDate.toISOString(),
    updatedAt: updatedAtDate.toISOString(),
    lastMessagePreview: lastMessage?.content ? truncate(lastMessage.content) : undefined,
    sessionName: session.session_name ?? null,
  };
};

const createFriendlySessionName = () => `Session on ${readableDate(new Date())}`;

export function useAgentSessions(agentId?: string | null) {
  const [sessions, setSessions] = useState<AgentConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!agentId) {
      setSessions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await KipApi.getSessionsByAgentId(agentId);
      const normalized = data
        .map(normalizeSession)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSessions(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load sessions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreateSession = useCallback(
    async (sessionName?: string) => {
      if (!agentId) {
        throw new Error('Agent id is required to create a session');
      }
      setIsCreating(true);
      setError(null);
      try {
        const session = await KipApi.createSession(agentId, undefined, sessionName || createFriendlySessionName());
        const normalized = normalizeSession(session);
        setSessions((prev) => [normalized, ...prev.filter((existing) => existing.id !== normalized.id)]);
        return normalized;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to create session';
        setError(message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [agentId],
  );

  return {
    sessions,
    isLoading,
    isCreating,
    error,
    refresh: fetchSessions,
    createSession: handleCreateSession,
  };
}

