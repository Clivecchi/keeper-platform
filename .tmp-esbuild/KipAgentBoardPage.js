"use strict";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { PaperAirplaneIcon, PlusIcon } from "@heroicons/react/24/outline";
import { KeeperDashboardLayout } from "../../layouts/KeeperDashboardLayout";
import { KipApi } from "../../lib/kipApi";
import { useAgentSessions } from "../../hooks/useAgentSessions";
import { LinkedCard } from "../../components/props/LinkedCard";
const BOARD_TABS = [
  { id: "dialogue", label: "Dialogue" },
  { id: "cockpit", label: "Cockpit" },
  { id: "sessions", label: "Sessions" }
];
const MOCK_JOURNEYS = [
  {
    entityType: "journey",
    entityId: "journey-career-evolution",
    title: "Career Evolution",
    subtitle: "8 moments",
    description: "Documenting the transition from operator to strategic advisor.",
    href: "/journeys/career-evolution",
    color: "#C96E59",
    preview: {
      snippet: "Next checkpoint with Kip scheduled for Friday.",
      date: "2025-12-05"
    }
  },
  {
    entityType: "journey",
    entityId: "journey-professional-dev",
    title: "Professional Development",
    subtitle: "5 moments",
    description: "Focus on communication habits and leadership presence.",
    href: "/journeys/professional-development",
    color: "#5A6ECD",
    preview: {
      snippet: "Drafted a new narrative for Q1 planning.",
      date: "2025-12-02"
    }
  }
];
const MOCK_KEEPERS = [
  {
    entityType: "keeper",
    entityId: "keeper-pool-company",
    title: "Building the Pool Company",
    subtitle: "18 moments",
    href: "/keepers/building-the-pool-company",
    description: "Entrepreneurial build story that Kip references for decisions.",
    color: "#0E9384",
    preview: {
      snippet: "Kip flagged 3 new milestones during the last session.",
      image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80"
    }
  }
];
const KipAgentBoardDefaults = {
  agentSlug: "kip",
  contextLabel: "Lead Agent of the KE3P Domain",
  scopeLabel: "KE3P Domain"
};
export const KipAgentBoard = ({
  agentSlug = KipAgentBoardDefaults.agentSlug,
  contextLabel = KipAgentBoardDefaults.contextLabel,
  scopeLabel = KipAgentBoardDefaults.scopeLabel,
  journeys = MOCK_JOURNEYS,
  keepers = MOCK_KEEPERS
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [agent, setAgent] = useState(null);
  const [agentError, setAgentError] = useState(null);
  const [isAgentLoading, setIsAgentLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [messagesError, setMessagesError] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const activeTab = searchParams.get("view") ?? "dialogue";
  const {
    sessions,
    isLoading: isSessionsLoading,
    isCreating: isCreatingSession,
    error: sessionsError,
    refresh: refreshSessions,
    createSession
  } = useAgentSessions(agent?.id);
  const querySessionId = searchParams.get("sessionId");
  const activeSessionId = querySessionId ?? (sessions.length ? sessions[0].id : null);
  useEffect(() => {
    if (!searchParams.get("view")) {
      const next = new URLSearchParams(searchParams);
      next.set("view", "dialogue");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  useEffect(() => {
    if (sessions.length && !querySessionId) {
      const next = new URLSearchParams(searchParams);
      next.set("sessionId", sessions[0].id);
      setSearchParams(next, { replace: true });
    }
  }, [sessions, querySessionId, searchParams, setSearchParams]);
  useEffect(() => {
    let isMounted = true;
    setIsAgentLoading(true);
    KipApi.getLeadAgent(agentSlug).then((data) => {
      if (!isMounted) return;
      setAgent(data);
    }).catch((err) => {
      if (!isMounted) return;
      const message = err instanceof Error ? err.message : "Unable to load Kip";
      setAgentError(message);
    }).finally(() => {
      if (isMounted) {
        setIsAgentLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [agentSlug]);
  const fetchMessages = useCallback(
    async (sessionId, options = {}) => {
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
        const message = err instanceof Error ? err.message : "Unable to load messages";
        setMessagesError(message);
      } finally {
        if (!options.silent) {
          setIsLoadingMessages(false);
        }
      }
    },
    []
  );
  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, fetchMessages]);
  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    const next = new URLSearchParams(searchParams);
    next.set("view", tab);
    setSearchParams(next, { replace: true });
  };
  const handleSessionSelect = (sessionId) => {
    const next = new URLSearchParams(searchParams);
    next.set("sessionId", sessionId);
    setSearchParams(next, { replace: true });
  };
  const handleCreateSession = async () => {
    try {
      const session = await createSession();
      const next = new URLSearchParams(searchParams);
      next.set("sessionId", session.id);
      setSearchParams(next, { replace: true });
      setMessages([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create session";
      setMessagesError(message);
    }
  };
  const handleSendMessage = async (event) => {
    event?.preventDefault();
    if (!agent?.id || !activeSessionId || !inputValue.trim() || isSending) {
      return;
    }
    const content = inputValue.trim();
    const optimisticMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue("");
    setIsSending(true);
    setMessagesError(null);
    try {
      const result = await KipApi.runAgent(agent.id, content, void 0, activeSessionId);
      const sessionIdFromResponse = result?.data?.data?.session_id || result?.session_id || null;
      if (!activeSessionId && sessionIdFromResponse) {
        const next = new URLSearchParams(searchParams);
        next.set("sessionId", sessionIdFromResponse);
        setSearchParams(next, { replace: true });
      } else {
        await fetchMessages(activeSessionId, { silent: true });
      }
      refreshSessions();
    } catch (err) {
      setMessages((prev) => prev.filter((message2) => message2.id !== optimisticMessage.id));
      const message = err instanceof Error ? err.message : "Unable to send message";
      setMessagesError(message);
    } finally {
      setIsSending(false);
    }
  };
  const dialogueMeta = useMemo(
    () => [
      { label: "Model", value: agent?.model_settings?.model || agent?.model || "gpt-4o" },
      { label: "Memory", value: agent?.memory_enabled ? "SOLE" : "Off" },
      { label: "Scope", value: scopeLabel }
    ],
    [agent, scopeLabel]
  );
  if (agentError) {
    return /* @__PURE__ */ jsx("div", { className: "space-y-6", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-red-200 rounded-2xl p-8 text-center", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-2xl font-semibold text-gray-900 mb-2", children: "Unable to load Kip" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-600", children: agentError })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(AgentBoardHeader, { agent, contextLabel, scopeLabel }),
    /* @__PURE__ */ jsx(AgentBoardTabs, { activeTab, onChange: handleTabChange }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-6 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsx(FrameCard, { title: "Agent Identity", children: isAgentLoading ? /* @__PURE__ */ jsx(SkeletonLine, {}) : /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold text-gray-900", children: agent?.name ?? "Kip" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: contextLabel })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-medium text-emerald-600", children: [
            /* @__PURE__ */ jsx("span", { className: "h-2.5 w-2.5 rounded-full bg-emerald-500" }),
            "Online"
          ] })
        ] }) }),
        /* @__PURE__ */ jsxs(
          FrameCard,
          {
            title: "Sessions",
            subtitle: "Latest conversations with Kip",
            action: /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: handleCreateSession,
                disabled: isCreatingSession || !agent,
                className: "inline-flex items-center gap-2 rounded-full border border-[#C96E59]/40 px-3 py-1.5 text-sm font-medium text-[#C96E59] hover:border-[#C96E59] disabled:opacity-50",
                children: [
                  /* @__PURE__ */ jsx(PlusIcon, { className: "h-4 w-4" }),
                  "New Session"
                ]
              }
            ),
            children: [
              sessionsError && /* @__PURE__ */ jsx("p", { className: "mb-3 text-sm text-red-600", children: sessionsError }),
              /* @__PURE__ */ jsx("div", { className: "space-y-3 max-h-80 overflow-y-auto pr-1", children: isSessionsLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(SkeletonCard, {}),
                /* @__PURE__ */ jsx(SkeletonCard, {})
              ] }) : sessions.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "No sessions yet. Start one to begin tracking thoughts with Kip." }) : sessions.map((session) => /* @__PURE__ */ jsx(
                SessionCard,
                {
                  session,
                  isActive: session.id === activeSessionId,
                  onSelect: () => handleSessionSelect(session.id)
                },
                session.id
              )) })
            ]
          }
        ),
        /* @__PURE__ */ jsx(FrameCard, { title: "Related Journeys", children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: journeys.map((journey) => /* @__PURE__ */ jsx(LinkedCard, { ...journey }, journey.entityId)) }) }),
        /* @__PURE__ */ jsx(FrameCard, { title: "Active Keeper", children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: keepers.map((keeper) => /* @__PURE__ */ jsx(LinkedCard, { ...keeper }, keeper.entityId)) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        activeTab === "dialogue" && /* @__PURE__ */ jsx(FrameCard, { title: "Dialogue", subtitle: "Live conversation with Kip", children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsx(DialogueMetaStrip, { items: dialogueMeta, activeSessionId }),
          /* @__PURE__ */ jsx(
            DialogueMessageList,
            {
              isLoading: isLoadingMessages || isAgentLoading,
              messages,
              isSending,
              error: messagesError
            }
          ),
          /* @__PURE__ */ jsxs("form", { onSubmit: handleSendMessage, className: "flex gap-3 pt-2", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: inputValue,
                onChange: (event) => setInputValue(event.target.value),
                placeholder: activeSessionId ? "Share your thoughts..." : "Create a session to start chatting",
                disabled: !activeSessionId || isSending,
                className: "flex-1 rounded-xl border border-[#E6DED5] px-4 py-3 text-sm focus:border-[#C96E59] focus:ring-2 focus:ring-[#C96E59]/30 disabled:bg-gray-50"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "submit",
                disabled: !inputValue.trim() || !activeSessionId || isSending,
                className: "inline-flex items-center justify-center rounded-xl bg-[#C96E59] px-4 py-3 text-white hover:bg-[#B85D4A] disabled:opacity-50",
                children: isSending ? /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: "Sending\u2026" }) : /* @__PURE__ */ jsx(PaperAirplaneIcon, { className: "h-5 w-5" })
              }
            )
          ] }),
          messagesError && /* @__PURE__ */ jsxs("p", { className: "text-sm text-red-600", children: [
            "Message error: ",
            messagesError
          ] })
        ] }) }),
        activeTab === "sessions" && /* @__PURE__ */ jsx(
          FrameCard,
          {
            title: "All Sessions",
            subtitle: "Browse and jump into recent conversations",
            action: /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: handleCreateSession,
                disabled: isCreatingSession || !agent,
                className: "inline-flex items-center gap-2 rounded-full border border-[#C96E59]/40 px-3 py-1.5 text-sm font-medium text-[#C96E59] hover:border-[#C96E59] disabled:opacity-50",
                children: [
                  /* @__PURE__ */ jsx(PlusIcon, { className: "h-4 w-4" }),
                  "New Session"
                ]
              }
            ),
            children: sessions.length === 0 && !isSessionsLoading ? /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "No sessions yet. Start a new one to begin documenting conversations." }) : /* @__PURE__ */ jsx("div", { className: "space-y-4", children: sessions.map((session) => /* @__PURE__ */ jsx(
              SessionCard,
              {
                session,
                isActive: session.id === activeSessionId,
                variant: "full",
                onSelect: () => handleSessionSelect(session.id)
              },
              session.id
            )) })
          }
        ),
        activeTab === "cockpit" && /* @__PURE__ */ jsx(CockpitPanel, { agent, sessions, activeSessionId })
      ] })
    ] })
  ] });
};
const KipAgentBoardPage = () => /* @__PURE__ */ jsx(KeeperDashboardLayout, { title: "Kip Agent Board", subtitle: "Lead Agent of the KE3P Domain", children: /* @__PURE__ */ jsx(KipAgentBoard, {}) });
export default KipAgentBoardPage;
const AgentBoardHeader = ({ agent, contextLabel, scopeLabel }) => /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-[#E6DED5] bg-white p-6 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between", children: [
  /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("p", { className: "text-sm uppercase tracking-wide text-gray-500", children: "Lead Agent" }),
    /* @__PURE__ */ jsx("h1", { className: "text-3xl font-semibold text-gray-900", children: agent?.name ?? "Kip" }),
    /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-500", children: [
      "Model ",
      agent?.model_settings?.model || agent?.model || "gpt-4o",
      " \xB7 Role: Lead Agent"
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: contextLabel })
  ] }),
  /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
    /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700", children: [
      /* @__PURE__ */ jsx("span", { className: "h-2.5 w-2.5 rounded-full bg-emerald-500" }),
      "Online"
    ] }),
    /* @__PURE__ */ jsxs("span", { className: "text-sm text-gray-500", children: [
      "Scope: ",
      scopeLabel
    ] })
  ] })
] }) });
const AgentBoardTabs = ({ activeTab, onChange }) => /* @__PURE__ */ jsx("div", { className: "flex gap-4 border-b border-[#E6DED5]", children: BOARD_TABS.map((tab) => /* @__PURE__ */ jsxs(
  "button",
  {
    type: "button",
    onClick: () => onChange(tab.id),
    className: clsx(
      "relative pb-3 text-sm font-semibold uppercase tracking-wide transition-colors",
      activeTab === tab.id ? "text-[#C96E59]" : "text-gray-500 hover:text-gray-700"
    ),
    children: [
      tab.label,
      activeTab === tab.id && /* @__PURE__ */ jsx("span", { className: "absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#C96E59]" })
    ]
  },
  tab.id
)) });
const FrameCard = ({ title, subtitle, action, children }) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-[#E6DED5] bg-white p-6 shadow-sm", children: [
  (title || action) && /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-start justify-between gap-3", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      title && /* @__PURE__ */ jsx("h2", { className: "text-base font-semibold text-gray-900", children: title }),
      subtitle && /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: subtitle })
    ] }),
    action
  ] }),
  children
] });
const SessionCard = ({ session, isActive, onSelect, variant = "compact" }) => /* @__PURE__ */ jsxs(
  "button",
  {
    type: "button",
    onClick: onSelect,
    className: clsx(
      "w-full rounded-2xl border px-4 py-3 text-left transition-shadow",
      isActive ? "border-[#C96E59] bg-[#F7F1ED] shadow-sm" : "border-[#E6DED5] bg-white hover:shadow"
    ),
    children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-gray-900", children: session.title }),
      session.lastMessagePreview && /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500", children: session.lastMessagePreview }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-gray-400", children: formatDate(session.updatedAt || session.createdAt) }),
      variant === "full" && /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs text-gray-500", children: [
        "Session ID: ",
        shortId(session.id)
      ] })
    ]
  }
);
const DialogueMetaStrip = ({ items, activeSessionId }) => /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
  items.map((item) => /* @__PURE__ */ jsxs(
    "span",
    {
      className: "inline-flex items-center gap-2 rounded-full bg-[#F7F3EE] px-4 py-1.5 text-xs font-semibold uppercase text-gray-600",
      children: [
        item.label,
        ": ",
        /* @__PURE__ */ jsx("span", { className: "text-gray-900 normal-case", children: item.value })
      ]
    },
    item.label
  )),
  activeSessionId && /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 rounded-full bg-[#E7F6EF] px-4 py-1.5 text-xs font-semibold uppercase text-emerald-700", children: [
    "Session ",
    shortId(activeSessionId)
  ] })
] });
const DialogueMessageList = ({ isLoading, messages, isSending, error }) => /* @__PURE__ */ jsxs("div", { className: "min-h-[24rem] space-y-4 overflow-y-auto rounded-2xl bg-[#FAF6F2] px-4 py-4", children: [
  isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(SkeletonBubble, { alignment: "left" }),
    /* @__PURE__ */ jsx(SkeletonBubble, { alignment: "right" })
  ] }) : messages.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-dashed border-[#E6DED5] bg-white/70 p-6 text-center text-sm text-gray-500", children: "Say hello to Kip to start the conversation." }) : messages.map((message) => /* @__PURE__ */ jsx(
    "div",
    {
      className: clsx(
        "flex",
        message.role === "user" ? "justify-end" : "justify-start"
      ),
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: clsx(
            "max-w-xl rounded-2xl px-4 py-3 text-sm shadow-sm",
            message.role === "user" ? "bg-[#C96E59] text-white" : "bg-white text-gray-900"
          ),
          children: [
            /* @__PURE__ */ jsx("p", { className: "whitespace-pre-line", children: message.content }),
            message.linkedCard && /* @__PURE__ */ jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsx(LinkedCard, { ...message.linkedCard, variant: "inline" }) }),
            /* @__PURE__ */ jsx(
              "span",
              {
                className: clsx(
                  "mt-2 block text-xs",
                  message.role === "user" ? "text-white/80" : "text-gray-500"
                ),
                children: formatTime(message.createdAt)
              }
            )
          ]
        }
      )
    },
    message.id
  )),
  isSending && /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500", children: "Kip is thinking\u2026" }),
  error && /* @__PURE__ */ jsxs("p", { className: "text-xs text-red-600", children: [
    "Messages error: ",
    error
  ] })
] });
const CockpitPanel = ({ agent, sessions, activeSessionId }) => {
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const latestUpdate = sessions[0]?.updatedAt;
  return /* @__PURE__ */ jsxs("div", { className: "grid gap-6 md:grid-cols-2", children: [
    /* @__PURE__ */ jsx(FrameCard, { title: "Memory", subtitle: "SOLE memory engine", children: /* @__PURE__ */ jsxs("ul", { className: "space-y-3 text-sm text-gray-700", children: [
      /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("span", { children: "Active session" }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: activeSession ? shortId(activeSession.id) : "None" })
      ] }),
      /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("span", { children: "Context tokens" }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "2,847 / 4,000" })
      ] }),
      /* @__PURE__ */ jsx("li", { className: "text-xs text-gray-500", children: "SOLE memory system active \u2014 tracking key life events and journey progress." })
    ] }) }),
    /* @__PURE__ */ jsx(FrameCard, { title: "Agent Configuration", children: /* @__PURE__ */ jsxs("dl", { className: "space-y-3 text-sm text-gray-700", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("dt", { children: "Provider" }),
        /* @__PURE__ */ jsx("dd", { className: "font-semibold", children: agent?.model_provider ? agent.model_provider.toUpperCase() : "OPENAI" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("dt", { children: "Model" }),
        /* @__PURE__ */ jsx("dd", { className: "font-semibold", children: agent?.model_settings?.model || agent?.model })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("dt", { children: "Temperature" }),
        /* @__PURE__ */ jsx("dd", { className: "font-semibold", children: agent?.model_settings?.temperature ?? 0.7 })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-500", children: [
        "System prompt: ",
        agent?.config?.prompt_label ?? "Custom"
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(FrameCard, { title: "Tools & Integrations", children: /* @__PURE__ */ jsxs("ul", { className: "space-y-2 text-sm", children: [
      ["Keeper context", "Journey tracking", "Moment creation"].map((tool) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-2 text-emerald-600", children: [
        /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-emerald-500" }),
        tool,
        " enabled"
      ] }, tool)),
      agent?.tools?.length ? /* @__PURE__ */ jsx("li", { className: "text-xs text-gray-500", children: agent.tools.join(", ") }) : null
    ] }) }),
    /* @__PURE__ */ jsx(FrameCard, { title: "Diagnostics", children: /* @__PURE__ */ jsxs("ul", { className: "space-y-2 text-sm text-gray-700", children: [
      /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("span", { children: "Last session" }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: latestUpdate ? formatRelative(latestUpdate) : "\u2014" })
      ] }),
      /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("span", { children: "Sessions tracked" }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: sessions.length })
      ] }),
      /* @__PURE__ */ jsxs("li", { className: "text-xs text-gray-500", children: [
        "Status: Operational (updated ",
        latestUpdate ? formatRelative(latestUpdate) : "now",
        ")"
      ] })
    ] }) })
  ] });
};
const SkeletonLine = () => /* @__PURE__ */ jsx("div", { className: "h-4 w-3/4 animate-pulse rounded bg-gray-100" });
const SkeletonCard = () => /* @__PURE__ */ jsx("div", { className: "h-20 animate-pulse rounded-2xl bg-gray-100" });
const SkeletonBubble = ({ alignment }) => /* @__PURE__ */ jsx("div", { className: clsx("flex", alignment === "left" ? "justify-start" : "justify-end"), children: /* @__PURE__ */ jsx("div", { className: "h-16 w-40 animate-pulse rounded-2xl bg-white/70" }) });
const normalizeMessage = (message) => {
  const role = (message.sender || message.role) === "user" ? "user" : "agent";
  return {
    id: message.id,
    role,
    content: message.content,
    createdAt: new Date(message.created_at || Date.now()).toISOString(),
    linkedCard: extractLinkedCard(message.metadata)
  };
};
const extractLinkedCard = (metadata) => {
  if (!metadata) return void 0;
  let payload = metadata;
  if (typeof metadata === "string") {
    try {
      payload = JSON.parse(metadata);
    } catch {
      return void 0;
    }
  }
  const linked = payload?.linkedCard || payload?.linked_card;
  if (!linked || typeof linked !== "object") return void 0;
  if (!linked.title || !linked.entityType || !linked.href) return void 0;
  const previewCandidate = linked.preview;
  const preview = previewCandidate && typeof previewCandidate === "object" ? {
    image: previewCandidate.image,
    date: previewCandidate.date,
    snippet: previewCandidate.snippet
  } : void 0;
  return {
    entityType: linked.entityType,
    entityId: linked.entityId || linked.id || linked.href,
    title: linked.title,
    subtitle: linked.subtitle,
    description: linked.description,
    href: linked.href,
    icon: linked.icon,
    color: linked.color,
    preview
  };
};
const formatDate = (value) => {
  const date = new Date(value);
  return date.toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
};
const formatTime = (value) => {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};
const formatRelative = (value) => {
  const date = new Date(value);
  return date.toLocaleString(void 0, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};
const shortId = (id) => id.slice(0, 6).toUpperCase();
