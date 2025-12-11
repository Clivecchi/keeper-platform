import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { PaperAirplaneIcon, PlusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { KeeperDashboardLayout } from '../../layouts/KeeperDashboardLayout';
import { KipApi, KipAgent, KipMessage } from '../../lib/kipApi';
import { AgentConversationSession, useAgentSessions } from '../../hooks/useAgentSessions';
import { LinkedCard } from '../../components/props/LinkedCard';
import type { LinkedCardProps } from '../../types/props';
import { apiFetch } from '../../lib/api';

type AgentBoardTab = 'dialogue' | 'cockpit' | 'sessions';

interface DialogueMetaItem {
  label: string;
  value: string;
}

interface AgentDialogueMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  createdAt: string;
  linkedCard?: LinkedCardProps;
}

export interface KipAgentBoardProps {
  agentSlug?: string;
  contextLabel?: string;
  scopeLabel?: string;
  journeys?: LinkedCardProps[];
  keepers?: LinkedCardProps[];
}

const BOARD_TABS: { id: AgentBoardTab; label: string }[] = [
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'sessions', label: 'Sessions' },
];

const MOCK_JOURNEYS: LinkedCardProps[] = [
  {
    entityType: 'journey',
    entityId: 'journey-career-evolution',
    title: 'Career Evolution',
    subtitle: '8 moments',
    description: 'Documenting the transition from operator to strategic advisor.',
    href: '/journeys/career-evolution',
    color: '#C96E59',
    preview: {
      snippet: 'Next checkpoint with Kip scheduled for Friday.',
      date: '2025-12-05',
    },
  },
  {
    entityType: 'journey',
    entityId: 'journey-professional-dev',
    title: 'Professional Development',
    subtitle: '5 moments',
    description: 'Focus on communication habits and leadership presence.',
    href: '/journeys/professional-development',
    color: '#5A6ECD',
    preview: {
      snippet: 'Drafted a new narrative for Q1 planning.',
      date: '2025-12-02',
    },
  },
];

const MOCK_KEEPERS: LinkedCardProps[] = [
  {
    entityType: 'keeper',
    entityId: 'keeper-pool-company',
    title: 'Building the Pool Company',
    subtitle: '18 moments',
    href: '/keepers/building-the-pool-company',
    description: 'Entrepreneurial build story that Kip references for decisions.',
    color: '#0E9384',
    preview: {
      snippet: 'Kip flagged 3 new milestones during the last session.',
      image:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80',
    },
  },
];

const KipAgentBoardDefaults = {
  agentSlug: 'kip',
  contextLabel: 'Lead Agent of the KE3P Domain',
  scopeLabel: 'KE3P Domain',
} as const;

type DomainBasics = { domainId: string | null; domainSlug: string | null };

const useDomainIdentifier = (): {
  domainId: string | null;
  domainSlug: string | null;
  isLoading: boolean;
  error: string | null;
} => {
  const { slug } = useParams<{ slug: string }>();
  const [domainId, setDomainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!slug) {
      setDomainId(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    apiFetch(`/api/domains/by-slug/${slug}`)
      .then((resp) => {
        if (cancelled) return;
        if (resp?.id) {
          setDomainId(resp.id);
        } else {
          setError('Domain not found');
          setDomainId(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unable to load domain';
        setError(message);
        setDomainId(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { domainId, domainSlug: slug ?? null, isLoading, error };
};

const useAgentRelatedJourneys = ({
  domainId,
  domainSlug,
  limit = 4,
  initialJourneys = [],
}: DomainBasics & { limit?: number; initialJourneys?: LinkedCardProps[] }) => {
  const [journeys, setJourneys] = useState<LinkedCardProps[]>(initialJourneys);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domainId) {
      setJourneys(initialJourneys);
      setError(null);
      return;
    }
    let cancelled = false;
    const fetchJourneys = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ domainId, limit: String(limit) });
        const response = await apiFetch(`/api/journeys?${params.toString()}`);
        const items = Array.isArray(response?.journeys)
          ? response.journeys
          : Array.isArray(response?.data?.journeys)
            ? response.data.journeys
            : [];
        const mapped = items
          .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
          .slice(0, limit)
          .map((journey: any): LinkedCardProps => {
            const updated = journey.updatedAt || journey.createdAt;
            const subtitleParts: string[] = [];
            if (journey.pathCount != null) subtitleParts.push(`${journey.pathCount} paths`);
            if (journey.momentCount != null) subtitleParts.push(`${journey.momentCount} moments`);
            if (updated) subtitleParts.push(`Updated ${formatRelative(updated)}`);
            return {
              entityType: 'journey',
              entityId: journey.id,
              title: journey.name || journey.title || 'Journey',
              subtitle: subtitleParts.length ? subtitleParts.join(' • ') : journey.forward,
              description: journey.forward,
              href: domainSlug ? `/d/${domainSlug}/journeys` : '/journeys',
              color: journey.theme?.palette?.primary,
            };
          });
        if (!cancelled) {
          setJourneys(mapped);
        }
      } catch (err: any) {
        if (cancelled) return;
        // Treat all failures as empty state to avoid noisy UI when unauthenticated or empty
        setJourneys([]);
        setError(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    fetchJourneys();
    return () => {
      cancelled = true;
    };
  }, [domainId, domainSlug, limit, initialJourneys]);

  return { journeys, isLoading, error };
};

const useAgentActiveKeeper = ({
  domainId,
  domainSlug,
  initialKeepers = [],
}: DomainBasics & { initialKeepers?: LinkedCardProps[] }) => {
  const [keepers, setKeepers] = useState<LinkedCardProps[]>(initialKeepers);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domainId) {
      setKeepers(initialKeepers);
      setError(null);
      return;
    }
    let cancelled = false;
    const fetchKeeper = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ domainId, limit: '1' });
        const response = await apiFetch(`/api/keepers?${params.toString()}`);
        const list = Array.isArray(response?.keepers)
          ? response.keepers
          : Array.isArray(response?.data?.keepers)
            ? response.data.keepers
            : [];
        const top = list[0];
        if (top) {
          const subtitleParts: string[] = [];
          if (top.type) subtitleParts.push(top.type);
          if (top.purpose) subtitleParts.push(top.purpose);
          const updated = top.updatedAt || top.createdAt;
          if (updated) subtitleParts.push(`Updated ${formatRelative(updated)}`);
          const mapped: LinkedCardProps = {
            entityType: 'keeper',
            entityId: top.id,
            title: top.title || 'Keeper',
            subtitle: subtitleParts.join(' • ') || undefined,
            description: top.purpose,
            href: domainSlug ? `/d/${domainSlug}/keepers` : '/keeper',
            color: '#0E9384',
          };
          if (!cancelled) {
            setKeepers([mapped]);
          }
        } else if (!cancelled) {
          setKeepers([]);
        }
      } catch (err: any) {
        if (cancelled) return;
        // Treat all failures as empty state to avoid noisy UI when unauthenticated or empty
        setKeepers([]);
        setError(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    fetchKeeper();
    return () => {
      cancelled = true;
    };
  }, [domainId, domainSlug, initialKeepers]);

  return { keepers, isLoading, error };
};

export const KipAgentBoard: React.FC<KipAgentBoardProps> = ({
  agentSlug = KipAgentBoardDefaults.agentSlug,
  contextLabel = KipAgentBoardDefaults.contextLabel,
  scopeLabel = KipAgentBoardDefaults.scopeLabel,
  journeys = MOCK_JOURNEYS,
  keepers = MOCK_KEEPERS,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { domainId, domainSlug, isLoading: isDomainLoading } = useDomainIdentifier();
  const [agent, setAgent] = useState<KipAgent | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [isAgentLoading, setIsAgentLoading] = useState<boolean>(true);

  const [messages, setMessages] = useState<AgentDialogueMessage[]>([]);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState('');

  const activeTab = (searchParams.get('view') as AgentBoardTab) ?? 'dialogue';

  const {
    sessions,
    isLoading: isSessionsLoading,
    isCreating: isCreatingSession,
    error: sessionsError,
    refresh: refreshSessions,
    createSession,
  } = useAgentSessions(agent?.id);

  const querySessionId = searchParams.get('sessionId');
  const activeSessionId = querySessionId ?? (sessions.length ? sessions[0].id : null);

  const agentDomainId =
    (agent as any)?.domainId ||
    (agent as any)?.domain_id ||
    (agent as any)?.config?.domainId ||
    (agent as any)?.scope?.domainId ||
    (agent as any)?.scope?.domain_id ||
    null;
  const agentDomainSlug =
    (agent as any)?.domainSlug || (agent as any)?.domain_slug || (agent as any)?.config?.domainSlug || domainSlug;

  const {
    journeys: relatedJourneys,
    isLoading: isJourneysLoading,
    error: relatedJourneysError,
  } = useAgentRelatedJourneys({
    domainId: domainId || agentDomainId,
    domainSlug: agentDomainSlug,
    initialJourneys: journeys,
  });
  const {
    keepers: activeKeepers,
    isLoading: isKeepersLoading,
    error: activeKeeperError,
  } = useAgentActiveKeeper({
    domainId: domainId || agentDomainId,
    domainSlug: agentDomainSlug,
    initialKeepers: keepers,
  });

  useEffect(() => {
    if (!searchParams.get('view')) {
      const next = new URLSearchParams(searchParams);
      next.set('view', 'dialogue');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (sessions.length && !querySessionId) {
      const next = new URLSearchParams(searchParams);
      next.set('sessionId', sessions[0].id);
      setSearchParams(next, { replace: true });
    }
  }, [sessions, querySessionId, searchParams, setSearchParams]);

  useEffect(() => {
    let isMounted = true;
    setIsAgentLoading(true);
    KipApi.getLeadAgent(agentSlug)
      .then((data) => {
        if (!isMounted) return;
        setAgent(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Unable to load Kip';
        setAgentError(message);
      })
      .finally(() => {
        if (isMounted) {
          setIsAgentLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [agentSlug]);

  const fetchMessages = useCallback(
    async (sessionId: string, options: { silent?: boolean } = {}) => {
      if (!sessionId) {
        setMessages([]);
        return;
      }
      if (!options.silent) {
        setIsLoadingMessages(true);
      }
      setMessagesError(null);
      try {
        const data = await KipApi.getSessionMessages(sessionId);
        setMessages(data.map(normalizeMessage));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load messages';
        setMessagesError(message);
      } finally {
        if (!options.silent) {
          setIsLoadingMessages(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, fetchMessages]);

  const handleTabChange = (tab: AgentBoardTab) => {
    if (tab === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set('view', tab);
    setSearchParams(next, { replace: true });
  };

  const handleSessionSelect = (sessionId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('sessionId', sessionId);
    setSearchParams(next, { replace: true });
  };

  const handleCreateSession = async () => {
    try {
      const session = await createSession();
      const next = new URLSearchParams(searchParams);
      next.set('sessionId', session.id);
      setSearchParams(next, { replace: true });
      setMessages([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create session';
      setMessagesError(message);
    }
  };

  const handleSendMessage = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!agent?.id || !activeSessionId || !inputValue.trim() || isSending) {
      return;
    }

    const content = inputValue.trim();
    const optimisticMessage: AgentDialogueMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue('');
    setIsSending(true);
    setMessagesError(null);

    try {
      const result = await KipApi.runAgent(agent.id, content, undefined, activeSessionId);
      const sessionIdFromResponse =
        (result as any)?.data?.data?.session_id || (result as any)?.session_id || null;

      if (!activeSessionId && sessionIdFromResponse) {
        const next = new URLSearchParams(searchParams);
        next.set('sessionId', sessionIdFromResponse);
        setSearchParams(next, { replace: true });
      } else {
        await fetchMessages(activeSessionId, { silent: true });
      }
      refreshSessions();
    } catch (err) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      const message = err instanceof Error ? err.message : 'Unable to send message';
      setMessagesError(message);
    } finally {
      setIsSending(false);
    }
  };

  const dialogueMeta = useMemo<DialogueMetaItem[]>(
    () => [
      { label: 'Model', value: agent?.model_settings?.model || agent?.model || 'gpt-4o' },
      { label: 'Memory', value: agent?.memory_enabled ? 'SOLE' : 'Off' },
      { label: 'Scope', value: scopeLabel },
    ],
    [agent, scopeLabel],
  );

  if (agentError) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Unable to load Kip</h2>
          <p className="text-gray-600">{agentError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AgentHeader
        agent={agent}
        domainSlug={domainSlug || agentDomainSlug || undefined}
        contextLabel={contextLabel}
        scopeLabel={scopeLabel}
        sessionId={activeSessionId}
        dialogueMeta={dialogueMeta}
      />

      <AgentBoardTabs activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === 'dialogue' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
          <div className="space-y-6">
            <FrameCard title="Related Journeys">
              <div className="space-y-3">
                {relatedJourneysError && (
                  <p className="text-sm text-red-600">Unable to load journeys right now.</p>
                )}
                {isDomainLoading || isJourneysLoading ? (
                  <p className="text-sm text-gray-500">Loading journeys…</p>
                ) : relatedJourneys.length === 0 ? (
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>No journeys yet for this domain.</p>
                    <ActionLink href={agentDomainSlug ? `/d/${agentDomainSlug}/journeys` : '/journeys'}>
                      Add a journey
                    </ActionLink>
                  </div>
                ) : (
                  relatedJourneys.map((journey) => (
                    <LinkedCard key={journey.entityId} {...journey} />
                  ))
                )}
              </div>
            </FrameCard>

            <FrameCard title="Active Keeper">
              <div className="space-y-3">
                {activeKeeperError && (
                  <p className="text-sm text-red-600">Unable to load keeper right now.</p>
                )}
                {isDomainLoading || isKeepersLoading ? (
                  <p className="text-sm text-gray-500">Loading keeper…</p>
                ) : activeKeepers.length === 0 ? (
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>No keepers for this domain yet.</p>
                    <ActionLink href={agentDomainSlug ? `/d/${agentDomainSlug}/keepers` : '/keeper'}>
                      Add a keeper
                    </ActionLink>
                  </div>
                ) : (
                  activeKeepers.map((keeper) => (
                    <LinkedCard key={keeper.entityId} {...keeper} />
                  ))
                )}
              </div>
            </FrameCard>
          </div>

          <div className="space-y-6">
            <FrameCard title="Dialogue" subtitle="Live conversation with Kip">
              <div className="space-y-4">
                <DialogueMetaInline items={dialogueMeta} activeSessionId={activeSessionId} />
                <DialogueMessageList
                  isLoading={isLoadingMessages || isAgentLoading}
                  messages={messages}
                  isSending={isSending}
                  error={messagesError}
                />
                <form onSubmit={handleSendMessage} className="flex gap-3 pt-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder={
                      activeSessionId
                        ? 'Share your thoughts...'
                        : 'Create a session to start chatting'
                    }
                    disabled={!activeSessionId || isSending}
                    className="flex-1 rounded-xl border border-[#E6DED5] px-4 py-3 text-sm focus:border-[#C96E59] focus:ring-2 focus:ring-[#C96E59]/30 disabled:bg-gray-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || !activeSessionId || isSending}
                    className="inline-flex items-center justify-center rounded-xl bg-[#C96E59] px-4 py-3 text-white hover:bg-[#B85D4A] disabled:opacity-50"
                  >
                    {isSending ? (
                      <span className="text-sm font-semibold">Sending…</span>
                    ) : (
                      <PaperAirplaneIcon className="h-5 w-5" />
                    )}
                  </button>
                </form>
                {messagesError && (
                  <p className="text-sm text-red-600">Message error: {messagesError}</p>
                )}
              </div>
            </FrameCard>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <FrameCard
            title="All Sessions"
            subtitle="Browse and jump into recent conversations"
            action={
              <button
                type="button"
                onClick={handleCreateSession}
                disabled={isCreatingSession || !agent}
                className="inline-flex items-center gap-2 rounded-full border border-[#C96E59]/40 px-3 py-1.5 text-sm font-medium text-[#C96E59] hover:border-[#C96E59] disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                New Session
              </button>
            }
          >
            {sessionsError && (
              <p className="mb-3 text-sm text-red-600">{sessionsError}</p>
            )}
            {sessions.length === 0 && !isSessionsLoading ? (
              <p className="text-sm text-gray-500">
                No sessions yet. Start a new one to begin documenting conversations.
              </p>
            ) : (
              <div className="space-y-4">
                {isSessionsLoading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : (
                  sessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      variant="full"
                      onSelect={() => handleSessionSelect(session.id)}
                    />
                  ))
                )}
              </div>
            )}
          </FrameCard>
        </div>
      )}

      {activeTab === 'cockpit' && (
        <div className="space-y-6">
          <CockpitPanel agent={agent} sessions={sessions} activeSessionId={activeSessionId} />
        </div>
      )}
    </div>
  );
};

const KipAgentBoardPage: React.FC = () => (
  <KeeperDashboardLayout title="Kip Agent Board" subtitle="Lead Agent of the KE3P Domain">
    <KipAgentBoard />
  </KeeperDashboardLayout>
);

export default KipAgentBoardPage;

const AgentBoardHeader: React.FC<{
  agent: KipAgent | null;
  contextLabel: string;
  scopeLabel: string;
}> = ({ agent, contextLabel, scopeLabel }) => (
  <div className="rounded-2xl border border-[#E6DED5] bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm uppercase tracking-wide text-gray-500">Lead Agent</p>
        <h1 className="text-3xl font-semibold text-gray-900">{agent?.name ?? 'Kip'}</h1>
        <p className="text-sm text-gray-500">
          Model {agent?.model_settings?.model || agent?.model || 'gpt-4o'} · Role: Lead Agent
        </p>
        <p className="text-sm text-gray-500">
          {contextLabel}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Online
        </span>
        <span className="text-sm text-gray-500">Scope: {scopeLabel}</span>
      </div>
    </div>
  </div>
);

const AgentBoardTabs: React.FC<{
  activeTab: AgentBoardTab;
  onChange: (tab: AgentBoardTab) => void;
}> = ({ activeTab, onChange }) => (
  <div className="flex gap-4 border-b border-[#E6DED5]">
    {BOARD_TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={clsx(
          'relative pb-3 text-sm font-semibold uppercase tracking-wide transition-colors',
          activeTab === tab.id ? 'text-[#C96E59]' : 'text-gray-500 hover:text-gray-700',
        )}
      >
        {tab.label}
        {activeTab === tab.id && (
          <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#C96E59]" />
        )}
      </button>
    ))}
  </div>
);

const FrameCard: React.FC<{
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, action, children }) => (
  <div className="rounded-2xl border border-[#E6DED5] bg-white p-6 shadow-sm">
    {(title || action) && (
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

const SessionCard: React.FC<{
  session: AgentConversationSession;
  isActive?: boolean;
  onSelect?: () => void;
  variant?: 'compact' | 'full';
}> = ({ session, isActive, onSelect, variant = 'compact' }) => (
  <button
    type="button"
    onClick={onSelect}
    className={clsx(
      'w-full rounded-2xl border px-4 py-3 text-left transition-shadow',
      isActive
        ? 'border-[#C96E59] bg-[#F7F1ED] shadow-sm'
        : 'border-[#E6DED5] bg-white hover:shadow',
    )}
  >
    <p className="text-sm font-semibold text-gray-900">{session.title}</p>
    {session.lastMessagePreview && (
      <p className="mt-1 text-sm text-gray-500">
        {session.lastMessagePreview}
      </p>
    )}
    <p className="mt-1 text-xs text-gray-400">
      {formatDate(session.updatedAt || session.createdAt)}
    </p>
    {variant === 'full' && (
      <p className="mt-1 text-xs text-gray-500">Session ID: {shortId(session.id)}</p>
    )}
  </button>
);

const DialogueMetaInline: React.FC<{
  items: DialogueMetaItem[];
  activeSessionId: string | null;
}> = ({ items, activeSessionId }) => (
  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
    <span>
      {items.map((item) => `${item.label}: ${item.value}`).join(' • ')}
      {activeSessionId ? ` • Session ${shortId(activeSessionId)}` : ''}
    </span>
  </div>
);

const DialogueMessageList: React.FC<{
  isLoading: boolean;
  messages: AgentDialogueMessage[];
  isSending: boolean;
  error: string | null;
}> = ({ isLoading, messages, isSending, error }) => (
  <div className="min-h-[24rem] space-y-4 overflow-y-auto rounded-2xl bg-[#FAF6F2] px-4 py-4">
    {isLoading ? (
      <>
        <SkeletonBubble alignment="left" />
        <SkeletonBubble alignment="right" />
      </>
    ) : messages.length === 0 ? (
      <div className="rounded-xl border border-dashed border-[#E6DED5] bg-white/70 p-6 text-center text-sm text-gray-500">
        Say hello to Kip to start the conversation.
      </div>
    ) : (
      messages.map((message) => (
        <div
          key={message.id}
          className={clsx(
            'flex',
            message.role === 'user' ? 'justify-end' : 'justify-start',
          )}
        >
          <div
            className={clsx(
              'max-w-xl rounded-2xl px-4 py-3 text-sm shadow-sm',
              message.role === 'user'
                ? 'bg-[#C96E59] text-white'
                : 'bg-white text-gray-900',
            )}
          >
            <p className="whitespace-pre-line">{message.content}</p>
            {message.linkedCard && (
              <div className="mt-3">
                <LinkedCard {...message.linkedCard} variant="inline" />
              </div>
            )}
            <span
              className={clsx(
                'mt-2 block text-xs',
                message.role === 'user' ? 'text-white/80' : 'text-gray-500',
              )}
            >
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>
      ))
    )}
    {isSending && (
      <p className="text-xs text-gray-500">Kip is thinking…</p>
    )}
    {error && <p className="text-xs text-red-600">Messages error: {error}</p>}
  </div>
);

const CockpitPanel: React.FC<{
  agent: KipAgent | null;
  sessions: AgentConversationSession[];
  activeSessionId: string | null;
}> = ({ agent, sessions, activeSessionId }) => {
  const activeSession = sessions.find((session) => session.id === activeSessionId);

  const latestUpdate = sessions[0]?.updatedAt;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <FrameCard title="Memory" subtitle="SOLE memory engine">
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-center justify-between">
            <span>Active session</span>
            <span className="font-semibold">
              {activeSession ? shortId(activeSession.id) : 'None'}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>Context tokens</span>
            <span className="font-semibold">2,847 / 4,000</span>
          </li>
          <li className="text-xs text-gray-500">
            SOLE memory system active — tracking key life events and journey progress.
          </li>
        </ul>
      </FrameCard>

      <FrameCard title="Agent Configuration">
        <dl className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <dt>Provider</dt>
            <dd className="font-semibold">
              {agent?.model_provider ? agent.model_provider.toUpperCase() : 'OPENAI'}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Model</dt>
            <dd className="font-semibold">{agent?.model_settings?.model || agent?.model}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Temperature</dt>
            <dd className="font-semibold">{agent?.model_settings?.temperature ?? 0.7}</dd>
          </div>
          <div className="text-xs text-gray-500">
            System prompt:{' '}
            {typeof agent?.config?.prompt_label === 'string'
              ? agent.config.prompt_label
              : 'Custom'}
          </div>
        </dl>
      </FrameCard>

      <FrameCard title="Tools & Integrations">
        <ul className="space-y-2 text-sm">
          {['Keeper context', 'Journey tracking', 'Moment creation'].map((tool) => (
            <li key={tool} className="flex items-center gap-2 text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {tool} enabled
            </li>
          ))}
          {agent?.tools?.length ? (
            <li className="text-xs text-gray-500">
              {agent.tools.join(', ')}
            </li>
          ) : null}
        </ul>
      </FrameCard>

      <FrameCard title="Diagnostics">
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-center justify-between">
            <span>Last session</span>
            <span className="font-semibold">
              {latestUpdate ? formatRelative(latestUpdate) : '—'}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>Sessions tracked</span>
            <span className="font-semibold">{sessions.length}</span>
          </li>
          <li className="text-xs text-gray-500">
            Status: Operational (updated {latestUpdate ? formatRelative(latestUpdate) : 'now'})
          </li>
          {/* TODO: Verify diagnostics wiring once backend exposes stats */}
        </ul>
      </FrameCard>
    </div>
  );
};

const SkeletonLine = () => (
  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
);

const SkeletonCard = () => (
  <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
);

const SkeletonBubble: React.FC<{ alignment: 'left' | 'right' }> = ({ alignment }) => (
  <div className={clsx('flex', alignment === 'left' ? 'justify-start' : 'justify-end')}>
    <div className="h-16 w-40 animate-pulse rounded-2xl bg-white/70" />
  </div>
);

const normalizeMessage = (message: KipMessage): AgentDialogueMessage => {
  const role = (message.sender || message.role) === 'user' ? 'user' : 'agent';
  return {
    id: message.id,
    role,
    content: message.content,
    createdAt: new Date(message.created_at || Date.now()).toISOString(),
    linkedCard: extractLinkedCard(message.metadata),
  };
};

const extractLinkedCard = (metadata: unknown): LinkedCardProps | undefined => {
  if (!metadata) return undefined;
  let payload: any = metadata;
  if (typeof metadata === 'string') {
    try {
      payload = JSON.parse(metadata);
    } catch {
      return undefined;
    }
  }
  const linked = payload?.linkedCard || payload?.linked_card;
  if (!linked || typeof linked !== 'object') return undefined;
  if (!linked.title || !linked.entityType || !linked.href) return undefined;
  const previewCandidate = linked.preview;
  const preview =
    previewCandidate && typeof previewCandidate === 'object'
      ? {
          image: previewCandidate.image,
          date: previewCandidate.date,
          snippet: previewCandidate.snippet,
        }
      : undefined;
  return {
    entityType: linked.entityType,
    entityId: linked.entityId || linked.id || linked.href,
    title: linked.title,
    subtitle: linked.subtitle,
    description: linked.description,
    href: linked.href,
    icon: linked.icon,
    color: linked.color,
    preview,
  };
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (value: string): string => {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatRelative = (value: string): string => {
  const date = new Date(value);
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const shortId = (id: string): string => id.slice(0, 6).toUpperCase();

const AgentHeader: React.FC<{
  agent: KipAgent | null;
  domainSlug?: string;
  contextLabel: string;
  scopeLabel: string;
  sessionId: string | null;
  dialogueMeta: DialogueMetaItem[];
}> = ({ agent, domainSlug, contextLabel, scopeLabel, sessionId, dialogueMeta }) => {
  const [isOpen, setIsOpen] = useState(false);
  const agentName = agent?.name || 'Kip';
  const roleText = domainSlug ? `Lead Agent for ${domainSlug}` : contextLabel;

  return (
    <div className="relative flex items-center justify-between rounded-2xl border border-[#E6DED5] bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{agentName}</h1>
          <span className="inline-flex items-center gap-2 text-sm text-emerald-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Online
          </span>
        </div>
        <p className="text-sm text-gray-600">{roleText}</p>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-[#E6DED5] bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:border-[#C96E59] hover:text-[#C96E59]"
          title="Agent mechanics"
        >
          <Cog6ToothIcon className="h-4 w-4" />
          Config
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[#E6DED5] bg-white p-4 shadow-lg z-20">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Agent configuration</h3>
            <dl className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Model</dt>
                <dd className="font-semibold">
                  {agent?.model_settings?.model || agent?.model || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Memory</dt>
                <dd className="font-semibold">{agent?.memory_enabled ? 'SOLE' : 'Off'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Scope</dt>
                <dd className="font-semibold">{scopeLabel}</dd>
              </div>
              {sessionId && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Session</dt>
                  <dd className="font-semibold">{shortId(sessionId)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Agent ID</dt>
                <dd className="font-mono text-xs text-gray-600 truncate max-w-[10rem]">
                  {agent?.id || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Slug</dt>
                <dd className="font-semibold">{agent?.slug || '—'}</dd>
              </div>
            </dl>
            <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500 space-y-1">
              {dialogueMeta.map((item) => (
                <div key={item.label}>{item.label}: {item.value}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ActionLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    className="inline-flex items-center gap-2 text-sm font-semibold text-[#C96E59] hover:text-[#B85D4A]"
  >
    <span>＋</span>
    {children}
  </a>
);

