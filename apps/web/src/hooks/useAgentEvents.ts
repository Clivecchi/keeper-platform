import { useEffect, useRef } from 'react';

export type AgentEvent = {
  type: string;
  agentId: string;
  topicId?: string;
  draftId?: string;
  taskId?: string;
  activityId?: string;
  data?: unknown;
  at: string;
};

type Handlers = {
  onEvent?: (e: AgentEvent) => void;
  onError?: (err: Event) => void;
  onOpen?: () => void;
};

export function useAgentEvents(agentId: string, enabled = true, handlers: Handlers = {}) {
  const esRef = useRef<EventSource | null>(null);
  const backoffRef = useRef<number>(1000);
  const stoppedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!agentId || !enabled) return;
    stoppedRef.current = false;

    const connect = () => {
      try {
        // Only connect after the board is fully initialized by caller
        const es = new EventSource(`/api/agents/${agentId}/events`, { withCredentials: true } as any);
        esRef.current = es;

        es.onopen = () => {
          backoffRef.current = 1000;
          handlers.onOpen?.();
        };

        es.onmessage = (ev) => {
          if (!ev?.data) return;
          try {
            const parsed: AgentEvent = JSON.parse(ev.data);
            handlers.onEvent?.(parsed);
          } catch {}
        };

        es.onerror = (err) => {
          handlers.onError?.(err);
          es.close();
          if (stoppedRef.current) return;
          const next = Math.min(backoffRef.current * 2, 30000);
          backoffRef.current = next;
          setTimeout(connect, next);
        };
      } catch (e) {
        const next = Math.min(backoffRef.current * 2, 30000);
        backoffRef.current = next;
        setTimeout(connect, next);
      }
    };

    connect();

    return () => {
      stoppedRef.current = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [agentId, enabled, handlers.onEvent, handlers.onError, handlers.onOpen]);
}


