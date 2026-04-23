"use client"

import * as React from "react"
import type { FormEvent } from "react"
import { KipApi } from "../lib/kipApi"
import type { KipMessage } from "../lib/kipApi"
import type { AgentAttachment } from "../components/agent/AgentComposer"
import type { AgentDialogueMessage } from "../components/agent/types"
import { extractLinkedCard } from "../components/agent/helpers"
import { apiFetch } from "../lib/api"

/** Mirrors `KipApi.runAgent` `options.experienceContext` (no separate exported type in codebase) */
export type ExperienceContext = NonNullable<Parameters<typeof KipApi.runAgent>[4]>["experienceContext"]

export type IdeFrameContextLike =
  | {
      isResolving?: boolean
      domain?: { id?: string } | null
      selection?: { activeJourneyId?: string | null; activeKeeperId?: string | null }
    }
  | null
  | undefined

const GREETING: AgentDialogueMessage = {
  id: "kip-greeting",
  role: "agent",
  content: "I'm here. What are we building?",
  createdAt: new Date().toISOString(),
}

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

export interface UseKipSessionOptions {
  mode: "ide" | "agent"
  domainSlug: string
  domainId?: string | null
  activeJourneyId?: string | null
  experienceContext?: ExperienceContext
  resolvedAudience?: string | null
  refreshSession?: () => Promise<boolean>
  frameCtx?: IdeFrameContextLike
  /** IDE: session id owned by parent board */
  controlledSessionId?: string | null
  onControlledSessionIdChange?: (id: string | null) => void
  /** IDE: after runAgent success — e.g. context sync + action receipts on last agent message */
  onAfterAgentRun?: (
    latestRaw: KipMessage[] | undefined,
    actionResults: unknown[] | undefined,
    result: unknown,
  ) => void
  /** Agent: e.g. refresh draft list */
  onRefreshDraftsAfterRun?: (result: unknown) => Promise<void>
}

export interface UseKipSessionResult {
  messages: AgentDialogueMessage[]
  setMessages: React.Dispatch<React.SetStateAction<AgentDialogueMessage[]>>
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  isSending: boolean
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  kipAgentId: string | null
  activeSessionId: string | null
  fetchMessages: (sessionId: string) => Promise<KipMessage[] | undefined>
  sendMessage: (
    e: FormEvent,
    payload: { content: string; attachments?: AgentAttachment[] },
  ) => Promise<void>
}

export function useKipSession({
  mode,
  domainSlug,
  domainId,
  activeJourneyId = null,
  experienceContext,
  resolvedAudience = "keeper",
  refreshSession,
  frameCtx,
  controlledSessionId,
  onControlledSessionIdChange,
  onAfterAgentRun,
  onRefreshDraftsAfterRun,
}: UseKipSessionOptions): UseKipSessionResult {
  const [internalSessionId, setInternalSessionId] = React.useState<string | null>(null)
  const activeSessionId =
    mode === "ide" ? (controlledSessionId ?? null) : internalSessionId

  const [messages, setMessages] = React.useState<AgentDialogueMessage[]>(() =>
    mode === "ide" ? [GREETING] : [],
  )
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [kipAgentId, setKipAgentId] = React.useState<string | null>(null)

  const ideSessionInitDoneRef = React.useRef(false)
  const activeSessionIdRef = React.useRef<string | null>(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  const fetchMessages = React.useCallback(
    async (sessionId: string) => {
      try {
        const msgs: KipMessage[] = await KipApi.getSessionMessages(sessionId)
        if (mode === "ide") {
          setMessages(msgs.length ? msgs.map(normalizeMessage) : [GREETING])
        } else {
          setMessages(msgs.map(normalizeMessage))
        }
        return msgs
      } catch {
        return undefined
      }
    },
    [mode],
  )

  React.useEffect(() => {
    let cancelled = false
    KipApi.getLeadAgent("kip")
      .then((agent) => {
        if (!cancelled) setKipAgentId(agent.id)
      })
      .catch(() => {
        if (!cancelled) setKipAgentId(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Agent: create session once kip id is known
  React.useEffect(() => {
    if (mode !== "agent" || !kipAgentId) return
    const agentId = kipAgentId
    let cancelled = false
    async function init() {
      try {
        const session = await KipApi.createSession(agentId, undefined, "Agent Board", {
          domainSlug,
          ...(domainId ? { domainId } : {}),
          dialogBoard: "agent",
          dialogFrame: "conversation",
          dialogSubject: "domain",
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
  }, [mode, kipAgentId, domainSlug, domainId, resolvedAudience])

  // IDE: controlled session bootstrap
  React.useEffect(() => {
    if (mode !== "ide") return
    if (ideSessionInitDoneRef.current) return
    if (activeSessionId) {
      ideSessionInitDoneRef.current = true
      return
    }
    if (!kipAgentId) return
    const kipId = kipAgentId
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
        const session = await KipApi.createSession(kipId, undefined, sessionName, {
          domainSlug,
          ...(resolvedDomainId ? { domainId: resolvedDomainId } : {}),
          dialogBoard: "ide",
          dialogFrame: "conversation",
          dialogSubject: "domain",
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
    kipAgentId,
    activeSessionId,
    domainSlug,
    domainId,
    resolvedAudience,
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
      if ((!content.trim() && !attachments?.length) || isSending || !kipAgentId || !activeSessionId) {
        return
      }

      const ts = Date.now()
      const thinkingId = `kip-thinking-${ts}`

      if (mode === "agent") {
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
            content: "Kip is thinking\u2026",
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
        mode: "domain" as const,
        activeJourneyId: activeJourneyId ?? frameCtx?.selection?.activeJourneyId ?? undefined,
        activeKeeperId: frameCtx?.selection?.activeKeeperId ?? undefined,
        experienceContext,
        attachments: attachments?.length ? attachments : undefined,
      }

      try {
        let result: Awaited<ReturnType<typeof KipApi.runAgent>>
        try {
          result = await KipApi.runAgent(kipAgentId, content, undefined, activeSessionId, runOpts)
        } catch (firstErr: unknown) {
          const status = (firstErr as { status?: number })?.status
          if (mode === "ide" && status === 401 && refreshSession) {
            const refreshed = await refreshSession()
            if (refreshed) {
              result = await KipApi.runAgent(kipAgentId, content, undefined, activeSessionId, runOpts)
            } else {
              setMessages((prev) => prev.filter((m) => m.id !== `user-${ts}`))
              setError("Please sign in to continue the conversation with Kip.")
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
        if (mode === "ide") {
          setMessages((prev) => prev.filter((m) => m.id !== `user-${ts}`))
          const status = (err as { status?: number })?.status
          const message = err instanceof Error ? err.message : ""
          setError(
            status === 401
              ? "Please sign in to continue the conversation with Kip."
              : message && message.length > 0 && message.length < 300
                ? message
                : "Kip couldn't respond. Try again.",
          )
        } else {
          const status = (err as { status?: number })?.status
          const message = err instanceof Error ? err.message : ""
          const reply =
            status === 401
              ? "Please sign in to continue the conversation with Kip."
              : message && message.length > 0 && message.length < 300
                ? message
                : "Kip couldn't respond. Try again."
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
      kipAgentId,
      activeSessionId,
      domainSlug,
      domainId,
      activeJourneyId,
      experienceContext,
      frameCtx?.selection?.activeJourneyId,
      frameCtx?.selection?.activeKeeperId,
      fetchMessages,
      refreshSession,
      onAfterAgentRun,
      onRefreshDraftsAfterRun,
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
    kipAgentId,
    activeSessionId,
    fetchMessages,
    sendMessage,
  }
}
