"use client"

import * as React from "react"
import type { FormEvent } from "react"
import { KipApi } from "../lib/kipApi"
import type { KipMessage } from "../lib/kipApi"
import type { AgentAttachment } from "../components/agent/AgentComposer"
import type { AgentDialogueMessage } from "../components/agent/types"
import { extractLinkedCard } from "../components/agent/helpers"
import { apiFetch } from "../lib/api"

/** Mirrors `KipApi.runAgent` `options.agentContext` (no separate exported type in codebase) */
export type AgentContext = NonNullable<Parameters<typeof KipApi.runAgent>[4]>["agentContext"]

export type IdeFrameContextLike =
  | {
      isResolving?: boolean
      domain?: { id?: string } | null
      selection?: { activeJourneyId?: string | null; activeKeeperId?: string | null }
    }
  | null
  | undefined

function sessionNameDateFallback(): string {
  return `Session · ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
}

function normalizeMessage(message: KipMessage): AgentDialogueMessage {
  const role = (message.sender || message.role) === "user" ? "user" : "agent"
  const meta = message.metadata as Record<string, unknown> | null | undefined
  const actionResults = Array.isArray(meta?.actionResults) ? meta.actionResults : undefined
  const linkedCard = extractLinkedCard(meta)
  return {
    id: message.id,
    role,
    content: message.content,
    createdAt: new Date(message.created_at || Date.now()).toISOString(),
    ...(linkedCard ? { linkedCard } : {}),
    ...(actionResults?.length ? { actionResults } : {}),
  }
}

async function buildIdeSessionName(params: {
  domainId: string | undefined
  activeJourneyId: string | null
  activeKeeperId: string | null
}): Promise<string> {
  const { domainId, activeJourneyId, activeKeeperId } = params
  if (activeJourneyId) {
    try {
      const res = (await apiFetch(`/api/journeys/${activeJourneyId}`)) as {
        journey?: { name?: string }
        data?: { name?: string }
      }
      const j = res.journey ?? res.data
      const n = j?.name?.trim()
      if (n) return n
    } catch {
      /* fall through */
    }
  }
  if (activeKeeperId) {
    try {
      const res = (await apiFetch(`/api/keepers/${activeKeeperId}`)) as {
        keeper?: { title?: string; name?: string }
        data?: { title?: string; name?: string }
      }
      const k = res.keeper ?? res.data
      const n = (k?.title ?? k?.name)?.trim()
      if (n) return n
    } catch {
      /* fall through */
    }
  }
  if (domainId) {
    try {
      const jRes = (await apiFetch(`/api/journeys?domainId=${encodeURIComponent(domainId)}`)) as {
        data?: { journeys?: Array<{ name?: string }> }
        journeys?: Array<{ name?: string }>
      }
      const journeys = jRes.data?.journeys ?? jRes.journeys ?? []
      const firstJ = Array.isArray(journeys) ? journeys[0] : null
      const jn = firstJ?.name?.trim()
      if (jn) return jn
    } catch {
      /* fall through */
    }
    try {
      const kRes = (await apiFetch(`/api/keepers?domainId=${encodeURIComponent(domainId)}`)) as {
        data?: { keepers?: Array<{ title?: string; name?: string }> }
        keepers?: Array<{ title?: string; name?: string }>
      }
      const keepers = kRes.data?.keepers ?? kRes.keepers ?? []
      const firstK = Array.isArray(keepers) ? keepers[0] : null
      const kn = (firstK?.title ?? firstK?.name)?.trim()
      if (kn) return kn
    } catch {
      /* use date */
    }
  }
  return sessionNameDateFallback()
}

export interface UseAgentDialogOptions {
  /** Agent slug used to resolve the agent via `KipApi.getLeadAgent`. */
  agentSlug: string
  /**
   * When set, skips slug lookup and uses this agent id directly.
   * Agent Board: non-default nav selection (e.g. Cloud) is not a Lead agent.
   */
  resolvedAgentId?: string | null
  /** Display name shown in thinking/error strings. */
  agentDisplayName: string
  /** Greeting shown in ide mode when the session has no messages yet. Defaults to "I'm here. What are we building?" */
  greetingMessage?: string
  mode: "ide" | "agent" | "domain" | "designer"
  /** Overrides the session metadata `dialogBoard` field. Defaults to `mode`. */
  dialogBoard?: string
  /** Overrides the session metadata `dialogFrame` field. Defaults to "conversation". */
  dialogFrame?: string
  /** Overrides the session metadata `dialogSubject` field. Defaults to "domain". */
  dialogSubject?: string
  /**
   * Session display name for agent/domain/designer modes.
   * A string is used directly; an async function is awaited once at session creation.
   * Defaults to "Agent Board" for agent mode, date fallback for domain/designer.
   */
  sessionDisplayName?: string | (() => Promise<string>)
  /** The `mode` field forwarded to `KipApi.runAgent` options. Defaults to "domain". */
  agentRunMode?: string
  /**
   * When true, session create/resume is owned by the board shell (e.g. Agent Board nav selection).
   * Skips auto session init to avoid competing sessions that trigger message resets.
   */
  manageSessionExternally?: boolean
  domainSlug: string
  domainId?: string | null
  activeJourneyId?: string | null
  agentContext?: AgentContext
  resolvedAudience?: string | null
  refreshSession?: () => Promise<boolean>
  frameCtx?: IdeFrameContextLike
  /** ide mode: session id owned by parent board */
  controlledSessionId?: string | null
  onControlledSessionIdChange?: (id: string | null) => void
  /** ide mode: after runAgent success — e.g. context sync + action receipts on last agent message */
  onAfterAgentRun?: (
    latestRaw: KipMessage[] | undefined,
    actionResults: unknown[] | undefined,
    result: unknown,
  ) => void
  /** agent/domain/designer: e.g. refresh draft list */
  onRefreshDraftsAfterRun?: (result: unknown) => Promise<void>
  /**
   * designer mode: the active frame key — forwarded as `dialogFrame` on session
   * creation and included in runAgent agentContext. sendMessage is a no-op
   * without it when mode === "designer".
   */
  frameKey?: string
}

export interface UseAgentDialogResult {
  messages: AgentDialogueMessage[]
  setMessages: React.Dispatch<React.SetStateAction<AgentDialogueMessage[]>>
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  isSending: boolean
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  /** Resolved agent ID from `KipApi.getLeadAgent(agentSlug)`. */
  agentId: string | null
  activeSessionId: string | null
  fetchMessages: (sessionId: string) => Promise<KipMessage[] | undefined>
  sendMessage: (
    e: FormEvent,
    payload: { content: string; attachments?: AgentAttachment[] },
  ) => Promise<void>
}

export function useAgentDialog({
  agentSlug,
  resolvedAgentId,
  agentDisplayName,
  greetingMessage,
  mode,
  dialogBoard,
  dialogFrame,
  dialogSubject,
  sessionDisplayName,
  agentRunMode,
  domainSlug,
  domainId,
  activeJourneyId = null,
  agentContext,
  resolvedAudience = "keeper",
  refreshSession,
  frameCtx,
  controlledSessionId,
  onControlledSessionIdChange,
  onAfterAgentRun,
  onRefreshDraftsAfterRun,
  frameKey,
  manageSessionExternally = false,
}: UseAgentDialogOptions): UseAgentDialogResult {
  const [internalSessionId, setInternalSessionId] = React.useState<string | null>(null)
  // Use controlledSessionId when it has been driven to a real value (non-null).
  // Fall back to internalSessionId for boards whose session lifecycle starts internally.
  const activeSessionId = controlledSessionId ?? internalSessionId

  // Stable greeting computed from params — only changes when slug/message change.
  const greeting = React.useMemo<AgentDialogueMessage>(
    () => ({
      id: `${agentSlug}-greeting`,
      role: "agent",
      content: greetingMessage ?? "I'm here. What are we building?",
      createdAt: new Date().toISOString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentSlug, greetingMessage],
  )

  const [messages, setMessages] = React.useState<AgentDialogueMessage[]>(() =>
    mode === "ide" ? [greeting] : [],
  )
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [agentId, setAgentId] = React.useState<string | null>(null)

  const ideSessionInitDoneRef = React.useRef(false)
  const activeSessionIdRef = React.useRef<string | null>(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  // Always-current snapshot of messages — lets sendMessage build conversation
  // history without adding `messages` to its dep array.
  const messagesRef = React.useRef<AgentDialogueMessage[]>(messages)
  messagesRef.current = messages

  const fetchMessages = React.useCallback(
    async (sessionId: string) => {
      try {
        const msgs: KipMessage[] = await KipApi.getSessionMessages(sessionId)
        if (mode === "ide") {
          setMessages(msgs.length ? msgs.map(normalizeMessage) : [greeting])
        } else {
          setMessages(msgs.map(normalizeMessage))
        }
        return msgs
      } catch {
        return undefined
      }
    },
    [mode, greeting],
  )

  // Resolve agent ID from slug, or use an explicit id (non-Lead agents on Agent Board).
  React.useEffect(() => {
    if (resolvedAgentId) {
      setAgentId(resolvedAgentId)
      return
    }
    let cancelled = false
    KipApi.getLeadAgent(agentSlug)
      .then((agent) => {
        if (!cancelled) setAgentId(agent.id)
      })
      .catch(() => {
        if (!cancelled) setAgentId(null)
      })
    return () => {
      cancelled = true
    }
  }, [agentSlug, resolvedAgentId])

  // agent / domain: create a KipApi session once agentId is known.
  // ide and designer use controlled session lifecycle from the board shell.
  React.useEffect(() => {
    if (mode === "ide" || mode === "designer" || manageSessionExternally || !agentId) return
    const aid = agentId
    let cancelled = false
    async function init() {
      try {
        let name: string
        if (typeof sessionDisplayName === "function") {
          name = await sessionDisplayName()
        } else {
          name =
            sessionDisplayName ??
            (mode === "agent" ? "Agent Board" : sessionNameDateFallback())
        }
        if (cancelled) return
        const session = await KipApi.createSession(aid, undefined, name, {
          domainSlug,
          ...(domainId ? { domainId } : {}),
          dialogBoard: dialogBoard ?? mode,
          dialogFrame: dialogFrame ?? "conversation",
          dialogSubject: dialogSubject ?? "domain",
          dialogScope: resolvedAudience === "admin" ? "admin" : "keeper",
        })
        if (!cancelled) setInternalSessionId(session.id)
      } catch {
        /* composer stays disabled */
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [mode, agentId, manageSessionExternally, domainSlug, domainId, resolvedAudience, dialogBoard, dialogFrame, dialogSubject, sessionDisplayName])

  // ide: controlled session bootstrap
  React.useEffect(() => {
    if (mode !== "ide") return
    if (ideSessionInitDoneRef.current) return
    if (activeSessionId) {
      ideSessionInitDoneRef.current = true
      return
    }
    if (!agentId) return
    const aid = agentId
    if (frameCtx?.isResolving) return
    const rid = frameCtx?.domain?.id
    const resolvedDomainId =
      rid && !String(rid).startsWith("fallback-")
        ? rid
        : domainId && !String(domainId).startsWith("fallback-")
          ? domainId
          : undefined

    let cancelled = false
    async function init() {
      try {
        const sessionName = await buildIdeSessionName({
          domainId: resolvedDomainId,
          activeJourneyId: activeJourneyId ?? frameCtx?.selection?.activeJourneyId ?? null,
          activeKeeperId: frameCtx?.selection?.activeKeeperId ?? null,
        })
        if (cancelled) return
        const session = await KipApi.createSession(aid, undefined, sessionName, {
          domainSlug,
          ...(resolvedDomainId ? { domainId: resolvedDomainId } : {}),
          dialogBoard: dialogBoard ?? "ide",
          dialogFrame: dialogFrame ?? "conversation",
          dialogSubject: dialogSubject ?? "domain",
          dialogScope: resolvedAudience === "admin" ? "admin" : "keeper",
        })
        if (cancelled) return
        ideSessionInitDoneRef.current = true
        if (!activeSessionIdRef.current) onControlledSessionIdChange?.(session.id)
      } catch {
        /* composer stays disabled */
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [
    mode,
    agentId,
    activeSessionId,
    domainSlug,
    domainId,
    resolvedAudience,
    dialogBoard,
    dialogFrame,
    dialogSubject,
    frameCtx?.isResolving,
    frameCtx?.domain?.id,
    frameCtx?.selection?.activeJourneyId,
    frameCtx?.selection?.activeKeeperId,
    activeJourneyId,
    onControlledSessionIdChange,
  ])

  React.useEffect(() => {
    if (!activeSessionId) return
    void fetchMessages(activeSessionId)
  }, [activeSessionId, fetchMessages])

  const sendMessage = React.useCallback(
    async (
      _e: FormEvent,
      { content, attachments }: { content: string; attachments?: AgentAttachment[] },
    ) => {
      if (mode === "designer" && !frameKey) return

      // ── ide / agent / domain / designer: KipApi.runAgent ──────────────────
      if ((!content.trim() && !attachments?.length) || isSending || !agentId || !activeSessionId) {
        return
      }

      const ts = Date.now()
      const thinkingId = `${agentSlug}-thinking-${ts}`

      if (mode !== "ide") {
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${ts}`,
            role: "user",
            content: content || "[attachment]",
            createdAt: new Date(ts).toISOString(),
          },
          {
            id: thinkingId,
            role: "agent",
            content: `${agentDisplayName} is thinking\u2026`,
            createdAt: new Date(ts).toISOString(),
          },
        ])
      } else {
        const optimistic: AgentDialogueMessage = {
          id: `user-${ts}`,
          role: "user",
          content: content || "[attachment]",
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, optimistic])
      }

      setInput("")
      setIsSending(true)
      if (mode === "ide") setError(null)

      const runOpts = {
        domainSlug: domainSlug || undefined,
        domainId: domainId || undefined,
        mode: (agentRunMode ?? (mode === "designer" ? "domain" : "domain")) as "domain",
        activeJourneyId: activeJourneyId ?? frameCtx?.selection?.activeJourneyId ?? undefined,
        activeKeeperId: frameCtx?.selection?.activeKeeperId ?? undefined,
        agentContext: mode === "designer" && frameKey
          ? { ...(agentContext ?? {}), designerFrameKey: frameKey }
          : agentContext,
        attachments: attachments?.length ? attachments : undefined,
      }

      try {
        let result: Awaited<ReturnType<typeof KipApi.runAgent>>
        try {
          result = await KipApi.runAgent(agentId, content, undefined, activeSessionId, runOpts)
        } catch (firstErr: unknown) {
          const status = (firstErr as { status?: number })?.status
          if (mode === "ide" && status === 401 && refreshSession) {
            const refreshed = await refreshSession()
            if (refreshed) {
              result = await KipApi.runAgent(agentId, content, undefined, activeSessionId, runOpts)
            } else {
              setMessages((prev) => prev.filter((m) => m.id !== `user-${ts}`))
              setError(`Please sign in to continue the conversation with ${agentDisplayName}.`)
              return
            }
          } else {
            throw firstErr
          }
        }

        const latestRaw = await fetchMessages(activeSessionId)
        const respData = (result as { data?: { actions?: unknown[] } })?.data
        const actionResults =
          respData?.actions || (result as { actionResults?: unknown })?.actionResults
        const actionsArr = Array.isArray(actionResults) ? actionResults : undefined

        if (onAfterAgentRun) {
          onAfterAgentRun(latestRaw, actionsArr, result)
        }
        if (mode === "ide" && actionsArr && actionsArr.length > 0) {
          setMessages((prev) => {
            const updated = [...prev]
            const lastAgentIdx = updated.findLastIndex((m) => m.role === "agent")
            if (lastAgentIdx >= 0) {
              updated[lastAgentIdx] = { ...updated[lastAgentIdx], actionResults: actionsArr }
            }
            return updated
          })
        }

        await onRefreshDraftsAfterRun?.(result)
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status
        const message = err instanceof Error ? err.message : ""
        const authMsg = `Please sign in to continue the conversation with ${agentDisplayName}.`
        const failMsg =
          message && message.length > 0 && message.length < 300
            ? message
            : `${agentDisplayName} couldn't respond. Try again.`
        const reply = status === 401 ? authMsg : failMsg

        if (mode === "ide") {
          setMessages((prev) => prev.filter((m) => m.id !== `user-${ts}`))
          setError(reply)
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === thinkingId ? { ...m, content: reply } : m)),
          )
        }
      } finally {
        setIsSending(false)
      }
    },
    [
      mode,
      isSending,
      agentId,
      agentSlug,
      agentDisplayName,
      activeSessionId,
      domainSlug,
      domainId,
      activeJourneyId,
      agentRunMode,
      agentContext,
      frameCtx?.selection?.activeJourneyId,
      frameCtx?.selection?.activeKeeperId,
      fetchMessages,
      refreshSession,
      onAfterAgentRun,
      onRefreshDraftsAfterRun,
      frameKey,
    ],
  )

  return {
    messages,
    setMessages,
    input,
    setInput,
    isSending,
    error,
    setError,
    agentId,
    activeSessionId,
    fetchMessages,
    sendMessage,
  }
}
