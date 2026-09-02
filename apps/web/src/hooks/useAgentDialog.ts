"use client"

import * as React from "react"
import type { FormEvent } from "react"
import { KipApi, KipAgentRunError, formatKipRunErrorMessage } from "../lib/kipApi"
import type { KipMessage } from "../lib/kipApi"
import type { AgentAttachment } from "../components/agent/AgentComposer"
import type { AgentDialogueMessage, DirectorDelegationBeat } from "../components/agent/types"
import { extractLinkedCard } from "../components/agent/helpers"
import {
  detectReorganizeIntent,
  extractKeeperAdviceCardFromRunResult,
  parseGlossThreads,
  parseKeeperAdviceCard,
  withoutAdviseOnlySkips,
} from "@keeper/shared"
import { apiFetch } from "../lib/api"
import {
  annotateCastActionResults,
  buildCastDelegationPrompt,
  buildInstrumentUnavailableDelegationBeat,
  extractActionResultsFromRunResult,
  extractAgentReplyFromRunResult,
  isDirectorDelegationFailureContent,
  mergeCastAndLeadActionResults,
  resolveDirectorCastMember,
  resolveCastParticipation,
  sanitizeUserMessageContent,
  sanitizeAgentMessageContent,
  type DirectorDialogConfig,
  type DirectorSendPhase,
} from "../v0/boards/directorDialog"
import { resolveDirectorDelegationMessage } from "@keeper/shared"
import {
  resumeBoardSession,
  resumeOrCreateBoardSession,
  resumeOrCreateNamedDialogSession,
} from "../lib/kipDialogSession"
import { takePrefetchedDialogSession } from "../v0/boards/domain/dialogSessionPrefetch"
import {
  actionResultsToThinkingSteps,
  createThinkingStep,
  type DialogThinkingStep,
  type RunAgentActionInput,
} from "../v0/components/dialog/dialogThinking"
import { useComposerDraftAutosave } from "./useComposerDraftAutosave"
import { resolveLeadAgentId } from "../v0/lib/frameLeadAgentIdentity"
import type { KipSessionMode } from "../v0/boards/UniversalBoardDefinition"

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
  const card = parseKeeperAdviceCard(row.card)
  if (!content.trim() && !card && status !== "failed" && status !== "empty") return null
  return {
    content: content || (card?.title ?? ""),
    ...(attributedTo ? { attributedTo } : {}),
    ...(status ? { status } : {}),
    ...(slug ? { slug } : {}),
    ...(card ? { card } : {}),
  }
}

function normalizeMessageAttachments(
  meta: Record<string, unknown> | null | undefined,
): AgentDialogueMessage["attachments"] {
  if (!Array.isArray(meta?.attachments)) return undefined
  const rows = meta.attachments
    .map((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
      const row = raw as Record<string, unknown>
      const url = typeof row.url === "string" ? row.url.trim() : ""
      const name = typeof row.name === "string" ? row.name.trim() : ""
      const type = row.type === "image" || row.type === "file" ? row.type : null
      if (!url || !name || !type) return null
      return { url, name, type }
    })
    .filter((row): row is { url: string; name: string; type: "image" | "file" } => Boolean(row))
  return rows.length ? rows : undefined
}

function normalizeMessageSupportingDocs(
  meta: Record<string, unknown> | null | undefined,
): AgentDialogueMessage["supportingDocs"] {
  if (!Array.isArray(meta?.supportingDocs)) return undefined
  const rows = meta.supportingDocs
    .map((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
      const row = raw as Record<string, unknown>
      const name = typeof row.name === "string" ? row.name.trim() : ""
      if (!name) return null
      const preview = typeof row.preview === "string" ? row.preview.trim() : undefined
      return { name, ...(preview ? { preview } : {}) }
    })
    .filter((row): row is { name: string; preview?: string } => Boolean(row))
  return rows.length ? rows : undefined
}

function normalizeMessage(message: KipMessage): AgentDialogueMessage {
  const role = (message.sender || message.role) === "user" ? "user" : "agent"
  const meta = message.metadata as Record<string, unknown> | null | undefined
  const actionResults = Array.isArray(meta?.actionResults) ? meta.actionResults : undefined
  const linkedCard = extractLinkedCard(meta)
  const glossThreads = parseGlossThreads(meta?.glossThreads)
  const rawContent = typeof message.content === "string" ? message.content : ""
  const displayContent =
    typeof meta?.displayContent === "string" && meta.displayContent.trim()
      ? meta.displayContent.trim()
      : null
  const attachments = normalizeMessageAttachments(meta)
  const supportingDocs = normalizeMessageSupportingDocs(meta)
  const keeperCard =
    meta?.card && typeof meta.card === "object" && !Array.isArray(meta.card)
      ? (meta.card as AgentDialogueMessage["keeperCard"])
      : meta?.keeperCard && typeof meta.keeperCard === "object" && !Array.isArray(meta.keeperCard)
        ? (meta.keeperCard as AgentDialogueMessage["keeperCard"])
        : undefined
  const chronicleChip =
    meta?.chronicleChip && typeof meta.chronicleChip === "object" && !Array.isArray(meta.chronicleChip)
      ? (meta.chronicleChip as AgentDialogueMessage["chronicleChip"])
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
  const userFacing =
    role === "user"
      ? sanitizeUserMessageContent(displayContent ?? rawContent)
      : sanitizeAgentMessageContent(rawContent)
  return {
    id: message.id,
    role,
    content: userFacing,
    createdAt: new Date(message.created_at || Date.now()).toISOString(),
    ...(senderName?.trim() ? { senderName: senderName.trim() } : {}),
    ...(linkedCard ? { linkedCard } : {}),
    ...(keeperCard ? { keeperCard } : {}),
    ...(chronicleChip ? { chronicleChip } : {}),
    ...(actionResults?.length ? { actionResults } : {}),
    ...(glossThreads.length ? { glossThreads } : {}),
    ...(castVoices?.length ? { castVoices } : {}),
    ...(delegation && !castVoices?.length ? { delegation } : {}),
    ...(echo ? { echo } : {}),
    ...(attachments?.length ? { attachments } : {}),
    ...(supportingDocs?.length ? { supportingDocs } : {}),
  }
}

function patchLastUserMessage(
  list: AgentDialogueMessage[],
  patch: Partial<Pick<AgentDialogueMessage, "content" | "attachments" | "supportingDocs">>,
): AgentDialogueMessage[] {
  const updated = [...list]
  const lastUserIdx = updated.findLastIndex((m) => m.role === "user")
  if (lastUserIdx < 0) return list
  updated[lastUserIdx] = { ...updated[lastUserIdx], ...patch }
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
  /** Greeting shown in build mode when the session has no messages yet. Defaults to "I'm here. What are we building?" */
  greetingMessage?: string
  mode: KipSessionMode
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
  /** build mode: session id owned by parent board */
  controlledSessionId?: string | null
  onControlledSessionIdChange?: (id: string | null) => void
  /** build mode: after runAgent success — e.g. context sync + action receipts on last agent message */
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
  /** Directed cueing: run pinned/cued Cast member(s) before Lead synthesis turn. */
  directorConfig?: DirectorDialogConfig
  /** Directed cueing: Horizon label phases while sending (cast → director). */
  onDirectorPhaseChange?: (phase: DirectorSendPhase | null) => void
  /** Auth user id — forwarded to runAgent for Cast delegation. */
  userId?: string | null
  /** Display name for the current user — stamped on outgoing user messages. */
  userDisplayName?: string
  /** When true, missing agent slug throws instead of silently substituting Kip. */
  strictAgentResolution?: boolean
  /** Active Dialog — forwarded so Cast sub-runs load Document context without a session. */
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
    payload: {
      content: string
      displayContent?: string
      attachments?: AgentAttachment[]
      supportingDocs?: ReadonlyArray<{ name: string; preview?: string }>
    },
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
    const card = parseKeeperAdviceCard(d.card)

    if (status === "failed" || status === "empty") {
      directorDelegation = {
        content:
          content ||
          `${attributedTo ?? "Agent"} couldn't respond this turn. Kip answered using platform knowledge instead.`,
        attributedTo,
        status,
        ...(card ? { card } : {}),
      }
    } else if ((content && !isDirectorDelegationFailureContent(content)) || card) {
      directorDelegation = {
        content: content || card?.title || "",
        attributedTo,
        status: status ?? "ok",
        ...(card ? { card } : {}),
      }
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
      if (message.role === "system") return message
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
    mode === "build" ? [greeting] : [],
  )
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const sendInFlightRef = React.useRef(false)
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
    setMessages(boardSessionKey === "build" ? [greeting] : [])
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
        if (mode === "build" || mode === "designer") {
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
  // Named Dialog in Nav owns the thread — do not restore board Chatter underneath it.
  React.useLayoutEffect(() => {
    if (mode === "build" || mode === "designer" || manageSessionExternally) return
    if (dialogId) return
    if (!domainId || String(domainId).startsWith("fallback-")) return
    if (activeSessionIdRef.current) return
    const board = dialogBoard ?? mode
    const prefetched = takePrefetchedDialogSession(domainId, board)
    if (!prefetched) return
    if (onControlledSessionIdChange) onControlledSessionIdChange(prefetched)
    else setInternalSessionId(prefetched)
  }, [mode, domainId, dialogBoard, dialogId, manageSessionExternally, onControlledSessionIdChange])

  // agent / domain: resume existing board session only — create deferred to first send.
  // build and designer use controlled session lifecycle from the board shell.
  // domain: wait for a resolved domainId — shell fetch completes before session bootstrap.
  // Dead path removed (was useAgentDialog IDE bootstrap ~553-620): only callers are
  // UniversalConversation (manageSessionExternally=true for build) and KipScreen (mode=domain).
  React.useEffect(() => {
    if (mode === "build" || mode === "designer" || manageSessionExternally || !agentId) return
    if (dialogId) return
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
    dialogId,
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
      { content, displayContent, attachments, supportingDocs }: {
        content: string
        displayContent?: string
        attachments?: AgentAttachment[]
        supportingDocs?: ReadonlyArray<{ name: string; preview?: string }>
      },
    ) => {
      if (mode === "designer" && !frameKey && !dialogIdRef.current) return

      // ── build / agent / domain / designer: KipApi.runAgent ──────────────────
      if ((!content.trim() && !attachments?.length) || isSending || sendInFlightRef.current || !agentId) {
        return
      }
      sendInFlightRef.current = true
      setIsSending(true)
      setError(null)

      const resolvedDomainId =
        domainId && !String(domainId).startsWith("fallback-")
          ? domainId
          : frameCtx?.domain?.id && !String(frameCtx.domain.id).startsWith("fallback-")
            ? frameCtx.domain.id
            : undefined

      let sessionId = activeSessionIdRef.current
      const namedDialogId = dialogIdRef.current?.trim() || ""
      const applyBoundSession = (nextId: string) => {
        sessionId = nextId
        if (onControlledSessionIdChange) {
          onControlledSessionIdChange(nextId)
        } else {
          setInternalSessionId(nextId)
        }
        activeSessionIdRef.current = nextId
      }

      const resolveSessionName = async (): Promise<string> => {
        if (typeof sessionDisplayName === "function") {
          return sessionDisplayName()
        }
        if (sessionDisplayName) return sessionDisplayName
        if (mode === "build" && resolvedDomainId) {
          return buildIdeSessionName({
            domainId: resolvedDomainId,
            activeJourneyId: activeJourneyId ?? frameCtx?.selection?.activeJourneyId ?? null,
            activeKeeperId: frameCtx?.selection?.activeKeeperId ?? null,
          })
        }
        if (mode === "agent") return "Agent Board"
        if (mode === "designer") return frameKey ?? "Designer"
        return sessionNameDateFallback()
      }

      if (namedDialogId && resolvedDomainId) {
        try {
          const previousId = sessionId
          const name = await resolveSessionName()
          const bound = await resumeOrCreateNamedDialogSession({
            domainId: resolvedDomainId,
            dialogId: namedDialogId,
            agentId,
            domainSlug,
            sessionName: name,
          })
          if (bound.sessionId !== previousId) {
            applyBoundSession(bound.sessionId)
            if (bound.created) {
              setMessages([])
            } else {
              await fetchMessages(bound.sessionId)
            }
          } else {
            applyBoundSession(bound.sessionId)
          }
        } catch {
          sendInFlightRef.current = false
          setIsSending(false)
          setError(`Couldn't start a session with ${agentDisplayName}. Try again.`)
          return
        }
      } else if (!sessionId) {
        if (!resolvedDomainId) {
          sendInFlightRef.current = false
          setIsSending(false)
          return
        }
        try {
          const name = await resolveSessionName()
          const ensured = await resumeOrCreateBoardSession({
            domainId: resolvedDomainId,
            agentId,
            board: dialogBoard ?? mode,
            frame: dialogFrame ?? frameKey ?? "conversation",
            subject: dialogSubject ?? (mode === "designer" && (dialogFrame || frameKey) ? "boardDef" : "domain"),
            dialogScope: resolvedAudience === "admin" || mode === "designer" ? "admin" : "keeper",
            domainSlug,
            sessionName: name,
          })
          applyBoundSession(ensured.sessionId)
        } catch {
          sendInFlightRef.current = false
          setIsSending(false)
          setError(`Couldn't start a session with ${agentDisplayName}. Try again.`)
          return
        }
      }

      if (!sessionId) {
        sendInFlightRef.current = false
        setIsSending(false)
        return
      }

      const ts = Date.now()

      const transcriptContent = displayContent?.trim() || content || "[attachment]"
      const optimisticUser = stampSenderName({
        id: `user-${ts}`,
        role: "user" as const,
        content: transcriptContent,
        createdAt: new Date(mode === "build" ? Date.now() : ts).toISOString(),
        ...(attachments?.length ? { attachments } : {}),
        ...(supportingDocs?.length ? { supportingDocs: [...supportingDocs] } : {}),
      })

      setMessages((prev) => [...prev, optimisticUser])

      setInput("")
      // Clear sessionStorage immediately so a mid-send session-key change cannot
      // re-fill the composer (blocks mobile compact-after-send). Hold text for failure restore.
      armSendDraft(content)

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
      const liveDirectorConfig = directorConfigRef.current
      const baseAgentContext =
        mode === "designer" && frameKey
          ? { ...(agentContext ?? {}), designerFrameKey: frameKey }
          : agentContext
      const runOpts = {
        domainSlug: domainSlug || undefined,
        domainId: resolvedDomainId || domainId || undefined,
        dialogId: activeDialogId,
        mode: (agentRunMode ?? (mode === "designer" ? "domain" : "domain")) as "domain",
        activeJourneyId: activeJourneyId ?? frameCtx?.selection?.activeJourneyId ?? undefined,
        activeKeeperId: frameCtx?.selection?.activeKeeperId ?? undefined,
        activeDraftId: activeDraftId ?? null,
        agentContext: liveDirectorConfig
          ? { ...(baseAgentContext ?? {}), skipDelegateConsult: true }
          : baseAgentContext,
        attachments: attachments?.length ? attachments : undefined,
        displayContent: displayContent?.trim() || undefined,
        supportingDocs: supportingDocs?.length ? [...supportingDocs] : undefined,
      }

      const directorSlugNorm = liveDirectorConfig?.directorAgentSlug?.trim().toLowerCase() || ""
      // Exclude director from cast consults — Lead run is the director's turn.
      const consultSlugs = Array.from(
        new Set(
          (liveDirectorConfig?.cuedCastSlugs ?? [])
            .map((slug) => slug.trim().toLowerCase())
            .filter(Boolean)
            .filter((slug) => !directorSlugNorm || slug !== directorSlugNorm),
        ),
      )
      const castMember = liveDirectorConfig
        ? resolveDirectorCastMember({
            pinned: liveDirectorConfig.activeCastMember,
            userMessage: content,
            knownSlugs: Object.keys(liveDirectorConfig.castLabels),
          })
        : null

      const castMemberLabel =
        liveDirectorConfig && castMember
          ? liveDirectorConfig.castLabels[castMember] ?? castMember
          : null

      let directorTaskMessage: string | undefined
      let clientCastMemberReply: string | null = null
      let clientCastMemberCard: ReturnType<typeof extractKeeperAdviceCardFromRunResult> = null
      // Wire shape stays `instrumentSlug`/`instrumentReply` — apps/api agents.ts
      // castConsultations schema only accepts those keys (see agents.ts zod schema).
      let castConsultations:
        | {
            userMessage: string
            directorDisplayName: string
            consultations: Array<{
              instrumentSlug: string
              instrumentReply?: string | null
              status: "ok" | "empty" | "failed" | "error"
              actionResults?: unknown[]
            }>
          }
        | undefined
      let skipLeadRunForParticipation = false
      /** Cast-run action receipts — previously discarded by text-only extract. */
      const castActionResults: unknown[] = []

      const leadDirectsDocument = detectReorganizeIntent(content) === "required"
      if (leadDirectsDocument && consultSlugs.length > 0) {
        appendThinkingStep("Directing the Document — Cast stays off this turn.")
      }
      if (liveDirectorConfig && consultSlugs.length > 0 && content.trim() && !leadDirectsDocument) {
        onDirectorPhaseChange?.("cast")
        console.info("[AgentTurn]", {
          mechanism: "cast_consultation_a",
          phase: "cast",
          consultSlugs,
          sessionId,
          dialogId: activeDialogId ?? null,
          agentDisplayName,
        })
        // Run cast consults in parallel — sequential Cloud→Rendr→Lead stacks
        // provider timeouts (~45s each) and starves later members.
        appendThinkingStep(
          consultSlugs.length === 1
            ? `Consulting ${liveDirectorConfig.castLabels[consultSlugs[0]] ?? consultSlugs[0]}…`
            : `Consulting ${consultSlugs.length} cast members in parallel…`,
        )
        type ConsultationRow = {
          instrumentSlug: string
          instrumentReply: string | null
          status: "ok" | "empty" | "failed" | "error"
          actionResults?: unknown[]
          instrumentCard?: Record<string, unknown>
        }
        const consultationRows: ConsultationRow[] = await Promise.all(
          consultSlugs.map(async (slug): Promise<ConsultationRow> => {
            const label = liveDirectorConfig.castLabels[slug] ?? slug
            const participation = resolveCastParticipation(liveDirectorConfig, slug)
            if (participation === "silent") {
              appendThinkingStep(`${label} is silent — skipped.`)
              return { instrumentSlug: slug, instrumentReply: null, status: "empty" }
            }
            if (participation === "support_only") {
              appendThinkingStep(`${label} is support-only — not consulted as a Dialog voice.`)
              return { instrumentSlug: slug, instrumentReply: null, status: "empty" }
            }
            try {
              const castAgent = await KipApi.getAgentBySlug(slug)
              const castPrompt = buildCastDelegationPrompt({
                userMessage: content,
                instrumentLabel: label,
                directorName: liveDirectorConfig.directorDisplayName,
              })
              const castResult = await KipApi.runAgent(
                castAgent.id,
                castPrompt,
                userId ?? undefined,
                undefined,
                {
                  ...runOpts,
                  // Cast consults must not mint orphan sessions that pollute Realm feed.
                  ephemeral: true,
                },
              )
              const reply = extractAgentReplyFromRunResult(castResult)
              const card = extractKeeperAdviceCardFromRunResult(castResult)
              const castActions = withoutAdviseOnlySkips(
                annotateCastActionResults(
                  extractActionResultsFromRunResult(castResult),
                  { castSlug: slug, attributedTo: label },
                ),
              )
              if (castActions.length) {
                appendThinkingStep(
                  `${label} returned ${castActions.length} action receipt${castActions.length === 1 ? "" : "s"}.`,
                )
              }
              if (reply || card) {
                return {
                  instrumentSlug: slug,
                  instrumentReply: reply,
                  status: "ok",
                  ...(castActions.length ? { actionResults: castActions } : {}),
                  ...(card ? { instrumentCard: card } : {}),
                }
              }
              appendThinkingStep(`${label} returned nothing.`)
              return {
                instrumentSlug: slug,
                instrumentReply: null,
                status: "empty",
                ...(castActions.length ? { actionResults: castActions } : {}),
              }
            } catch (castErr: unknown) {
              const castMsg = castErr instanceof Error ? castErr.message : "cast member failed"
              const isNetworkFail =
                /failed to fetch|could not reach the keeper api|network_unreachable|network request failed/i.test(
                  castMsg,
                )
              const isTimeout = /timed out/i.test(castMsg)
              console.warn("[director] cast consult failed", { slug, castMsg })
              appendThinkingStep(
                isTimeout
                  ? `${label} — timed out waiting for the AI provider.`
                  : isNetworkFail
                    ? `${label} — couldn't reach (network).`
                    : `${label} — nothing back.`,
              )
              return { instrumentSlug: slug, instrumentReply: null, status: "failed" }
            }
          }),
        )
        for (const row of consultationRows) {
          if (row.actionResults?.length) {
            castActionResults.push(...row.actionResults)
          }
        }
        castConsultations = {
          userMessage: content,
          directorDisplayName: liveDirectorConfig.directorDisplayName,
          consultations: consultationRows,
        }
      } else if (liveDirectorConfig && castMember && content.trim()) {
        const participation = resolveCastParticipation(liveDirectorConfig, castMember)
        if (participation === "support_only" || participation === "silent") {
          const statusLabel = participation === "silent" ? "silent" : "support-only"
          appendThinkingStep(
            `${castMemberLabel} is ${statusLabel} — not a Dialog voice.`,
          )
          const honest =
            participation === "silent"
              ? `${castMemberLabel} is marked silent — they are not consulted and do not hold a Dialog voice.`
              : `${castMemberLabel} is support-only — not a Dialog voice. They don't take first-person Dialog turns. Ask ${liveDirectorConfig.directorDisplayName} (Lead), or use ${castMemberLabel} for platform/support work — not as a cast Dialog speaker.`
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
            addressedCastMember: castMember,
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

          // Run the Cast member in its own HTTP request first. Nested Rendr+Kip in one
          // proxy hop often exceeds Vercel's origin timeout and surfaces as HTTP 502.
          onDirectorPhaseChange?.("cast")
          appendThinkingStep(`Consulting ${castMemberLabel}…`)
          try {
            const castAgent = await KipApi.getAgentBySlug(castMember)
            const castPrompt = buildCastDelegationPrompt({
              userMessage: directorTaskMessage ?? content,
              instrumentLabel: castMemberLabel ?? castMember,
              directorName: liveDirectorConfig.directorDisplayName,
            })
            const castResult = await KipApi.runAgent(
              castAgent.id,
              castPrompt,
              userId ?? undefined,
              undefined,
              {
                ...runOpts,
                ephemeral: true,
              },
            )
            clientCastMemberReply = extractAgentReplyFromRunResult(castResult)
            clientCastMemberCard = extractKeeperAdviceCardFromRunResult(castResult)
            const castActions = withoutAdviseOnlySkips(
              annotateCastActionResults(
                extractActionResultsFromRunResult(castResult),
                {
                  castSlug: castMember,
                  attributedTo: castMemberLabel ?? castMember,
                },
              ),
            )
            if (castActions.length) {
              castActionResults.push(...castActions)
              appendThinkingStep(
                `${castMemberLabel} returned ${castActions.length} action receipt${castActions.length === 1 ? "" : "s"}.`,
              )
            }
            if (!clientCastMemberReply && !clientCastMemberCard) {
              appendThinkingStep(`${castMemberLabel} returned an empty reply — ${agentDisplayName} will answer directly…`)
            }
          } catch (castErr: unknown) {
            const castMsg = castErr instanceof Error ? castErr.message : "cast member failed"
            console.warn("[director] client cast member run failed", { castMember, castMsg })
            appendThinkingStep(`${castMemberLabel} couldn't respond — ${agentDisplayName} will answer directly…`)
          }
        }
      }

      if (skipLeadRunForParticipation) {
        clearSavedDraft()
        setThinkingSteps([])
        onDirectorPhaseChange?.(null)
        sendInFlightRef.current = false
        setIsSending(false)
        return
      }

      onDirectorPhaseChange?.("director")
      appendThinkingStep(`${agentDisplayName} is composing a reply…`)

      const streamAgentId = `stream-agent-${ts}`
      setMessages((prev) => [
        ...prev,
        stampSenderName({
          id: streamAgentId,
          role: "agent" as const,
          content: "",
          createdAt: new Date().toISOString(),
        }),
      ])
      const applyStreamText = (text: string, replace: boolean) => {
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== streamAgentId) return message
            return {
              ...message,
              content: replace ? text : `${message.content}${text}`,
            }
          }),
        )
      }

      const kipRunOpts = {
        ...runOpts,
        ...(castConsultations
          ? { castConsultations }
          : liveDirectorConfig && castMember && content.trim()
            ? {
                // Wire shape stays `instrumentSlug`/`instrumentReply` — kipApi.ts
                // runAgent options type only declares the legacy keys; API accepts
                // them as back-compat for `castMemberSlug`/`castMemberReply`.
                directorDelegation: {
                  instrumentSlug: castMember,
                  userMessage: content,
                  taskMessage: directorTaskMessage,
                  directorDisplayName: liveDirectorConfig.directorDisplayName,
                  instrumentRanClientSide: true,
                  instrumentReply: clientCastMemberReply,
                  ...(castActionResults.length
                    ? { actionResults: castActionResults }
                    : {}),
                  ...(clientCastMemberCard
                    ? { instrumentCard: clientCastMemberCard }
                    : {}),
                },
              }
            : {}),
      }

      const clientMechanism = castConsultations
        ? "cast_consultation_a"
        : liveDirectorConfig && castMember && content.trim()
          ? "director_cast"
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
        addressedCastMember:
          clientMechanism === "director_cast" ? (castMember ?? null) : null,
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
        sendInFlightRef.current = false
        setIsSending(false)
        return
      }

      try {
        let result: Awaited<ReturnType<typeof KipApi.runAgent>>
        try {
          result = await KipApi.runAgentStream(
            agentId,
            content,
            userId ?? undefined,
            sessionId,
            kipRunOpts,
            {
              onDelta: (text) => applyStreamText(text, false),
              onReset: () => applyStreamText("", true),
              onStatus: (label) => appendThinkingStep(label),
            },
          )
        } catch (firstErr: unknown) {
          const status = (firstErr as { status?: number })?.status
          if (mode === "build" && status === 401 && refreshSession) {
            const refreshed = await refreshSession()
            if (refreshed) {
              result = await KipApi.runAgentStream(
                agentId,
                content,
                userId ?? undefined,
                sessionId,
                kipRunOpts,
                {
                  onDelta: (text) => applyStreamText(text, false),
                  onReset: () => applyStreamText("", true),
                  onStatus: (label) => appendThinkingStep(label),
                },
              )
            } else {
              setMessages((prev) => prev.filter((m) => m.id !== `user-${ts}` && m.id !== streamAgentId))
              setError(`Please sign in to continue the conversation with ${agentDisplayName}.`)
              restoreSavedDraft()
              return
            }
          } else {
            throw firstErr
          }
        }

        const {
          actions: leadActionsArr,
          sessionId: returnedSessionId,
          directorDelegation: extractedDelegation,
        } = extractRunAgentPayload(result)

        // Prefer Lead response actions (server already folds forwarded cast
        // receipts into that stream for persistence). Fall back to client-held
        // cast receipts when Lead returned none (e.g. older API / failed merge).
        const actionsArr = mergeCastAndLeadActionResults(leadActionsArr, castActionResults)

        let directorDelegation = extractedDelegation
        if (
          liveDirectorConfig &&
          castMember &&
          content.trim() &&
          !directorDelegation
        ) {
          directorDelegation = buildInstrumentUnavailableDelegationBeat({
            instrumentLabel:
              liveDirectorConfig.castLabels[castMember] ?? castMember,
          })
        }

        if (liveDirectorConfig && castMember && content.trim()) {
          onDirectorPhaseChange?.("director")
        }

        // Equal voice cards for every engaged cast member (Mechanism A).
        // Prefer these over a single first-ok `delegation` beat so Rendr/Cloud
        // stand alone instead of nesting inside Kip's synthesis.
        const castVoices: Array<DirectorDelegationBeat & { slug: string }> | undefined =
          castConsultations?.consultations.length
            ? castConsultations.consultations.map((row) => {
                const label =
                  liveDirectorConfig?.castLabels[row.instrumentSlug]
                  ?? row.instrumentSlug
                const reply = row.instrumentReply?.trim() ?? ""
                const card = parseKeeperAdviceCard(row.instrumentCard)
                if (row.status === "ok" && (reply || card)) {
                  return {
                    slug: row.instrumentSlug,
                    attributedTo: label,
                    content: reply || card?.title || "",
                    status: "ok" as const,
                    ...(card ? { card } : {}),
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
          const withUser = patchLastUserMessage(list, {
            content: transcriptContent,
            ...(attachments?.length ? { attachments } : {}),
            ...(supportingDocs?.length ? { supportingDocs: [...supportingDocs] } : {}),
          })
          if (!directorDelegation && !actionsArr?.length && !castVoices?.length) return withUser
          const updated = [...withUser]
          const lastAgentIdx = updated.findLastIndex((m) => m.role === "agent")
          if (lastAgentIdx < 0) return withUser
          updated[lastAgentIdx] = {
            ...updated[lastAgentIdx],
            // Multi-voice turns own the Cast beats; skip single-delegation duplicate.
            ...(castVoices?.length
              ? { castVoices }
              : directorDelegation
                ? { delegation: directorDelegation }
                : {}),
            ...(actionsArr?.length ? { actionResults: actionsArr as RunAgentActionInput[] } : {}),
          }
          return updated
        }

        const replyText = extractAgentReplyFromRunResult(result)
        setMessages((prev) => {
          const painted = prev.map((message) => {
            if (message.id !== streamAgentId) return message
            return {
              ...message,
              content: replyText?.trim() || message.content,
            }
          })
          return mergeOntoLastAgent(painted)
        })

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

        void (async () => {
          let latestRaw: KipMessage[] | undefined
          try {
            latestRaw = await KipApi.getSessionMessages(sessionId)
          } catch {
            latestRaw = await fetchMessages(sessionId)
          }
          if (latestRaw?.length) {
            const normalized = latestRaw.map(normalizeMessage).map(stampSenderName)
            setMessages(mergeOntoLastAgent(normalized))
          }
          onAfterAgentRun?.(latestRaw, actionsArr, result)
        })()

        await onRefreshDraftsAfterRun?.(result)
        clearSavedDraft()
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status
        const authMsg = `Please sign in to continue the conversation with ${agentDisplayName}.`
        const failMsg = err instanceof KipAgentRunError
          ? formatKipRunErrorMessage(err.code, err.message, err.details, agentDisplayName)
          : err instanceof Error && err.message.length > 0 && err.message.length < 300
            ? err.message
            : `${agentDisplayName} couldn't respond. Try again.`
        const reply = status === 401 ? authMsg : failMsg

        appendThinkingStep(`Run failed — ${reply}`)
        restoreSavedDraft()

        // System/runtime failures must not look like the agent speaking.
        if (mode === "build") {
          setMessages((prev) => prev.filter((m) => m.id !== `user-${ts}` && m.id !== streamAgentId))
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== streamAgentId))
        }
        setError(null)
        setMessages((prev) => [
          ...prev,
          {
            id: `system-error-${ts}`,
            role: "system" as const,
            content: reply,
            createdAt: new Date().toISOString(),
          },
        ])
      } finally {
        onDirectorPhaseChange?.(null)
        sendInFlightRef.current = false
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
