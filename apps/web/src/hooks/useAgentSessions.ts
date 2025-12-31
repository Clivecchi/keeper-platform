import { useCallback, useEffect, useState } from 'react';
import { KipApi, KipSession, SessionMetadataUpdate } from '../lib/kipApi';

export interface AgentConversationSession {
  id: string;
  title: string;
  subtitle?: string;
  topic?: string | null;
  summary?: string | null;
  tags?: string[];
  primaryKeeperId?: string | null;
  primaryJourneyId?: string | null;
  activeDraftId?: string | null;
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
  const topic = session.topic?.toString().trim() || null;
  const summary = session.summary?.toString().trim() || null;
  const activeDraftId =
    (session as any).activeDraftId ??
    (session as any).active_draft_id ??
    null;
  const primaryTitle = topic || session.session_name?.trim() || 'Session with Kip';
  const subtitle = summary
    ? truncate(summary, 120)
    : lastMessage?.content
      ? truncate(lastMessage.content, 120)
      : 'No summary yet.';

  return {
    id: session.id,
    title: primaryTitle || `Session • ${readableDate(createdAtDate)}`,
    subtitle,
    topic,
    summary: summary || null,
    tags: session.tags ?? [],
    primaryKeeperId:
      (session as any).primaryKeeperId ??
      (session as any).primary_keeper_id ??
      null,
    primaryJourneyId:
      (session as any).primaryJourneyId ??
      (session as any).primary_journey_id ??
      null,
    activeDraftId,
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
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
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
      const arrayData = Array.isArray(data) ? data : [];
      const normalized = arrayData
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
    async (
      sessionName?: string,
      options: { domainId?: string | null; domainSlug?: string | null } = {},
    ) => {
      if (!agentId) {
        throw new Error('Agent id is required to create a session');
      }
      setIsCreating(true);
      setError(null);
      try {
        const session = await KipApi.createSession(
          agentId,
          undefined,
          sessionName || createFriendlySessionName(),
          options,
        );
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

  const updateSessionMetadata = useCallback(
    async (sessionId: string, updates: SessionMetadataUpdate) => {
      if (!agentId) {
        throw new Error('Agent id is required to update session metadata');
      }
      setUpdatingSessionId(sessionId);
      setError(null);
      const previousSessions = sessions;
      const existing = sessions.find((session) => session.id === sessionId);

      if (existing) {
        const optimistic: AgentConversationSession = {
          ...existing,
          sessionName: updates.session_name ?? existing.sessionName,
          title: updates.session_name ?? existing.title,
          summary:
            updates.summary !== undefined
              ? updates.summary || null
              : existing.summary || null,
          tags: updates.tags !== undefined ? updates.tags : existing.tags,
          updatedAt: new Date().toISOString(),
        };
        setSessions((prev) => {
          const filtered = prev.filter((item) => item.id !== sessionId);
          const next = [optimistic, ...filtered];
          return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        });
      }

      try {
        const updated = await KipApi.updateSessionMetadata(agentId, sessionId, updates);
        const normalized = normalizeSession(updated);
        setSessions((prev) => {
          const filtered = prev.filter((existing) => existing.id !== sessionId);
          const next = [normalized, ...filtered];
          return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        });
        return normalized;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to update session';
        setError(message);
        if (previousSessions) {
          setSessions(previousSessions);
        }
        throw err;
      } finally {
        setUpdatingSessionId(null);
      }
    },
    [agentId, sessions],
  );

  return {
    sessions,
    isLoading,
    isCreating,
    updatingSessionId,
    error,
    refresh: fetchSessions,
    createSession: handleCreateSession,
    updateSessionMetadata,
  };
}

