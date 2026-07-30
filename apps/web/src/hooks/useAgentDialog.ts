"use client"

import * as React from "react"
import type { FormEvent } from "react"
import { KipApi } from "../lib/kipApi"
import type { KipMessage } from "../lib/kipApi"
import type { AgentAttachment } from "../components/agent/AgentComposer"
import type { AgentDialogueMessage, DirectorDelegationBeat } from "../components/agent/types"
import { extractLinkedCard } from "../components/agent/helpers"
import { parseGlossThreads } from "@keeper/shared"
import { apiFetch } from "../lib/api"
import {
  buildInstrumentDelegationPrompt,
  buildInstrumentUnavailableDelegationBeat,
  extractAgentReplyFromRunResult,
  isDirectorDelegationFailureContent,
  resolveDirectorInstrument,
  resolveInstrumentParticipation,
  sanitizeUserMessageContent,
  sanitizeAgentMessageContent,
  type DirectorDialogConfig,
  type DirectorSendPhase,
} from "../v0/boards/directorDialog"
import { resolveDirectorDelegationMessage } from "@keeper/shared"
import { resumeBoardSession, resumeOrCreateBoardSession } from "../lib/kipDialogSession"
import { takePrefetchedDialogSession } from "../v0/boards/domain/dialogSessionPrefetch"
import {
  actionResultsToThinkingSteps,
  createThinkingStep,
  type DialogThinkingStep,
  type RunAgentActionInput,
} from "../v0/components/dialog/dialogThinking"
import { useComposerDraftAutosave } from "./useComposerDraftAutosave"
import { resolveLeadAgentId } from "../v0/lib/frameLeadAgentIdentity"

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

function normalizeCastVoiceBeat(
  value: unknown,
): (DirectorDelegationBeat & { slug?: string }) | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const content = typeof row.content === "string" ? row.content : ""
  const attributedTo =
    typeof row.attributedTo === "string"
      ? row.attributedTo
      : typeof row.label === "string"
        ? row.label
        : undefined
  const status =
    row.status === "ok" || row.status === "failed" || row.status === "empty"
      ? row.status
      : undefined
  const slug = typeof row.slug === "string" ? row.slug : undefined
  if (!content.trim() && status !== "failed" && status !== "empty") return null
  return {
    content,
    ...(attributedTo ? { attributedTo } : {}),
    ...(status ? { status } : {}),
    ...(slug ? { slug } : {}),
  }
}

function normalizeMessage(message: KipMessage): AgentDialogueMessage {
  const role = (message.sender || message.role) === "user" ? "user" : "agent"
  const meta = message.metadata as Record<string, unknown> | null | undefined
  const actionResults = Array.isArray(meta?.actionResults) ? meta.actionResults : undefined
  const linkedCard = extractLinkedCard(meta)
  const glossThreads = parseGlossThreads(meta?.glossThreads)
  const rawContent = typeof message.content === "string" ? message.content : ""
  const keeperCard =
    meta?.card && typeof meta.card === "object" && !Array.isArray(meta.card)
      ? (meta.card as AgentDialogueMessage["keeperCard"])
      : meta?.keeperCard && typeof meta.keeperCard === "object" && !Array.isArray(meta.keeperCard)
        ? (meta.keeperCard as AgentDialogueMessage["keeperCard"])
        : undefined
  const senderName =
    typeof meta?.senderName === "string"
      ? meta.senderName
      : typeof meta?.agentName === "string"
        ? meta.agentName
        : typeof meta?.agent_name === "string"
          ? meta.agent_name
          : typeof meta?.userName === "string"
            ? meta.userName
            : undefined
  const castVoices = Array.isArray(meta?.castVoices)
    ? meta.castVoices
        .map(normalizeCastVoiceBeat)
        .filter((beat): beat is DirectorDelegationBeat & { slug?: string } => Boolean(beat))
    : undefined
  const delegationBeat = normalizeCastVoiceBeat(meta?.delegation)
  const delegation: DirectorDelegationBeat | undefined = delegationBeat
    ? {
        content: delegationBeat.content,
        ...(delegationBeat.attributedTo
          ? { attributedTo: delegationBeat.attributedTo }
          : {}),
        ...(delegationBeat.status ? { status: delegationBeat.status } : {}),
      }
    : undefined
  // Agent Echo — same beat shape as delegation / castVoices rows; separate from Voice Cards.
  const echoBeat = normalizeCastVoiceBeat(meta?.echo)
  const echo: DirectorDelegationBeat | undefined = echoBeat
    ? {
        content: echoBeat.content,
        ...(echoBeat.attributedTo ? { attributedTo: echoBeat.attributedTo } : {}),
        ...(echoBeat.status ? { status: echoBeat.status } : {}),
      }
    : undefined
  return {
    id: message.id,
    role,
    content: role === "user" ? sanitizeUserMessageContent(rawContent) : sanitizeAgentMessageContent(rawContent),
    createdAt: new Date(message.created_at || Date.now()).toISOString(),
    ...(senderName?.trim() ? { senderName: senderName.trim() } : {}),
    ...(linkedCard ? { linkedCard } : {}),
    ...(keeperCard ? { keeperCard } : {}),
    ...(actionResults?.length ? { actionResults } : {}),
    ...(glossThreads.length ? { glossThreads } : {}),
    ...(castVoices?.length ? { castVoices } : {}),
    ...(delegation && !castVoices?.length ? { delegation } : {}),
    ...(echo ? { echo } : {}),
  }
}

function patchLastUserContent(
  list: AgentDialogueMessage[],
  userContent: string,
): AgentDialogueMessage[] {
  if (!userContent.trim()) return list
  const updated = [...list]
  const lastUserIdx = updated.findLastIndex((m) => m.role === "user")
  if (lastUserIdx < 0) return list
  updated[lastUserIdx] = { ...updated[lastUserIdx], content: userContent }
  return updated
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
  activeDraftId?: string | null
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
  /** IDE director mode: run pinned instrument before Lead synthesis turn. */
  directorConfig?: DirectorDialogConfig
  /** IDE director mode: Horizon label phases while sending (instrument → Lead). */
  onDirectorPhaseChange?: (phase: DirectorSendPhase | null) => void
  /** Auth user id — forwarded to runAgent for instrument delegation. */
  userId?: string | null
  /** Display name for the current user — stamped on outgoing user messages. */
  userDisplayName?: string
  /** When true, missing agent slug throws instead of silently substituting Kip. */
  strictAgentResolution?: boolean
  /** Active Dialog — forwarded so instrument sub-runs load Document context without a session. */
  dialogId?: string | null
}

export type { DirectorDialogConfig, DirectorSendPhase }

export interface UseAgentDialogResult {
  messages: AgentDialogueMessage[]
  setMessages: React.Dispatch<React.SetStateAction<AgentDialogueMessage[]>>
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  isSending: boolean
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  /** Chain-of-thought steps for Thinking Space while sending. */
  thinkingSteps: DialogThinkingStep[]
  /** Resolved agent ID from slug lookup or `resolvedAgentId`. */
  agentId: string | null
  activeSessionId: string | null
  fetchMessages: (sessionId: string) => Promise<KipMessage[] | undefined>
  sendMessage: (
    e: FormEvent,
    payload: { content: string; displayContent?: string; attachments?: AgentAttachment[] },
  ) => Promise<void>
}

export function extractRunAgentPayload(result: unknown): {
  actions?: unknown[]
  sessionId?: string
  directorDelegation?: DirectorDelegationBeat
} {
  const outer = (result as { data?: Record<string, unknown> })?.data
  const inner =
    outer?.data && typeof outer.data === "object"
      ? (outer.data as Record<string, unknown>)
      : undefined
  const actions = inner?.actions ?? outer?.actions
  const sessionRaw = inner?.session_id ?? inner?.sessionId ?? outer?.session_id
  const delegationRaw = inner?.directorDelegation ?? outer?.directorDelegation
  let directorDelegation: DirectorDelegationBeat | undefined
  if (delegationRaw && typeof delegationRaw === "object") {
    const d = delegationRaw as Record<string, unknown>
    const rawStatus = d.status
    const status =
      rawStatus === "ok" || rawStatus === "failed" || rawStatus === "empty"
        ? rawStatus
        : undefined
    const content = typeof d.content === "string" ? d.content.trim() : ""
    const attributedTo = typeof d.attributedTo === "string" ? d.attributedTo : undefined

    if (status === "failed" || status === "empty") {
      directorDelegation = {
        content:
          content ||
          `${attributedTo ?? "Agent"} couldn't respond this turn. Kip answered using platform knowledge instead.`,
        attributedTo,
        status,
      }
    } else if (content && !isDirectorDelegationFailureContent(content)) {
      directorDelegation = { content, attributedTo, status: status ?? "ok" }
    }
  }
  return {
    actions: Array.isArray(actions) ? actions : undefined,
    sessionId: typeof sessionRaw === "string" && sessionRaw.trim() ? sessionRaw.trim() : undefined,
    directorDelegation,
  }
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
  activeDraftId = null,
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
  directorConfig,
  onDirectorPhaseChange,
  userId,
  userDisplayName,
  strictAgentResolution = false,
  dialogId = null,
}: UseAgentDialogOptions): UseAgentDialogResult {
  const [internalSessionId, setInternalSessionId] = React.useState<string | null>(null)
  const isSessionControlled = onControlledSessionIdChange != null
  // When Universal Board drives session via context, do not fall back to stale internal ids.
  const activeSessionId = isSessionControlled
    ? (controlledSessionId ?? null)
    : (controlledSessionId ?? internalSessionId)

  // Stable greeting computed from params — only changes when slug/message change.
  const greeting = React.useMemo<AgentDialogueMessage>(
    () => ({
      id: `${agentSlug}-greeting`,
      role: "agent",
      content: greetingMessage ?? "I'm here. What are we building?",
      createdAt: new Date().toISOString(),
      ...(agentDisplayName.trim() ? { senderName: agentDisplayName.trim() } : {}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentSlug, greetingMessage, agentDisplayName],
  )

  const stampSenderName = React.useCallback(
    (message: AgentDialogueMessage): AgentDialogueMessage => {
      if (message.senderName?.trim()) return message
      if (message.role === "user") {
        const name = userDisplayName?.trim()
        return name ? { ...message, senderName: name } : message
      }
      const name = agentDisplayName?.trim()
      return name ? { ...message, senderName: name } : message
    },
    [agentDisplayName, userDisplayName],
  )

  const [messages, setMessages] = React.useState<AgentDialogueMessage[]>(() =>
    mode === "ide" ? [greeting] : [],
  )
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [thinkingSteps, setThinkingSteps] = React.useState<DialogThinkingStep[]>([])
  const [agentId, setAgentId] = React.useState<string | null>(null)

  const activeSessionIdRef = React.useRef<string | null>(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  const boardSessionKey = dialogBoard ?? mode
  const prevBoardSessionKeyRef = React.useRef(boardSessionKey)
  React.useEffect(() => {
    if (prevBoardSessionKeyRef.current === boardSessionKey) return
    prevBoardSessionKeyRef.current = boardSessionKey
    setInternalSessionId(null)
    setMessages(boardSessionKey === "ide" ? [greeting] : [])
  }, [boardSessionKey, greeting])

  // Always-current snapshot of messages — lets sendMessage build conversation
  // history without adding `messages` to its dep array.
  const messagesRef = React.useRef<AgentDialogueMessage[]>(messages)
  messagesRef.current = messages

  const directorConfigRef = React.useRef(directorConfig)
  directorConfigRef.current = directorConfig
  const dialogIdRef = React.useRef(dialogId)
  dialogIdRef.current = dialogId

  const composerDraftScope = React.useMemo(
    () =>
      domainSlug
        ? {
            domainSlug,
            board: dialogBoard ?? mode,
            agentId: agentId ?? resolvedAgentId ?? agentSlug,
            sessionId: activeSessionId,
          }
        : null,
    [
      domainSlug,
      dialogBoard,
      mode,
      agentId,
      resolvedAgentId,
      agentSlug,
      activeSessionId,
    ],
  )

  const { clearSavedDraft, restoreSavedDraft, armSendDraft } = useComposerDraftAutosave({
    scope: composerDraftScope,
    input,
    setInput,
    isSending,
  })

  const fetchMessages = React.useCallback(
    async (sessionId: string) => {
      try {
        const msgs: KipMessage[] = await KipApi.getSessionMessages(sessionId)
        const normalized = msgs.map(normalizeMessage).map(stampSenderName)
        if (mode === "ide" || mode === "designer") {
          setMessages(normalized.length ? normalized : [greeting])
        } else {
          setMessages(normalized)
        }
        return msgs
      } catch {
        return undefined
      }
    },
    [mode, greeting, stampSenderName],
  )

  // Resolve agent ID from slug, or use an explicit id (non-Lead agents on Agent Board).
  React.useEffect(() => {
    if (resolvedAgentId) {
      setAgentId(resolvedAgentId)
      return
    }
    setAgentId(null)
    let cancelled = false
    resolveLeadAgentId(agentSlug, {
      allowKipFallback: strictAgentResolution ? false : undefined,
    })
      .then((id) => {
        if (!cancelled) {
          setAgentId(id)
          if (strictAgentResolution) setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgentId(null)
          if (strictAgentResolution) {
            setError(
              `${agentDisplayName} is not available in this environment. The "${agentSlug}" agent may need to be seeded on the server.`,
            )
          }
        }
      })
    return () => {
      cancelled = true
    }
  }, [agentSlug, resolvedAgentId, strictAgentResolution, agentDisplayName])

  // Seed prefetched session before paint so Chronicle/Dialog do not flash empty after curtain.
  React.useLayoutEffect(() => {
    if (mode === "ide" || mode === "designer" || manageSessionExternally) return
    if (!domainId || String(domainId).startsWith("fallback-")) return
    if (activeSessionIdRef.current) return
    const board = dialogBoard ?? mode
    const prefetched = takePrefetchedDialogSession(domainId, board)
    if (!prefetched) return
    if (onControlledSessionIdChange) onControlledSessionIdChange(prefetched)
    else setInternalSessionId(prefetched)
  }, [mode, domainId, dialogBoard, manageSessionExternally, onControlledSessionIdChange])

  // agent / domain: resume existing board session only — create deferred to first send.
  // ide and designer use controlled session lifecycle from the board shell.
  // domain: wait for a resolved domainId — shell fetch completes before session bootstrap.
  // Dead path removed (was useAgentDialog IDE bootstrap ~553-620): only callers are
  // UniversalConversation (manageSessionExternally=true for ide) and KipScreen (mode=domain).
  React.useEffect(() => {
    if (mode === "ide" || mode === "designer" || manageSessionExternally || !agentId) return
    if (
      (mode === "domain" || mode === "agent") &&
      (!domainId || String(domainId).startsWith("fallback-"))
    ) {
      return
    }
    if (activeSessionIdRef.current) return
    const aid = agentId
    let cancelled = false
    async function init() {
      try {
        if (!domainId) return
        const board = dialogBoard ?? mode
        const prefetched = takePrefetchedDialogSession(domainId, board)
        if (prefetched) {
          if (onControlledSessionIdChange) {
            if (!activeSessionIdRef.current) onControlledSessionIdChange(prefetched)
          } else {
            setInternalSessionId(prefetched)
          }
          return
        }
        const sessionId = await resumeBoardSession({
          domainId,
          agentId: aid,
          board,
          frame: dialogFrame ?? "conversation",
          dialogScope: resolvedAudience === "admin" ? "admin" : "keeper",
        })
        if (cancelled || !sessionId) return
        if (onControlledSessionIdChange) {
          if (!activeSessionIdRef.current) onControlledSessionIdChange(sessionId)
        } else {
          setInternalSessionId(sessionId)
        }
      } catch {
        /* idle until first send */
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [
    mode,
    agentId,
    manageSessionExternally,
    domainSlug,
    domainId,
    resolvedAudience,
    dialogBoard,
    dialogFrame,
    onControlledSessionIdChange,
  ])

  React.useEffect(() => {
    if (!activeSessionId) return

    // Domain board: defer session history so nav/frame work can paint first.
    if (mode === "domain") {
      let cancelled = false
      const run = () => {
        if (!cancelled) void fetchMessages(activeSessionId)
      }
      if (typeof requestIdleCallback !== "undefined") {
        const idleId = requestIdleCallback(run, { timeout: 1500 })
        return () => {
          cancelled = true
          cancelIdleCallback(idleId)
        }
      }
      const timeoutId = window.setTimeout(run, 150)
      return () => {
        cancelled = true
        window.clearTimeout(timeoutId)
      }
    }

    void fetchMessages(activeSessionId)
    return undefined
  }, [activeSessionId, fetchMessages, mode])

  const sendMessage = React.useCallback(
    async (
      _e: FormEvent,
      { content, displayContent, attachments }: {
        content: string
        displayContent?: string
        attachments?: AgentAttachment[]
      },
    ) => {
      if (mode === "designer" && !frameKey) return

      // ── ide / agent / domain / designer: KipApi.runAgent ──────────────────
      if ((!content.trim() && !attachments?.length) || isSending || !agentId) {
        return
      }

      const resolvedDomainId =
        domainId && !String(domainId).startsWith("fallback-")
          ? domainId
          : frameCtx?.domain?.id && !String(frameCtx.domain.id).startsWith("fallback-")
            ? frameCtx.domain.id
            : undefined

      let sessionId = activeSessionIdRef.current
      if (!sessionId) {
        if (!resolvedDomainId) return
        try {
          let name: string
          if (typeof sessionDisplayName === "function") {
            name = await sessionDisplayName()
          } else if (sessionDisplayName) {
            name = sessionDisplayName
          } else if (mode === "ide") {
            name = await buildIdeSessionName({
              domainId: resolvedDomainId,
              activeJourneyId: activeJourneyId ?? frameCtx?.selection?.activeJourneyId ?? null,
              activeKeeperId: frameCtx?.selection?.activeKeeperId ?? null,
            })
          } else if (mode === "agent") {
            name = "Agent Board"
          } else if (mode === "designer") {
            name = frameKey ?? "Designer"
          } else {
            name = sessionNameDateFallback()
          }
          const ensured = await resumeOrCreateBoardSession({
            domainId: resolvedDomainId,
            agentId,
            board: dialogBoard ?? mode,
            frame: dialogFrame ?? frameKey ?? "conversation",
            subject: dialogSubject ?? (mode === "designer" ? "boardDef" : "domain"),
            dialogScope: resolvedAudience === "admin" || mode === "designer" ? "admin" : "keeper",
            domainSlug,
            sessionName: name,
          })
          sessionId = ensured.sessionId
          if (onControlledSessionIdChange) {
            onControlledSessionIdChange(sessionId)
          } else {
            setInternalSessionId(sessionId)
          }
          activeSessionIdRef.current = sessionId
        } catch {
          setError(`Couldn't start a session with ${agentDisplayName}. Try again.`)
          return
        }
      }

      if (!sessionId) return

      const ts = Date.now()

      const transcriptContent = displayContent?.trim() || content || "[attachment]"

      if (mode !== "ide") {
        setMessages((prev) => [
          ...prev,
          stampSenderName({
            id: `user-${ts}`,
            role: "user",
            content: transcriptContent,
            createdAt: new Date(ts).toISOString(),
          }),
        ])
      } else {
        const optimistic = stampSenderName({
          id: `user-${ts}`,
          role: "user",
          content: transcriptContent,
          createdAt: new Date().toISOString(),
        })
        setMessages((prev) => [...prev, optimistic])
      }

      setInput("")
      // Clear sessionStorage immediately so a mid-send session-key change cannot
      // re-fill the composer (blocks mobile compact-after-send). Hold text for failure restore.
      armSendDraft(content)
      setIsSending(true)
      if (mode === "ide") setError(null)

      let stepIndex = 0
      const appendThinkingStep = (label: string) => {
        setThinkingSteps((prev) => [...prev, createThinkingStep(label, stepIndex++)])
      }

      setThinkingSteps([])
      appendThinkingStep("Received your message")
      if (displayContent && displayContent.trim() !== content.trim()) {
        appendThinkingStep("Including pasted supporting context…")
      }
      if (attachments?.length) {
        appendThinkingStep(
          attachments.length === 1
            ? "Including 1 attached file in your message…"
            : `Including ${attachments.length} attached files in your message…`,
        )
      }

      const activeDialogId = dialogIdRef.current ?? undefined
      const runOpts = {
        domainSlug: domainSlug || undefined,
        domainId: resolvedDomainId || domainId || undefined,
        dialogId: activeDialogId,
        mode: (agentRunMode ?? (mode === "designer" ? "domain" : "domain")) as "domain",
        activeJourneyId: activeJourneyId ?? frameCtx?.selection?.activeJourneyId ?? undefined,
        activeKeeperId: frameCtx?.selection?.activeKeeperId ?? undefined,
        activeDraftId: activeDraftId ?? undefined,
        agentContext: mode === "designer" && frameKey
          ? { ...(agentContext ?? {}), designerFrameKey: frameKey }
          : agentContext,
        attachments: attachments?.length ? attachments : undefined,
      }

      const liveDirectorConfig = directorConfigRef.current
      const consultSlugs = Array.from(
        new Set(
          (liveDirectorConfig?.consultInstruments ?? [])
            .map((slug) => slug.trim().toLowerCase())
            .filter(Boolean),
        ),
      )
      const instrument = liveDirectorConfig
        ? resolveDirectorInstrument({
            pinned: liveDirectorConfig.activeInstrument,
            userMessage: content,
            knownSlugs: Object.keys(liveDirectorConfig.instrumentLabels),
          })
        : null

      const instrumentLabel =
        liveDirectorConfig && instrument
          ? liveDirectorConfig.instrumentLabels[instrument] ?? instrument
          : null

      let directorTaskMessage: string | undefined
      let clientInstrumentReply: string | null = null
      let castConsultations:
        | {
            userMessage: string
            directorDisplayName: string
            consultations: Array<{
              instrumentSlug: string
              instrumentReply?: string | null
              status: "ok" | "empty" | "failed" | "error"
            }>
          }
        | undefined
      let skipLeadRunForParticipation = false

      if (liveDirectorConfig && consultSlugs.length > 0 && content.trim()) {
        onDirectorPhaseChange?.("instrument")
        console.info("[AgentTurn]", {
          mechanism: "cast_consultation_a",
          phase: "instrument",
          consultSlugs,
          sessionId,
          dialogId: activeDialogId ?? null,
          agentDisplayName,
        })
        const consultations: Array<{
          instrumentSlug: string
          instrumentReply?: string | null
          status: "ok" | "empty" | "failed" | "error"
        }> = []
        for (const slug of consultSlugs) {
          const label = liveDirectorConfig.instrumentLabels[slug] ?? slug
          const participation = resolveInstrumentParticipation(liveDirectorConfig, slug)
          if (participation === "silent") {
            appendThinkingStep(`${label} is silent — skipped.`)
            consultations.push({
              instrumentSlug: slug,
              instrumentReply: null,
              status: "empty",
            })
            continue
          }
          if (participation === "support_only") {
            appendThinkingStep(`${label} is support-only — not consulted as a Dialog voice.`)
            consultations.push({
              instrumentSlug: slug,
              instrumentReply: null,
              status: "empty",
            })
            continue
          }
          appendThinkingStep(`Consulting ${label}…`)
          try {
            const instAgent = await KipApi.getAgentBySlug(slug)
            const instPrompt = buildInstrumentDelegationPrompt({
              userMessage: content,
              instrumentLabel: label,
              directorName: liveDirectorConfig.directorDisplayName,
            })
            const instResult = await KipApi.runAgent(
              instAgent.id,
              instPrompt,
              userId ?? undefined,
              undefined,
              runOpts,
            )
            const reply = extractAgentReplyFromRunResult(instResult)
            if (reply) {
              consultations.push({ instrumentSlug: slug, instrumentReply: reply, status: "ok" })
            } else {
              appendThinkingStep(`${label} returned nothing.`)
              consultations.push({ instrumentSlug: slug, instrumentReply: null, status: "empty" })
            }
          } catch (instErr: unknown) {
            const instMsg = instErr instanceof Error ? instErr.message : "instrument failed"
            const isNetworkFail =
              /failed to fetch|could not reach the keeper api|network_unreachable|network request failed/i.test(
                instMsg,
              )
            console.warn("[director] cast consult failed", { slug, instMsg })
            appendThinkingStep(
              isNetworkFail
                ? `${label} — couldn't reach (network).`
                : `${label} — nothing back.`,
            )
            consultations.push({ instrumentSlug: slug, instrumentReply: null, status: "failed" })
          }
        }
        castConsultations = {
          userMessage: content,
          directorDisplayName: liveDirectorConfig.directorDisplayName,
          consultations,
        }
      } else if (liveDirectorConfig && instrument && content.trim()) {
        const participation = resolveInstrumentParticipation(liveDirectorConfig, instrument)
        if (participation === "support_only" || participation === "silent") {
          const statusLabel = participation === "silent" ? "silent" : "support-only"
          appendThinkingStep(
            `${instrumentLabel} is ${statusLabel} — not a Dialog voice.`,
          )
          const honest =
            participation === "silent"
              ? `${instrumentLabel} is marked silent — they are not consulted and do not hold a Dialog voice.`
              : `${instrumentLabel} is support-only — not a Dialog voice. They don't take first-person Dialog turns. Ask ${liveDirectorConfig.directorDisplayName} (Lead), or use ${instrumentLabel} for platform/support work — not as a cast Dialog speaker.`
          setMessages((prev) => [
            ...prev,
            stampSenderName({
              id: `agent-participation-${Date.now()}`,
              role: "agent",
              content: honest,
              createdAt: new Date().toISOString(),
            }),
          ])
          skipLeadRunForParticipation = true
          console.info("[AgentTurn]", {
            mechanism: "participation_decline",
            phase: "director",
            addressedInstrument: instrument,
            participation,
            sessionId,
            dialogId: activeDialogId ?? null,
          })
        } else {
          const resolved = resolveDirectorDelegationMessage({
            userMessage: content,
            priorMessages: messagesRef.current.map((message) => ({
              role: message.role,
              content: sanitizeUserMessageContent(message.content),
            })),
          })
          if (resolved.resolvedFromPrior) {
            directorTaskMessage = resolved.delegationMessage
          }

          // Run the instrument in its own HTTP request first. Nested Rendr+Kip in one
          // proxy hop often exceeds Vercel's origin timeout and surfaces as HTTP 502.
          onDirectorPhaseChange?.("instrument")
          appendThinkingStep(`Consulting ${instrumentLabel}…`)
          try {
            const instAgent = await KipApi.getAgentBySlug(instrument)
            const instPrompt = buildInstrumentDelegationPrompt({
              userMessage: directorTaskMessage ?? content,
              instrumentLabel: instrumentLabel ?? instrument,
              directorName: liveDirectorConfig.directorDisplayName,
            })
            const instResult = await KipApi.runAgent(
              instAgent.id,
              instPrompt,
              userId ?? undefined,
              undefined,
              runOpts,
            )
            clientInstrumentReply = extractAgentReplyFromRunResult(instResult)
            if (!clientInstrumentReply) {
              appendThinkingStep(`${instrumentLabel} returned an empty reply — ${agentDisplayName} will answer directly…`)
            }
          } catch (instErr: unknown) {
            const instMsg = instErr instanceof Error ? instErr.message : "instrument failed"
            console.warn("[director] client instrument run failed", { instrument, instMsg })
            appendThinkingStep(`${instrumentLabel} couldn't respond — ${agentDisplayName} will answer directly…`)
          }
        }
      }

      if (skipLeadRunForParticipation) {
        clearSavedDraft()
        setThinkingSteps([])
        onDirectorPhaseChange?.(null)
        setIsSending(false)
        return
      }

      onDirectorPhaseChange?.("director")
      appendThinkingStep(`${agentDisplayName} is composing a reply…`)

      const kipRunOpts = {
        ...runOpts,
        ...(castConsultations
          ? { castConsultations }
          : liveDirectorConfig && instrument && content.trim()
            ? {
                directorDelegation: {
                  instrumentSlug: instrument,
                  userMessage: content,
                  taskMessage: directorTaskMessage,
                  directorDisplayName: liveDirectorConfig.directorDisplayName,
                  instrumentRanClientSide: true,
                  instrumentReply: clientInstrumentReply,
                },
              }
            : {}),
      }

      const clientMechanism = castConsultations
        ? "cast_consultation_a"
        : liveDirectorConfig && instrument && content.trim()
          ? "director_instrument"
          : "plain_lead"
      const consultRows = castConsultations?.consultations ?? []
      const consultOkCount = consultRows.filter((row) => row.status === "ok").length
      const consultFailedCount = consultRows.filter((row) => row.status === "failed").length
      const consultEmptyCount = consultRows.filter((row) => row.status === "empty").length
      console.info("[AgentTurn]", {
        mechanism: clientMechanism,
        phase: "director",
        sessionId,
        dialogId: activeDialogId ?? null,
        agentDisplayName,
        // Accurate counts — never report requested consults as if they succeeded.
        consultRequestedCount: consultRows.length,
        consultOkCount,
        consultFailedCount,
        consultEmptyCount,
        // Single-pin address only (IDE). Omit for multi-select Mechanism A.
        addressedInstrument:
          clientMechanism === "director_instrument" ? (instrument ?? null) : null,
        consultedSlugs:
          clientMechanism === "cast_consultation_a"
            ? consultRows.map((row) => row.instrumentSlug)
            : [],
      })

      // No successful voice replies + at least one hard failure → do not synthesize.
      // (support_only / silent rows are "empty" and must not inflate success counts.)
      if (
        clientMechanism === "cast_consultation_a"
        && consultRows.length > 0
        && consultOkCount === 0
        && consultFailedCount > 0
      ) {
        const honest =
          `Couldn't reach the cast this turn (${consultFailedCount} failed, ${consultOkCount} ok of ${consultRows.length} engaged). Nothing to synthesize. Try again in a moment.`
        setError(null)
        setMessages((prev) => [
          ...prev,
          stampSenderName({
            id: `agent-cast-unreachable-${Date.now()}`,
            role: "agent",
            content: honest,
            createdAt: new Date().toISOString(),
          }),
        ])
        clearSavedDraft()
        setThinkingSteps([])
        onDirectorPhaseChange?.(null)
        setIsSending(false)
        return
      }

      try {
        let result: Awaited<ReturnType<typeof KipApi.runAgent>>
        try {
          result = await KipApi.runAgent(
            agentId,
            content,
            userId ?? undefined,
            sessionId,
            kipRunOpts,
          )
        } catch (firstErr: unknown) {
          const status = (firstErr as { status?: number })?.status
          if (mode === "ide" && status === 401 && refreshSession) {
            const refreshed = await refreshSession()
            if (refreshed) {
              result = await KipApi.runAgent(
                agentId,
                content,
                userId ?? undefined,
                sessionId,
                kipRunOpts,
              )
            } else {
              setMessages((prev) => prev.filter((m) => m.id !== `user-${ts}`))
              setError(`Please sign in to continue the conversation with ${agentDisplayName}.`)
              restoreSavedDraft()
              return
            }
          } else {
            throw firstErr
          }
        }

        let latestRaw: KipMessage[] | undefined
        try {
          latestRaw = await KipApi.getSessionMessages(sessionId)
        } catch {
          latestRaw = await fetchMessages(sessionId)
        }

        const {
          actions: actionsArr,
          sessionId: returnedSessionId,
          directorDelegation: extractedDelegation,
        } = extractRunAgentPayload(result)

        let directorDelegation = extractedDelegation
        if (
          liveDirectorConfig &&
          instrument &&
          content.trim() &&
          !directorDelegation
        ) {
          directorDelegation = buildInstrumentUnavailableDelegationBeat({
            instrumentLabel:
              liveDirectorConfig.instrumentLabels[instrument] ?? instrument,
          })
        }

        if (liveDirectorConfig && instrument && content.trim()) {
          onDirectorPhaseChange?.("director")
        }

        // Equal voice cards for every engaged cast member (Mechanism A).
        // Prefer these over a single first-ok `delegation` beat so Rendr/Cloud
        // stand alone instead of nesting inside Kip's synthesis.
        const castVoices: Array<DirectorDelegationBeat & { slug: string }> | undefined =
          castConsultations?.consultations.length
            ? castConsultations.consultations.map((row) => {
                const label =
                  liveDirectorConfig?.instrumentLabels[row.instrumentSlug]
                  ?? row.instrumentSlug
                const reply = row.instrumentReply?.trim() ?? ""
                if (row.status === "ok" && reply) {
                  return {
                    slug: row.instrumentSlug,
                    attributedTo: label,
                    content: reply,
                    status: "ok" as const,
                  }
                }
                if (row.status === "failed") {
                  return {
                    slug: row.instrumentSlug,
                    attributedTo: label,
                    content: `${label} couldn't respond this turn.`,
                    status: "failed" as const,
                  }
                }
                return {
                  slug: row.instrumentSlug,
                  attributedTo: label,
                  content: reply || `${label} returned nothing this turn.`,
                  status: "empty" as const,
                }
              })
            : undefined

        const mergeOntoLastAgent = (list: AgentDialogueMessage[]): AgentDialogueMessage[] => {
          const withUser = patchLastUserContent(list, transcriptContent)
          if (!directorDelegation && !actionsArr?.length && !castVoices?.length) return withUser
          const updated = [...withUser]
          const lastAgentIdx = updated.findLastIndex((m) => m.role === "agent")
          if (lastAgentIdx < 0) return withUser
          updated[lastAgentIdx] = {
            ...updated[lastAgentIdx],
            // Multi-voice turns own the instrument beats; skip single-delegation duplicate.
            ...(castVoices?.length
              ? { castVoices }
              : directorDelegation
                ? { delegation: directorDelegation }
                : {}),
            ...(actionsArr?.length ? { actionResults: actionsArr as RunAgentActionInput[] } : {}),
          }
          return updated
        }

        if (latestRaw?.length || mode === "ide") {
          const normalized = (latestRaw?.length
            ? latestRaw.map(normalizeMessage)
            : mode === "ide"
              ? [greeting]
              : []
          ).map(stampSenderName)
          setMessages(mergeOntoLastAgent(normalized))
        } else {
          const replyText = extractAgentReplyFromRunResult(result)
          if (replyText) {
            setMessages((prev) => {
              const hasUser = prev.some((m) => m.id === `user-${ts}`)
              const base = hasUser
                ? prev
                : [
                    ...prev,
                    stampSenderName({
                      id: `user-${ts}`,
                      role: "user" as const,
                      content: transcriptContent,
                      createdAt: new Date(ts).toISOString(),
                    }),
                  ]
              return mergeOntoLastAgent([
                ...base,
                stampSenderName({
                  id: `${agentSlug}-reply-${ts}`,
                  role: "agent" as const,
                  content: replyText,
                  createdAt: new Date().toISOString(),
                }),
              ])
            })
          }
        }

        if (
          returnedSessionId &&
          !returnedSessionId.startsWith("system_") &&
          !activeSessionIdRef.current
        ) {
          if (onControlledSessionIdChange) {
            onControlledSessionIdChange(returnedSessionId)
          } else {
            setInternalSessionId(returnedSessionId)
          }
        }

        if (actionsArr?.length) {
          const typedActions = actionsArr as RunAgentActionInput[]
          const actionSteps = actionResultsToThinkingSteps(typedActions, stepIndex)
          stepIndex += actionSteps.length
          setThinkingSteps((prev) => [...prev, ...actionSteps])
        }
        appendThinkingStep("Run complete")

        if (onAfterAgentRun) {
          onAfterAgentRun(latestRaw, actionsArr, result)
        }

        await onRefreshDraftsAfterRun?.(result)
        clearSavedDraft()
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status
        const message = err instanceof Error ? err.message : ""
        const authMsg = `Please sign in to continue the conversation with ${agentDisplayName}.`
        const failMsg =
          message && message.length > 0 && message.length < 300
            ? message
            : `${agentDisplayName} couldn't respond. Try again.`
        const reply = status === 401 ? authMsg : failMsg

        appendThinkingStep(`Run failed — ${reply}`)
        restoreSavedDraft()

        if (mode === "ide") {
          setMessages((prev) => prev.filter((m) => m.id !== `user-${ts}`))
          setError(reply)
        } else {
          setMessages((prev) => [
            ...prev,
            stampSenderName({
              id: `agent-error-${ts}`,
              role: "agent" as const,
              content: reply,
              createdAt: new Date().toISOString(),
            }),
          ])
        }
      } finally {
        onDirectorPhaseChange?.(null)
        setIsSending(false)
      }
    },
    [
      mode,
      isSending,
      agentId,
      agentSlug,
      agentDisplayName,
      domainSlug,
      domainId,
      activeJourneyId,
      agentRunMode,
      agentContext,
      frameCtx?.domain?.id,
      frameCtx?.selection?.activeJourneyId,
      frameCtx?.selection?.activeKeeperId,
      fetchMessages,
      refreshSession,
      onAfterAgentRun,
      onRefreshDraftsAfterRun,
      frameKey,
      dialogBoard,
      dialogFrame,
      dialogSubject,
      sessionDisplayName,
      resolvedAudience,
      onControlledSessionIdChange,
      onDirectorPhaseChange,
      userId,
      userDisplayName,
      stampSenderName,
      greeting,
      clearSavedDraft,
      restoreSavedDraft,
      armSendDraft,
      dialogId,
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
    thinkingSteps,
    agentId,
    activeSessionId,
    fetchMessages,
    sendMessage,
  }
}
