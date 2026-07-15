"use client"

/**
 * UniversalConversation
 * =====================
 * KE3P · Keeper Platform · Universal Board — Center Panel
 *
 * One render file for all conversation boards.
 * useAgentDialog handles all conversation lifecycle.
 *
 * This file:
 *   - Computes agentContext once from useV0Shell()
 *   - Calls useAgentDialog with parameters from def.conversation
 *   - Branches on def.conversation.kipMode only for banner props
 *     and the three ide-mode callbacks
 *   - Calls useDraftContext for ide and agent modes
 *   - Renders KeeperDialogFrame once
 *
 * Modes:
 *   "ide"    — keeper + journey banner, Kip context sync, session title save,
 *              service bar, draft-session linking
 *   "agent"  — agent studio banner, draft context
 *   "domain" — domain identity (wordmark, tagline, live pulse, counts) via bannerContext → KeeperDialogFrame
 */

import * as React from "react"
import type { KipDraftStatus } from "../../lib/kipApi"
import { KipApi } from "../../lib/kipApi"
import { apiFetch } from "../../lib/api"
import { fetchDomainKeptMoments } from "../data/domainMomentsCache"
import { fetchBoardNavSlice, loadAgents, loadJourneyNavRows } from "./boardNavDataCache"
import {
  resolveJourneyDisplayName,
  resolveKeeperDisplayTitle,
} from "./boardEntityNameResolver"
import { useV0Shell } from "../shell/V0ShellContext"
import { useFrameContextOptional } from "../shell/FrameContext"
import { useAuth } from "../../context/AuthContext"
import { extractLinkedCard } from "../../components/agent/helpers"
import { useDraftPointAccept } from "../../hooks/useDraftPointAccept"
import { glossAnchorToDraftDiscuss } from "@keeper/shared"
import { useAgentDialog, extractRunAgentPayload, type AgentContext } from "../../hooks/useAgentDialog"
import { buildExperienceAgentContext } from "../lib/buildExperienceAgentContext"
import type { AgentBoardMessaging } from "../data/domain-frame.types"
import { useDraftContext } from "../../hooks/useDraftContext"
import { useSelectionSessionResume } from "../../hooks/useSelectionSessionResume"
import { KeeperDialogFrame } from "../components/dialog/KeeperDialogFrame"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import { BOARD_DEFINITIONS } from "./UniversalBoardDefinition"
import type { UniversalBoardCenterProps } from "./UniversalBoard"
import { useUniversalBoard } from "./UniversalBoardContext"
import { useDesignerDraftOptional } from "./DesignerDraftContext"
import { useBoardDefinitionFromUrl } from "./useBoardDefinitionFromUrl"
import { FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../shell/frameRegistryMap"
import { loadDomainFrame } from "../data/loadDomainFrame"
import type { DomainFrameJson, DomainFrameTreatment } from "../data/domain-frame.types"
import { resolveDomainTreatment } from "../treatment/resolveDomainTreatment"
import { patchDomainTreatment } from "../presence/chronicleConfig/chroniclePatch"
import type { AgentDialogueMessage } from "../../components/agent/types"
import { normalizeActionReceipt } from "../../components/agent/types"
import { commitComposerAttachmentsToLibrary, uploadLibraryFile } from "../presence/integrationChronicle/libraryNavCreate"
import {
  pickBestDialogSessionId,
  resumeOrCreateBoardSession,
  resolveActiveDialogSessions,
} from "../../lib/kipDialogSession"
import { createDraftMoment, keepMoment } from "../api/v0Moments"
import type { KeepAsMomentPayload } from "../../components/kip/ActionReceiptCard"
import type { GlossThread } from "@keeper/shared"
import {
  BOARD_INSTRUMENT_LABELS,
  type DirectorSendPhase,
} from "./directorDialog"
import {
  voicePromptSectionDef,
} from "../presence/cover/voicePromptSections"
import { useGuidedArrivalOptional } from "../guidedArrival/GuidedArrivalContext"
import { useRealmArrivalOptional } from "../realm/RealmArrivalContext"
import { useRealmFeed } from "../realm/useRealmFeed"
import { buildRealmArrivalMessage, isRealmArrivalMessage } from "../realm/realmArrivalMessage"
import type { RealmInvitationActions } from "../realm/realmInvitationActions"
import { applyRealmInvitation } from "../realm/realmInvitationActions"
import type { RealmInvitationId } from "../realm/realmInvitations"
import { resolveDomainLeadContext, resolveDialogLeadSlug, type DomainLeadRecord } from "../lib/domainLeadAgent"
import { PLACEHOLDER_LEAD_AGENT_SLUGS, KIP_FALLBACK_SLUG, KIP_FALLBACK_DISPLAY_NAME, KIP_SUPPORT_DISENGAGED, clearMissingLeadSlug, isDomainLeadAgentSlug, formatDomainLeadDisplayName, canonicalAgentSlug } from "../lib/frameLeadAgentIdentity"
import { getPlaybillGreet, clearPlaybillGreet } from "../lib/playbillGreetContinuity"
import { useFrameLeadAgentIdentity } from "../hooks/useFrameLeadAgentIdentity"
import type { BoardInstrumentChip } from "./components/BoardInstrumentsBar"
import type { ComposerAgentChip, AgentAttachment } from "../../components/agent/AgentComposer"

type ToolSlug = "cloud" | "rendr"

interface DomainScopedAgent {
  id: string
  slug: string
  name: string
  purpose?: string | null
}

interface SelectedAgentRecord {
  slug: string
  name: string
  purpose: string | null
}

function isThinkingPlaceholder(content: string, agentDisplayName: string): boolean {
  const trimmed = content.trim()
  return trimmed === `${agentDisplayName} is thinking…` || trimmed.endsWith(" is thinking…")
}

function lastExchangeFromRaw(
  messages: KipMessage[] | undefined,
): { id: string; userMessage: string; agentMessage: string } | null {
  if (!messages?.length) return null

  let agentIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if ((m.sender || m.role) !== "user") {
      agentIdx = i
      break
    }
  }
  if (agentIdx < 0) return null

  const agentMessage = typeof messages[agentIdx].content === "string" ? messages[agentIdx].content.trim() : ""
  if (!agentMessage) return null

  let userMessage = ""
  for (let i = agentIdx - 1; i >= 0; i--) {
    const m = messages[i]
    if ((m.sender || m.role) === "user") {
      userMessage = typeof m.content === "string" ? m.content.trim() : ""
      break
    }
  }

  return {
    id: messages[agentIdx].id,
    userMessage,
    agentMessage,
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UniversalConversationProps extends UniversalBoardCenterProps {
  def: UniversalBoardDef
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── DraftBar ─────────────────────────────────────────────────────────────────
// Rendered in the designer branch above KeeperDialogFrame.

function DraftBar({
  hasDraftSpec,
  publishSuccess,
  draftId,
  isPublishing,
  onPublish,
}: {
  hasDraftSpec: boolean
  publishSuccess: boolean
  draftId: string | null
  isPublishing: boolean
  onPublish: () => void
}) {
  if (!hasDraftSpec && !publishSuccess) return null
  return (
    <div
      className="shrink-0 px-4 py-2.5 border-b flex items-center justify-between gap-3"
      style={{
        borderColor: publishSuccess
          ? "hsl(var(--theme-status-success, 152 69% 43%) / 0.3)"
          : "hsl(var(--theme-status-warning, 38 92% 50%) / 0.3)",
        background: publishSuccess
          ? "hsl(var(--theme-status-success, 152 69% 43%) / 0.08)"
          : "hsl(var(--theme-status-warning, 38 92% 50%) / 0.08)",
      }}
    >
      <p
        className="text-[12px] font-medium"
        style={{
          color: publishSuccess
            ? "hsl(var(--theme-status-success, 152 69% 28%))"
            : "hsl(var(--theme-status-warning, 38 92% 32%))",
        }}
      >
        {publishSuccess
          ? "✓ Published — live platform updated"
          : draftId
            ? "Draft ready — review preview in the right panel, then publish"
            : "Edit staged — review preview in the right panel, then publish"}
      </p>
      {hasDraftSpec && !publishSuccess && (
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity disabled:opacity-50 shrink-0"
          style={{
            background: "hsl(var(--theme-ink-primary))",
            color: "hsl(var(--theme-surface-paper))",
          }}
        >
          {isPublishing ? "Publishing…" : "Publish"}
        </button>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UniversalConversation({
  def,
  domainSlug,
  domainId,
  domainName,
  activeSessionId,
  selectedDialogId,
  selectedJourneyId,
  selectedKeeperId,
  selectedDraftId,
  selectedAgentId,
  onSessionSelect,
  onJourneySelect,
  onMomentSelect,
  onDraftSelect,
  onServiceOpen,
  onDraftListRefresh,
  onJourneyListRefresh,
}: UniversalConversationProps) {
  const { domainFrame, resolvedAudience: shellAudience, reloadDomainFrame, shellMode, domainData } = useV0Shell()
  const boardDefinitionId = useBoardDefinitionFromUrl()
  const frameCtx = useFrameContextOptional()
  const { refreshSession, user } = useAuth()
  const audience = shellAudience ?? "keeper"
  const kipMode = def.conversation.kipMode
  const guidedArrival = useGuidedArrivalOptional()
  const isRealmHomeArrival = def.boardId === "realm" && shellMode === "home"
  const realmArrival = useRealmArrivalOptional()
  const { feed: realmFeed, isLoading: realmFeedLoading } = useRealmFeed(isRealmHomeArrival)
  const guidedArrivalActive = kipMode === "domain" && !!guidedArrival?.isActive
  const agentEcho = def.conversation.agentEcho === true
  const domainLeadRecord = domainData as DomainLeadRecord | null | undefined
  const domainLead = resolveDomainLeadContext(domainLeadRecord)
  const dbLeadAgentSlug = domainLead.slug

  const [playbillGreetSlug, setPlaybillGreetSlug] = React.useState<string | null | undefined>(
    undefined,
  )

  React.useEffect(() => {
    if (kipMode !== "domain" || !domainSlug) {
      setPlaybillGreetSlug(undefined)
      return
    }
    setPlaybillGreetSlug(getPlaybillGreet(domainSlug))
  }, [kipMode, domainSlug])

  React.useEffect(() => {
    if (kipMode !== "domain" || playbillGreetSlug === undefined) return
    const frameLead = domainLead.slug
    const expected = playbillGreetSlug ?? KIP_FALLBACK_SLUG
    const frameResolved = frameLead ?? KIP_FALLBACK_SLUG
    if (frameLead !== null && frameResolved === expected) {
      clearPlaybillGreet()
    }
  }, [kipMode, domainFrame, playbillGreetSlug])

  const baseAgentSlug = React.useMemo(() => {
    if (def.conversation.agentFromFrame) {
      const dbLead = resolveDialogLeadSlug(domainLeadRecord)
      if (dbLead && dbLead !== KIP_FALLBACK_SLUG) {
        return dbLead
      }
      if (kipMode === "domain" && playbillGreetSlug !== undefined) {
        return playbillGreetSlug ?? KIP_FALLBACK_SLUG
      }
      return dbLead
    }
    return def.conversation.agentSlug ?? "kip"
  }, [def.conversation.agentFromFrame, def.conversation.agentSlug, domainLeadRecord, kipMode, playbillGreetSlug])
  const defaultAgentSlug = baseAgentSlug
  const defaultAgentName = def.conversation.agentName ?? "Kip"

  // ── designer mode: frame key + draft context ───────────────────────────────
  const { selection, actions } = useUniversalBoard()
  const boardSelectedAgentId = selection.selectedAgentId ?? selectedAgentId ?? null

  // Agent Board: dialog agent persists when Chronicle nav shifts to keeper/journey/draft.
  const activeDialogAgentIdRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (kipMode !== "agent" || !boardSelectedAgentId) return
    activeDialogAgentIdRef.current = boardSelectedAgentId
  }, [kipMode, boardSelectedAgentId])

  const activeDialogAgentId =
    kipMode === "agent"
      ? (boardSelectedAgentId ?? activeDialogAgentIdRef.current)
      : boardSelectedAgentId

  // Agent Board: resolve slug/name from the active dialog agent when it differs from the board default.
  const [selectedAgentRecord, setSelectedAgentRecord] = React.useState<SelectedAgentRecord | null>(null)

  React.useEffect(() => {
    if (kipMode !== "agent" || !activeDialogAgentId) {
      setSelectedAgentRecord(null)
      return
    }
    let cancelled = false
    apiFetch(`/api/agents/${encodeURIComponent(activeDialogAgentId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const agent =
          (res as SelectedAgentRecord & { agent?: SelectedAgentRecord })?.agent ??
          (res as { data?: SelectedAgentRecord })?.data ??
          (res as SelectedAgentRecord)
        const slug = typeof agent.slug === "string" ? agent.slug.trim() : ""
        const name = typeof agent.name === "string" ? agent.name.trim() : ""
        const purpose =
          typeof agent.purpose === "string" && agent.purpose.trim()
            ? agent.purpose.trim()
            : null
        if (slug && name) {
          setSelectedAgentRecord({ slug, name, purpose })
        } else {
          setSelectedAgentRecord(null)
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedAgentRecord(null)
      })
    return () => { cancelled = true }
  }, [kipMode, activeDialogAgentId])

  const usingSelectedNonDefaultAgent =
    kipMode === "agent" &&
    !!activeDialogAgentId &&
    !!selectedAgentRecord &&
    selectedAgentRecord.slug !== defaultAgentSlug

  const directorAgentSlug = def.conversation.directorAgentSlug ?? defaultAgentSlug
  const activeBoardInstrument = selection.activeBoardInstrument

  const [domainScopedAgents, setDomainScopedAgents] = React.useState<DomainScopedAgent[]>([])

  React.useEffect(() => {
    const needsDomainRoster = kipMode === "domain" || kipMode === "designer"
    if (!domainId || !needsDomainRoster) {
      setDomainScopedAgents([])
      return
    }
    let cancelled = false
    void fetchBoardNavSlice(domainId, "agents", () => loadAgents(domainId))
      .then((list) => {
        if (!cancelled) {
          setDomainScopedAgents(Array.isArray(list) ? (list as DomainScopedAgent[]) : [])
        }
      })
      .catch(() => {
        if (!cancelled) setDomainScopedAgents([])
      })
    return () => { cancelled = true }
  }, [domainId, kipMode])

  const rosterDomainLeadSlug = React.useMemo(() => {
    const platformComposerSlugs = new Set(["kip", "cloud", "rendr"])
    for (const agent of domainScopedAgents) {
      if (
        !platformComposerSlugs.has(agent.slug)
        && !PLACEHOLDER_LEAD_AGENT_SLUGS.has(agent.slug)
      ) {
        return agent.slug
      }
    }
    return null
  }, [domainScopedAgents])

  const effectiveDomainLeadSlug = dbLeadAgentSlug ?? rosterDomainLeadSlug

  const frameLeadIdentity = useFrameLeadAgentIdentity(
    effectiveDomainLeadSlug,
    def.conversation.agentName ?? "Kip",
  )

  const normalizedDomainLeadSlug = React.useMemo(() => {
    const raw = effectiveDomainLeadSlug?.trim()
    if (!raw || PLACEHOLDER_LEAD_AGENT_SLUGS.has(raw)) return null
    return canonicalAgentSlug(raw)
  }, [effectiveDomainLeadSlug])

  const domainLeadDisplayName =
    domainLead.name?.trim()
    || (normalizedDomainLeadSlug && frameLeadIdentity.displayName
      ? frameLeadIdentity.displayName
      : null)

  /** Domain has a non-Kip lead agent bound from DB (Ceox, etc.). */
  const hasDomainLeadAgent = React.useMemo(
    () =>
      kipMode === "domain"
      && !!normalizedDomainLeadSlug
      && normalizedDomainLeadSlug !== KIP_FALLBACK_SLUG,
    [kipMode, normalizedDomainLeadSlug],
  )

  /** Personal / owner domains with a non-Kip lead — lead owns Dialog; Kip collaborates. */
  const isLeadLedDomain = hasDomainLeadAgent

  const isDirectorMode =
    !guidedArrivalActive
    && def.conversation.dialogOrchestration === "director"
    && (kipMode === "ide" || kipMode === "designer" || (kipMode === "domain" && !hasDomainLeadAgent))

  /** Kip included in support collaboration (footer toggle). Default: invoked. */
  const kipSupportInvoked =
    isLeadLedDomain && activeBoardInstrument !== KIP_SUPPORT_DISENGAGED

  const directorInstrumentLabels = React.useMemo((): Record<string, string> => {
    if (kipMode === "ide") return { ...BOARD_INSTRUMENT_LABELS }
    if (kipMode === "designer") {
      const labels: Record<string, string> = {
        [KIP_FALLBACK_SLUG]: KIP_FALLBACK_DISPLAY_NAME,
      }
      if (normalizedDomainLeadSlug && domainLeadDisplayName) {
        labels[normalizedDomainLeadSlug] = domainLeadDisplayName
      }
      return labels
    }
    if (kipMode === "domain") {
      const labels: Record<string, string> = {
        [KIP_FALLBACK_SLUG]: KIP_FALLBACK_DISPLAY_NAME,
      }
      const platformComposerSlugs = new Set(["kip", "cloud", "rendr"])
      if (normalizedDomainLeadSlug && domainLeadDisplayName) {
        labels[normalizedDomainLeadSlug] = domainLeadDisplayName
      }
      for (const agent of domainScopedAgents) {
        if (!platformComposerSlugs.has(agent.slug)) {
          labels[agent.slug] = agent.name
        }
      }
      return labels
    }
    return {}
  }, [kipMode, domainScopedAgents, normalizedDomainLeadSlug, domainLeadDisplayName])

  const [composerLeadSlug, setComposerLeadSlug] = React.useState<string | null>(null)
  const defaultLeadPinnedRef = React.useRef(false)

  React.useEffect(() => {
    if (kipMode !== "domain" || !isDirectorMode) {
      setComposerLeadSlug(null)
      defaultLeadPinnedRef.current = false
      return
    }
    if (normalizedDomainLeadSlug) {
      clearMissingLeadSlug(normalizedDomainLeadSlug)
      setComposerLeadSlug(normalizedDomainLeadSlug)
    }
  }, [kipMode, isDirectorMode, normalizedDomainLeadSlug])

  React.useEffect(() => {
    if (kipMode !== "domain" || !isDirectorMode) return
    if (defaultLeadPinnedRef.current || activeBoardInstrument !== null) return
    if (normalizedDomainLeadSlug) {
      actions.onSetActiveBoardInstrument(normalizedDomainLeadSlug)
      defaultLeadPinnedRef.current = true
    }
  }, [
    kipMode,
    isDirectorMode,
    normalizedDomainLeadSlug,
    activeBoardInstrument,
    actions,
  ])

  const domainDirectorBoardInstruments = React.useMemo((): BoardInstrumentChip[] => {
    if (kipMode !== "domain" || !isDirectorMode) return []
    const platformComposerSlugs = new Set(["kip", "cloud", "rendr"])
    const seenSlugs = new Set<string>()
    const instruments: BoardInstrumentChip[] = []

    const addInstrument = (chip: BoardInstrumentChip) => {
      const key = canonicalAgentSlug(chip.slug)
      if (!key || seenSlugs.has(key)) return
      seenSlugs.add(key)
      instruments.push(chip)
    }

    addInstrument({
      slug: directorAgentSlug,
      label: defaultAgentName,
      isDirector: true,
    })

    if (normalizedDomainLeadSlug && domainLeadDisplayName) {
      const rosterLead = domainScopedAgents.find(
        (agent) => canonicalAgentSlug(agent.slug) === normalizedDomainLeadSlug,
      )
      addInstrument({
        slug: rosterLead?.slug ?? normalizedDomainLeadSlug,
        label: domainLeadDisplayName,
      })
    } else if (directorAgentSlug !== KIP_FALLBACK_SLUG) {
      addInstrument({
        slug: KIP_FALLBACK_SLUG,
        label: KIP_FALLBACK_DISPLAY_NAME,
      })
    }

    const leadKey = normalizedDomainLeadSlug
    const directorKey = canonicalAgentSlug(directorAgentSlug)
    for (const agent of domainScopedAgents) {
      const agentKey = canonicalAgentSlug(agent.slug)
      if (
        !agentKey ||
        platformComposerSlugs.has(agentKey) ||
        agentKey === leadKey ||
        agentKey === directorKey
      ) {
        continue
      }
      addInstrument({ slug: agent.slug, label: agent.name })
    }
    return instruments
  }, [
    kipMode,
    isDirectorMode,
    directorAgentSlug,
    defaultAgentName,
    normalizedDomainLeadSlug,
    domainLeadDisplayName,
    domainScopedAgents,
  ])

  /** Lead-led domain — footer Agents bar: support agents only (Kip). Lead lives in composer toolbar. */
  const domainCollaborationInstruments = React.useMemo((): BoardInstrumentChip[] => {
    if (!isLeadLedDomain) return []
    return [
      {
        slug: KIP_FALLBACK_SLUG,
        label: KIP_FALLBACK_DISPLAY_NAME,
      },
    ]
  }, [isLeadLedDomain])

  /** Design Board — Rendr owns composer; domain lead + Kip always pin-able in footer. */
  const designerBoardInstruments = React.useMemo((): BoardInstrumentChip[] => {
    if (kipMode !== "designer" || !isDirectorMode) return []
    const instruments: BoardInstrumentChip[] = []
    if (normalizedDomainLeadSlug && domainLeadDisplayName) {
      instruments.push({
        slug: normalizedDomainLeadSlug,
        label: domainLeadDisplayName,
      })
    }
    if (!normalizedDomainLeadSlug) {
      instruments.push({
        slug: KIP_FALLBACK_SLUG,
        label: KIP_FALLBACK_DISPLAY_NAME,
      })
    } else if (normalizedDomainLeadSlug !== KIP_FALLBACK_SLUG) {
      instruments.push({
        slug: KIP_FALLBACK_SLUG,
        label: KIP_FALLBACK_DISPLAY_NAME,
      })
    }
    return instruments
  }, [
    kipMode,
    isDirectorMode,
    normalizedDomainLeadSlug,
    domainLeadDisplayName,
  ])

  const composerAgentChips = React.useMemo((): ComposerAgentChip[] => {
    if (isLeadLedDomain && normalizedDomainLeadSlug) {
      const label =
        domainLeadDisplayName
        ?? (isDomainLeadAgentSlug(normalizedDomainLeadSlug)
          ? formatDomainLeadDisplayName(normalizedDomainLeadSlug)
          : normalizedDomainLeadSlug)
      return [{ slug: normalizedDomainLeadSlug, label }]
    }
    if (
      kipMode !== "domain" ||
      !isDirectorMode ||
      !normalizedDomainLeadSlug ||
      !composerLeadSlug ||
      composerLeadSlug !== normalizedDomainLeadSlug
    ) {
      return []
    }
    const label =
      domainLeadDisplayName
      ?? (isDomainLeadAgentSlug(normalizedDomainLeadSlug)
        ? formatDomainLeadDisplayName(normalizedDomainLeadSlug)
        : normalizedDomainLeadSlug)
    return [{ slug: composerLeadSlug, label }]
  }, [
    kipMode,
    isLeadLedDomain,
    isDirectorMode,
    composerLeadSlug,
    domainLeadDisplayName,
    normalizedDomainLeadSlug,
  ])

  /** Domain: toolbar shows lead identity; Kip lives in footer Agents bar. */
  const showComposerToolbarAgentIdentity =
    kipMode !== "domain"
    || (!isDirectorMode && !isLeadLedDomain)
    || composerAgentChips.length > 0

  const dialogAgentSlug = isLeadLedDomain
    ? (normalizedDomainLeadSlug ?? baseAgentSlug)
    : guidedArrivalActive && guidedArrival
      ? guidedArrival.leadAgentSlug
      : isDirectorMode
        ? directorAgentSlug
        : usingSelectedNonDefaultAgent && selectedAgentRecord
          ? selectedAgentRecord.slug
          : baseAgentSlug

  const usesDomainLeadAgent =
    !!normalizedDomainLeadSlug && dialogAgentSlug === normalizedDomainLeadSlug

  const dialogAgentDisplayName = guidedArrivalActive && guidedArrival
    ? guidedArrival.leadAgentDisplayName
    : isLeadLedDomain
      ? (domainLeadDisplayName ?? frameLeadIdentity.displayName)
      : composerAgentChips.length > 0
        ? composerAgentChips[0].label
        : usesDomainLeadAgent
          ? (domainLeadDisplayName ?? frameLeadIdentity.displayName)
          : isDirectorMode
            ? defaultAgentName
            : usingSelectedNonDefaultAgent && selectedAgentRecord
              ? selectedAgentRecord.name
              : def.conversation.agentFromFrame
                ? frameLeadIdentity.displayName
                : def.conversation.agentName

  const dialogUserDisplayName =
    user?.name?.trim() || user?.email?.trim() || "You"

  const directorConfig = React.useMemo(
    () =>
      isDirectorMode
        ? {
            activeInstrument: activeBoardInstrument,
            instrumentLabels: directorInstrumentLabels,
            directorDisplayName: defaultAgentName,
          }
        : undefined,
    [isDirectorMode, activeBoardInstrument, defaultAgentName, directorInstrumentLabels],
  )

  const [directorSendPhase, setDirectorSendPhase] = React.useState<DirectorSendPhase | null>(null)

  const selectedBoardDefId = kipMode === "designer" ? boardDefinitionId : null
  /** Design board focus — defaults to domain so Rendr is talkable without Nav selection. */
  const designerFocusKey =
    kipMode === "designer" ? (selectedBoardDefId ?? "domain") : null
  const designerDraftCtx = useDesignerDraftOptional()

  // ── agentContext — computed once, shared across all modes ─────────────
  const agentContext = React.useMemo(() => {
    const base = buildExperienceAgentContext(domainFrame, audience)
    let merged: Record<string, unknown> | undefined = base ? { ...base } : undefined

    const anchor = selection.draftDiscussAnchor
    if (anchor) {
      const draftDiscuss = glossAnchorToDraftDiscuss(anchor)
      merged = {
        ...(merged ?? {}),
        glossAnchor: anchor,
        ...(draftDiscuss ? { draftDiscuss } : {}),
        ...(selection.draftDiscussIntent === "rewrite"
          ? { draftDiscussIntent: "rewrite" as const }
          : {}),
      }
    }

    if (
      kipMode === "agent" &&
      selection.trainingMode &&
      selectedAgentRecord &&
      boardSelectedAgentId
    ) {
      const frameKey = selection.activeTrainingFrame
      const frameDef = voicePromptSectionDef(frameKey)
      merged = {
        ...(merged ?? {}),
        agentTraining: {
          agentId: boardSelectedAgentId,
          agentName: selectedAgentRecord.name,
          frame: frameKey,
          frameLabel: frameDef.stripLabel,
          frameIntent: frameDef.frameIntent,
          instruction: `Training ${selectedAgentRecord.name}. Chronicle frame in focus: ${frameDef.stripLabel}. Help the user refine this section of the agent voice prompt — suggest concrete copy, ask clarifying questions, and align with the frame intent.`,
        },
      }
    }

    if (kipMode === "designer" && designerFocusKey) {
      const currentTreatment = resolveDomainTreatment(domainFrame)
      merged = {
        ...(merged ?? {}),
        designBoard: {
          focusKey: designerFocusKey,
          currentTreatment,
        },
      }
    }

    return merged as AgentContext | undefined
  }, [
    domainFrame,
    audience,
    kipMode,
    designerFocusKey,
    selection.trainingMode,
    selection.activeTrainingFrame,
    selection.draftDiscussAnchor,
    selection.draftDiscussIntent,
    selectedAgentRecord,
    boardSelectedAgentId,
  ])

  const agentBoardMessaging = React.useMemo((): AgentBoardMessaging | undefined => {
    if (kipMode !== "agent") return undefined
    return domainFrame?.agent_board?.messaging
  }, [kipMode, domainFrame])

  // ── ide mode: resolved names for banner ───────────────────────────────────
  const activeKeeperId = selectedKeeperId ?? frameCtx?.selection?.activeKeeperId ?? null
  const activeJourneyId = selectedJourneyId ?? frameCtx?.selection?.activeJourneyId ?? null

  const [keeperName, setKeeperName] = React.useState<string | null>(null)
  const [journeyName, setJourneyName] = React.useState<string | null>(null)
  const [dialogTitle, setDialogTitle] = React.useState<string | null>(null)
  const [draftTitle, setDraftTitle] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!selectedDialogId || !domainId) { setDialogTitle(null); return }
    let cancelled = false
    apiFetch(
      `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(selectedDialogId)}`,
    )
      .then((res: unknown) => {
        if (cancelled) return
        const title = (res as { dialog?: { title?: string } })?.dialog?.title?.trim()
        setDialogTitle(title || null)
      })
      .catch(() => { if (!cancelled) setDialogTitle(null) })
    return () => { cancelled = true }
  }, [selectedDialogId, domainId])

  React.useEffect(() => {
    if (!selectedDraftId || !domainId) { setDraftTitle(null); return }
    let cancelled = false
    KipApi.getDraft(domainId, selectedDraftId)
      .then((d) => { if (!cancelled) setDraftTitle(d.title?.trim() || null) })
      .catch(() => { if (!cancelled) setDraftTitle(null) })
    return () => { cancelled = true }
  }, [selectedDraftId, domainId])

  React.useEffect(() => {
    if (!activeKeeperId) { setKeeperName(null); return }
    let cancelled = false
    void resolveKeeperDisplayTitle(domainId, activeKeeperId)
      .then((name) => {
        if (!cancelled) setKeeperName(name)
      })
      .catch(() => {
        if (!cancelled) setKeeperName(null)
      })
    return () => { cancelled = true }
  }, [activeKeeperId, domainId])

  React.useEffect(() => {
    if (!activeJourneyId) { setJourneyName(null); return }
    let cancelled = false
    void resolveJourneyDisplayName(domainId, activeJourneyId)
      .then((name) => {
        if (!cancelled) setJourneyName(name)
      })
      .catch(() => {
        if (!cancelled) setJourneyName(null)
      })
    return () => { cancelled = true }
  }, [activeJourneyId, domainId])

  // ── domain mode: counts for DomainBanner ──────────────────────────────────
  const [journeyCount, setJourneyCount] = React.useState<number | null>(null)
  const [momentCount, setMomentCount] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (kipMode !== "domain" || !domainId) {
      if (kipMode !== "domain") setJourneyCount(null)
      return
    }
    let cancelled = false
    void loadJourneyNavRows(domainId)
      .then((list) => {
        if (!cancelled) setJourneyCount(Array.isArray(list) ? list.length : 0)
      })
      .catch(() => {
        if (!cancelled) setJourneyCount(null)
      })
    return () => { cancelled = true }
  }, [kipMode, domainId])

  // Moment count deferred — avoid eager limit=500 list on domain board idle load.
  // Banner shows "—" until a lighter count endpoint exists or user engages a journey.
  React.useEffect(() => {
    if (kipMode !== "domain" || !domainSlug) {
      setMomentCount(null)
      return
    }
    if (!activeJourneyId && !activeKeeperId) {
      setMomentCount(null)
      return
    }
    let cancelled = false
    void fetchDomainKeptMoments(domainSlug, { limit: 50 })
      .then((rows) => {
        if (!cancelled) {
          const n = rows.length
          setMomentCount(n >= 50 ? 50 : n)
        }
      })
      .catch(() => { if (!cancelled) setMomentCount(null) })
    return () => { cancelled = true }
  }, [kipMode, domainSlug, activeJourneyId, activeKeeperId])

  // ── Adapter: hooks require (string | null) but centerProps callbacks take (string) ──
  const handleSessionChange = React.useCallback(
    (id: string | null) => { onSessionSelect(id) },
    [onSessionSelect],
  )

  // ── designer mode: draft proposal handler ─────────────────────────────────
  const handleDesignerDraft = React.useCallback(
    async (draft: { spec_json: unknown }, fKey: string) => {
      if (!designerDraftCtx || !domainId) return
      const frameBlock = draft.spec_json
      if (!frameBlock || typeof frameBlock !== "object") return

      const jsonKey = FRAME_TO_JSON_KEY[fKey] ?? null
      const base = designerDraftCtx.liveDomainFrame
        ? { ...(designerDraftCtx.liveDomainFrame as Record<string, unknown>) }
        : {}
      const fullSpec = jsonKey ? { ...base, [jsonKey]: frameBlock } : base

      designerDraftCtx.setDraftSpecJson(fullSpec as DomainFrameJson)
      designerDraftCtx.setPublishSuccess(false)

      try {
        const frameDisplayName = FRAME_DISPLAY_NAMES[fKey] ?? fKey
        const d = await KipApi.createDraft(domainId, {
          kind: "domain_json",
          key: `designer-${fKey}-${Date.now()}`,
          title: `${frameDisplayName} proposal`,
          spec: fullSpec as Record<string, unknown>,
        })
        designerDraftCtx.setDraftId(d.id)
      } catch (err) {
        console.error("[UniversalConversation] auto-create draft failed:", err)
      }
    },
    [designerDraftCtx, domainId],
  )

  // ── Agent Board agent echo / domain lead collaboration (Kip support) ──
  const [echoAgentId, setEchoAgentId] = React.useState<string | null>(null)
  const [echoSessionId, setEchoSessionId] = React.useState<string | null>(null)

  const kipCollaborationAfterLead =
    isLeadLedDomain && kipMode === "domain" && kipSupportInvoked

  React.useEffect(() => {
    const needsKipEcho =
      (agentEcho && kipMode === "agent") || kipCollaborationAfterLead
    if (!needsKipEcho) {
      setEchoAgentId(null)
      return
    }
    let cancelled = false
    KipApi.getLeadAgent(KIP_FALLBACK_SLUG)
      .then((agent) => {
        if (!cancelled) setEchoAgentId(agent.id)
      })
      .catch(() => {
        if (!cancelled) setEchoAgentId(null)
      })
    return () => {
      cancelled = true
    }
  }, [agentEcho, kipMode, kipCollaborationAfterLead])

  React.useEffect(() => {
    const needsKipEcho =
      (agentEcho && kipMode === "agent") || kipCollaborationAfterLead
    if (!needsKipEcho || !echoAgentId || !domainId) {
      setEchoSessionId(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const echoSessionName =
          kipMode === "agent" ? "Agent Board Echo" : "Domain Lead Collaboration"
        const echoBoard = kipMode === "agent" ? "agent" : "domain"
        const sessions = await resolveActiveDialogSessions(domainId, {
          board: echoBoard,
          frame: "conversation",
          dialogScope: "keeper",
        })
        if (cancelled) return
        const echoSession = sessions.find((s) => {
          const name =
            typeof s.session_name === "string"
              ? s.session_name.trim()
              : typeof s.sessionName === "string"
                ? s.sessionName.trim()
                : ""
          return name === echoSessionName
        })
        if (echoSession?.id) {
          setEchoSessionId(echoSession.id)
          return
        }
        const session = await KipApi.createSession(echoAgentId, undefined, echoSessionName, {
          domainSlug: domainSlug ?? undefined,
          domainId,
          board: echoBoard,
          frame: "conversation",
          dialogSubject: "domain",
          dialogScope: "keeper",
        })
        if (!cancelled) setEchoSessionId(session.id)
      } catch {
        if (!cancelled) setEchoSessionId(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [agentEcho, kipMode, kipCollaborationAfterLead, echoAgentId, domainId, domainSlug])

  const setMessagesRef = React.useRef<React.Dispatch<React.SetStateAction<AgentDialogueMessage[]>> | null>(null)

  // ── ide / designer / agent mode: post-run callbacks ─────────────────────────
  const onAfterAgentRun = React.useCallback(
    (latestRaw: KipMessage[] | undefined, actionResults: unknown[] | undefined) => {
      if (selection.draftDiscussAnchor) {
        actions.clearDraftDiscussAnchor()
      }

      if (Array.isArray(actionResults)) {
        const savedGeneratedImage = actionResults.some((ar) => {
          const receipt = normalizeActionReceipt(
            ar as Parameters<typeof normalizeActionReceipt>[0],
          )
          return (
            receipt.status === "success"
            && receipt.type === "image.generate"
            && typeof receipt.data?.libraryItemId === "string"
          )
        })
        if (savedGeneratedImage) {
          actions.bumpLibraryNav()
          for (const ar of actionResults) {
            const receipt = normalizeActionReceipt(
              ar as Parameters<typeof normalizeActionReceipt>[0],
            )
            const libraryItemId = receipt.data?.libraryItemId
            if (typeof libraryItemId === "string") {
              actions.onLibraryItemSelect(libraryItemId)
              break
            }
          }
        }
      }

      if (kipMode === "designer" && designerFocusKey) {
        if (Array.isArray(actionResults)) {
          for (const ar of actionResults) {
            const a = ar as {
              type?: string
              result?: { draft?: { id?: string; spec_json?: unknown } }
            }
            if (a.type === "draft.create" && a.result?.draft?.spec_json !== undefined) {
              void handleDesignerDraft(
                { spec_json: a.result.draft.spec_json },
                designerFocusKey,
              )
              return
            }
          }
        }
        return
      }

      if (
        (kipMode === "agent" || kipMode === "domain")
        && Array.isArray(actionResults)
      ) {
        for (const ar of actionResults) {
          const receipt = normalizeActionReceipt(
            ar as Parameters<typeof normalizeActionReceipt>[0],
          )
          if (receipt.status !== "success") continue

          if (
            (receipt.type === "draft.create"
              || receipt.type === "draft.update")
            && (receipt.data?.draft?.id || receipt.data?.draftId)
          ) {
            onDraftListRefresh?.()
            onDraftSelect(
              (receipt.data?.draft?.id ?? receipt.data?.draftId) as string,
            )
            actions.bumpDraftPresence()
            return
          }
          if (
            (receipt.type === "draft.update.propose"
              || receipt.type === "draft.point.rewrite")
            && (receipt.data?.draft?.id || receipt.data?.draftId)
          ) {
            onDraftListRefresh?.()
            actions.bumpDraftPresence()
            return
          }

          const moment = receipt.data?.moment as { id?: string } | undefined
          if (
            moment?.id
            && (receipt.type === "moment.create"
              || receipt.type === "moment.keep"
              || receipt.type === "moment.capture")
          ) {
            onJourneyListRefresh?.()
            onMomentSelect(moment.id)
            return
          }

          const journey = receipt.data?.journey as { id?: string } | undefined
          if (journey?.id && (receipt.type === "journey.create" || receipt.type === "journey.update")) {
            onJourneyListRefresh?.()
            onJourneySelect(journey.id)
            return
          }
        }
        return
      }

      if (kipMode !== "ide") return

      if (Array.isArray(actionResults)) {
        for (const ar of actionResults) {
          const receipt = normalizeActionReceipt(
            ar as Parameters<typeof normalizeActionReceipt>[0],
          )
          if (receipt.status !== "success") continue

          if (
            (receipt.type === "draft.create"
              || receipt.type === "draft.update")
            && (receipt.data?.draft?.id || receipt.data?.draftId)
          ) {
            onDraftListRefresh?.()
            onDraftSelect(
              (receipt.data?.draft?.id ?? receipt.data?.draftId) as string,
            )
            actions.bumpDraftPresence()
            return
          }
          if (
            (receipt.type === "draft.update.propose"
              || receipt.type === "draft.point.rewrite")
            && (receipt.data?.draft?.id || receipt.data?.draftId)
          ) {
            onDraftListRefresh?.()
            actions.bumpDraftPresence()
            return
          }
        }
      }
      if (!latestRaw?.length) return
      for (let i = latestRaw.length - 1; i >= 0; i--) {
        const m = latestRaw[i]
        if ((m.sender || m.role) === "user") continue
        const linked = extractLinkedCard(m.metadata)
        if (linked) {
          if (linked.entityType === "journey") { onJourneySelect(linked.entityId); return }
          if (linked.entityType === "moment") { onMomentSelect(linked.entityId); return }
          if ((linked.entityType as string) === "draft") { onDraftSelect(linked.entityId); return }
        }
        return
      }
    },
    [kipMode, designerFocusKey, handleDesignerDraft, onDraftSelect, onJourneySelect, onMomentSelect, onDraftListRefresh, onJourneyListRefresh, actions, selection.draftDiscussAnchor],
  )

  const onAfterAgentRunWithEcho = React.useCallback(
    async (
      latestRaw: KipMessage[] | undefined,
      actionResults: unknown[] | undefined,
      result: unknown,
    ) => {
      void result
      if (kipMode === "ide" || kipMode === "designer" || kipMode === "agent") {
        onAfterAgentRun(latestRaw, actionResults)
      }
      if (kipMode === "domain") {
        onAfterAgentRun(latestRaw, actionResults)
      }

      const runAgentBoardEcho =
        agentEcho && kipMode === "agent" && dialogAgentSlug !== defaultAgentSlug
      const runDomainCollaboration =
        kipCollaborationAfterLead && kipMode === "domain"

      if (!runAgentBoardEcho && !runDomainCollaboration) return
      if (!echoAgentId || !echoSessionId) return

      const exchange = lastExchangeFromRaw(latestRaw)
      if (!exchange?.agentMessage) return

      const echoPrompt = runDomainCollaboration
        ? [
            `[Platform collaboration — ${KIP_FALLBACK_DISPLAY_NAME}]`,
            `The user asked: "${exchange.userMessage || "[no user message]"}"`,
            `${dialogAgentDisplayName} (domain lead) responded: "${exchange.agentMessage}"`,
            ``,
            `You are Keeper platform support — not the lead voice.`,
            `Add only platform, infrastructure, or Keeper-context the lead may have missed.`,
            `Do NOT re-answer the user's question or correct the lead.`,
            `If the lead answer is accurate and complete, return empty.`,
            `Maximum three sentences. Empty is valid.`,
          ].join("\n")
        : [
            `[Agent Echo — supporting role]`,
            `The user asked: "${exchange.userMessage || "[no user message]"}"`,
            `${dialogAgentDisplayName} responded: "${exchange.agentMessage}"`,
            ``,
            `You are in the supporting role. Do NOT answer the user's question.`,
            `Read what ${dialogAgentDisplayName} said and decide:`,
            `- If it is accurate and complete, return empty. Stay silent. Let the dialog rest.`,
            `- If you have something sharp and brief to add, contribute a Dialog Response.`,
            `Your response is addressed to the exchange, not to the user directly.`,
            `Maximum three sentences. Usually one is enough. Empty is valid.`,
          ].join("\n")

      try {
        const echoResult = await KipApi.runAgent(
          echoAgentId,
          echoPrompt,
          undefined,
          echoSessionId,
          {
            domainSlug: domainSlug || undefined,
            domainId: domainId || undefined,
            mode: "domain",
            agentContext,
          },
        )
        const echoContent = extractAgentReplyFromRunResult(echoResult)?.trim()
        if (!echoContent || !setMessagesRef.current) return

        setMessagesRef.current((prev) => {
          let targetIdx = prev.findIndex((m) => m.id === exchange.id)
          if (targetIdx < 0) {
            targetIdx = prev.findLastIndex(
              (m) => m.role === "agent" && !isThinkingPlaceholder(m.content, dialogAgentDisplayName),
            )
          }
          if (targetIdx < 0) return prev
          const updated = [...prev]
          updated[targetIdx] = {
            ...updated[targetIdx],
            senderName:
              updated[targetIdx].senderName?.trim() || dialogAgentDisplayName,
            echo: {
              content: echoContent,
              attributedTo: runDomainCollaboration
                ? KIP_FALLBACK_DISPLAY_NAME
                : defaultAgentName,
            },
          }
          return updated
        })
      } catch {
        /* Silence is valid — failed agent echo inference renders nothing */
      }
    },
    [
      kipMode,
      onAfterAgentRun,
      agentEcho,
      kipCollaborationAfterLead,
      kipSupportInvoked,
      dialogAgentSlug,
      defaultAgentSlug,
      echoAgentId,
      echoSessionId,
      domainSlug,
      domainId,
      agentContext,
      dialogAgentDisplayName,
      defaultAgentName,
    ],
  )

  // ── designer mode: publish handler ────────────────────────────────────────
  const handlePublish = React.useCallback(async () => {
    if (!designerDraftCtx || !domainId || designerDraftCtx.isPublishing || !designerDraftCtx.draftSpecJson) return
    designerDraftCtx.setIsPublishing(true)
    try {
      let resolvedDraftId = designerDraftCtx.draftId
      if (!resolvedDraftId) {
        const d = await KipApi.createDraft(domainId, {
          kind: "domain_json",
          key: `direct-edit-${Date.now()}`,
          title: "Direct edit",
          spec: designerDraftCtx.draftSpecJson as unknown as Record<string, unknown>,
        })
        resolvedDraftId = d.id
        designerDraftCtx.setDraftId(resolvedDraftId)
      }
      await KipApi.updateDraft(domainId, resolvedDraftId, {
        spec: designerDraftCtx.draftSpecJson as unknown as Record<string, unknown>,
      })
      await KipApi.publishDraft(domainId, resolvedDraftId)
      designerDraftCtx.setPublishSuccess(true)
      designerDraftCtx.setDraftSpecJson(null)
      designerDraftCtx.setDraftId(null)
      if (domainSlug) {
        try {
          const reloaded = await loadDomainFrame(domainSlug)
          designerDraftCtx.setLiveDomainFrame(reloaded)
        } catch {
          // non-fatal — live frame stays stale until next navigation
        }
      }
      setTimeout(() => designerDraftCtx.setPublishSuccess(false), 3000)
    } catch (err) {
      console.error("[UniversalConversation] publish failed:", err)
    } finally {
      designerDraftCtx.setIsPublishing(false)
    }
  }, [designerDraftCtx, domainId, domainSlug])

  const handleRefreshDraftsAfterRun = React.useCallback(
    async (result: unknown) => {
      if ((kipMode !== "agent" && kipMode !== "ide") || !onDraftListRefresh) return
      const { actions: actionResults } = extractRunAgentPayload(result)
      if (!actionResults?.length) return
      const hasDraftMutation = actionResults.some((ar: unknown) => {
        const n = normalizeActionReceipt(ar as Parameters<typeof normalizeActionReceipt>[0])
        return (
          n.status === "success"
          && [
            "draft.create",
            "draft.update",
            "draft.update.propose",
            "draft.point.rewrite",
            "draft.point.accept",
            "draft.delete",
            "draft.setActive",
          ].includes(n.type)
        )
      })
      if (hasDraftMutation) onDraftListRefresh()
    },
    [kipMode, onDraftListRefresh],
  )

  // ── useAgentDialog — conversation lifecycle ───────────────────────────────
  const {
    messages,
    setMessages,
    input,
    setInput,
    isSending,
    error,
    setError,
    thinkingSteps,
    agentId,
    activeSessionId: dialogSessionId,
    sendMessage,
    fetchMessages,
  } = useAgentDialog({
    agentSlug: dialogAgentSlug,
    resolvedAgentId:
      usingSelectedNonDefaultAgent && activeDialogAgentId ? activeDialogAgentId : undefined,
    agentDisplayName: dialogAgentDisplayName,
    greetingMessage:
      guidedArrivalActive && guidedArrival?.greeting
        ? guidedArrival.greeting
        : kipMode === "designer" && def.conversation.greetingMessage
          ? def.conversation.greetingMessage
          : undefined,
    mode: kipMode,
    dialogBoard: kipMode === "designer" ? "designer" : undefined,
    dialogFrame: kipMode === "designer" ? (designerFocusKey ?? undefined) : undefined,
    dialogSubject: kipMode === "designer" ? "boardDef" : undefined,
    domainSlug,
    domainId,
    agentContext,
    activeDraftId: selectedDraftId ?? null,
    resolvedAudience: audience,
    refreshSession,
    frameCtx,
    activeJourneyId: kipMode === "ide" ? activeJourneyId : null,
    controlledSessionId: activeSessionId,
    onControlledSessionIdChange: handleSessionChange,
    onAfterAgentRun:
      kipMode === "domain" || kipMode === "ide" || kipMode === "designer" || kipMode === "agent"
        ? onAfterAgentRunWithEcho
        : undefined,
    onRefreshDraftsAfterRun:
      kipMode === "agent" || kipMode === "ide" ? handleRefreshDraftsAfterRun : undefined,
    frameKey: designerFocusKey ?? undefined,
    manageSessionExternally:
      kipMode === "ide" || (kipMode === "agent" && usingSelectedNonDefaultAgent),
    directorConfig,
    onDirectorPhaseChange: isDirectorMode ? setDirectorSendPhase : undefined,
    userId: user?.id ?? null,
    userDisplayName: dialogUserDisplayName,
    strictAgentResolution: kipMode === "designer",
  })

  React.useEffect(() => {
    const hint = selection.draftComposeHint
    if (!hint) return
    setInput(hint)
    actions.clearDraftComposeHint()
  }, [selection.draftComposeHint, setInput, actions])

  const horizonThinkingLabel = React.useMemo(() => {
    if (!isDirectorMode || !isSending) return undefined
    if (directorSendPhase === "instrument" && activeBoardInstrument) {
      return `${directorInstrumentLabels[activeBoardInstrument] ?? activeBoardInstrument} is thinking…`
    }
    if (directorSendPhase === "director") {
      return `${defaultAgentName} is thinking…`
    }
    return undefined
  }, [isDirectorMode, isSending, directorSendPhase, activeBoardInstrument, defaultAgentName, directorInstrumentLabels])

  setMessagesRef.current = setMessages

  // ── useDraftContext — IDE draft–session linking ─────────────────────────────
  useDraftContext({
    selectedDraftId: kipMode === "ide" ? selectedDraftId : null,
    domainId,
    agentId: kipMode === "ide" ? agentId : null,
    activeSessionId: dialogSessionId,
    onActiveSessionIdChange: kipMode === "ide" ? handleSessionChange : undefined,
  })

  const idleMessages = React.useMemo<AgentDialogueMessage[]>(
    () => {
      if (isRealmHomeArrival) {
        return [
          buildRealmArrivalMessage(
            realmFeed?.remarks ?? "Welcome back.",
            realmFeed?.counts ?? { drafts: 0, sessions: 0, moments: 0, domains: 0 },
            realmFeedLoading,
          ),
        ]
      }
      if (kipMode === "ide") {
        return [{
          id: "kip-greeting",
          role: "agent",
          content: "I'm here. What are we building?",
          createdAt: new Date().toISOString(),
        }]
      }
      if (guidedArrivalActive && guidedArrival?.greeting) {
        return [{
          id: "arrival-greeting",
          role: "agent",
          content: guidedArrival.greeting,
          createdAt: new Date().toISOString(),
        }]
      }
      return []
    },
    [
      isRealmHomeArrival,
      realmFeed?.remarks,
      realmFeed?.counts,
      realmFeedLoading,
      kipMode,
      guidedArrivalActive,
      guidedArrival?.greeting,
    ],
  )

  const handleDialogSubmit = React.useCallback(
    async (
      event: React.FormEvent,
      payload: { content: string; displayContent?: string; attachments?: AgentAttachment[] },
    ) => {
      await sendMessage(event, payload)
      if (guidedArrivalActive && guidedArrival) {
        void guidedArrival.acknowledge()
      }
    },
    [sendMessage, guidedArrivalActive, guidedArrival],
  )

  useSelectionSessionResume({
    domainId,
    domainSlug,
    kipAgentId: agentId,
    kipMode,
    selectedDialogId,
    selectedJourneyId,
    selectedKeeperId,
    selectedDraftId,
    selectedAgentId: boardSelectedAgentId,
    activeSessionId: dialogSessionId,
    isSending,
    onSessionSelect: handleSessionChange,
    fetchMessages,
    setMessages,
    idleMessages,
  })

  // ── Director mode: pin board instruments for dialog delegation only ─────────
  const handleBoardInstrumentInvoke = React.useCallback(
    (slug: string) => {
      if (isLeadLedDomain && kipMode === "domain") {
        const slugKey = canonicalAgentSlug(slug)
        if (slugKey === KIP_FALLBACK_SLUG) {
          actions.onSetActiveBoardInstrument(
            kipSupportInvoked ? KIP_SUPPORT_DISENGAGED : null,
          )
        }
        return
      }
      if (!isDirectorMode) return
      if (slug === directorAgentSlug) {
        actions.onSetActiveBoardInstrument(null)
        return
      }
      if (normalizedDomainLeadSlug && slug === normalizedDomainLeadSlug) {
        setComposerLeadSlug(slug)
        actions.onSetActiveBoardInstrument(slug)
        return
      }
      const next = activeBoardInstrument === slug ? null : slug
      actions.onSetActiveBoardInstrument(next)
    },
    [
      isLeadLedDomain,
      kipMode,
      kipSupportInvoked,
      isDirectorMode,
      directorAgentSlug,
      normalizedDomainLeadSlug,
      activeBoardInstrument,
      actions,
    ],
  )

  const handleRemoveComposerAgent = React.useCallback(
    (slug: string) => {
      if (slug !== composerLeadSlug) return
      setComposerLeadSlug(null)
      if (normalizedDomainLeadSlug && slug === normalizedDomainLeadSlug) {
        actions.onSetActiveBoardInstrument(normalizedDomainLeadSlug)
        return
      }
      if (activeBoardInstrument === slug) {
        actions.onSetActiveBoardInstrument(null)
      }
    },
    [composerLeadSlug, normalizedDomainLeadSlug, activeBoardInstrument, actions],
  )

  const handleToolInvoke = React.useCallback(
    (tool: ToolSlug) => {
      handleBoardInstrumentInvoke(tool)
    },
    [handleBoardInstrumentInvoke],
  )

  // IDE Board owns Kip session lifecycle (instruments do not swap the dialog agent).
  React.useEffect(() => {
    if (kipMode !== "ide" || !agentId) return
    if (frameCtx?.isResolving) return
    if (activeSessionId) return

    const resolvedDomainId =
      domainId && !String(domainId).startsWith("fallback-") ? domainId : undefined

    if (!resolvedDomainId) return

    let cancelled = false
    void (async () => {
      try {
        const { sessionId } = await resumeOrCreateBoardSession({
          domainId: resolvedDomainId,
          agentId,
          board: "ide",
          frame: "conversation",
          dialogSubject: "domain",
          dialogScope: audience === "admin" ? "admin" : "keeper",
          domainSlug,
          sessionName: `Session · ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`,
        })
        if (cancelled) return
        handleSessionChange(sessionId)
        await fetchMessages(sessionId)
      } catch {
        /* composer stays disabled until session resolves */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    kipMode,
    agentId,
    activeSessionId,
    domainId,
    domainSlug,
    audience,
    frameCtx?.isResolving,
    handleSessionChange,
    fetchMessages,
  ])

  // ── designer mode: sync liveDomainFrame from shell to context ────────────
  React.useEffect(() => {
    if (kipMode !== "designer" || !designerDraftCtx) return
    if (domainFrame) designerDraftCtx.setLiveDomainFrame(domainFrame as DomainFrameJson)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kipMode, domainFrame])

  // ── designer mode: resume or create session per board definition ───────────
  React.useEffect(() => {
    if (kipMode !== "designer") return
    if (designerDraftCtx) {
      designerDraftCtx.setDraftSpecJson(null)
      designerDraftCtx.setDraftId(null)
      designerDraftCtx.setPublishSuccess(false)
    }

    if (!domainId || !designerFocusKey || !agentId) {
      handleSessionChange(null)
      setMessages([])
      return
    }

    let cancelled = false
    const focusKey = designerFocusKey
    const aid = agentId

    void (async () => {
      try {
        const { sessionId } = await resumeOrCreateBoardSession({
          domainId,
          agentId: aid,
          board: "designer",
          frame: focusKey,
          dialogSubject: "boardDef",
          dialogScope: "admin",
          domainSlug,
          sessionName: BOARD_DEFINITIONS[focusKey]?.displayName ?? focusKey,
        })

        if (cancelled) return

        handleSessionChange(sessionId)
        await fetchMessages(sessionId)
      } catch {
        if (!cancelled) {
          handleSessionChange(null)
          setMessages([])
        }
      }
    })()

    return () => { cancelled = true }
  }, [
    kipMode,
    designerFocusKey,
    domainId,
    domainSlug,
    agentId,
    designerDraftCtx,
    handleSessionChange,
    fetchMessages,
    setMessages,
  ])

  // ── ide mode: session title save ──────────────────────────────────────────
  const handleSaveTitle = React.useCallback(
    async (title: string) => {
      if (!dialogSessionId || !agentId) return
      try {
        await KipApi.updateSessionMetadata(agentId, dialogSessionId, { session_name: title })
      } catch {
        // best-effort — title save does not block the conversation
      }
    },
    [dialogSessionId, agentId],
  )

  // ── Banner props — the only mode branch ───────────────────────────────────
  const hasDraftSpec = designerDraftCtx ? designerDraftCtx.draftSpecJson !== null : false

  const bannerContext = React.useMemo(() => {
    if (selectedDialogId) {
      return {
        primary: dialogTitle ?? "Dialog",
        secondary: domainName || undefined,
        sessionLabel: "Session" as const,
      }
    }
    if (selectedJourneyId) {
      return {
        primary: journeyName ?? "Journey",
        secondary: keeperName ?? domainName ?? undefined,
        sessionLabel: "Session" as const,
      }
    }
    if (selectedKeeperId) {
      return {
        primary: keeperName ?? "Keeper",
        secondary: domainName || undefined,
        sessionLabel: "Session" as const,
      }
    }
    if (selectedDraftId) {
      return {
        primary: draftTitle ?? "Draft",
        secondary: domainName || undefined,
        sessionLabel: "Session" as const,
      }
    }
    if (selectedAgentId && kipMode !== "agent") {
      return {
        primary: selectedAgentRecord?.name ?? def.conversation.agentName,
        secondary: "Agent",
        sessionLabel: "Session" as const,
      }
    }

    switch (kipMode) {
      case "ide":
        return {
          primary: defaultAgentName,
          secondary: activeBoardInstrument
            ? (directorInstrumentLabels[activeBoardInstrument] ?? activeBoardInstrument)
            : (journeyName ?? keeperName ?? domainName ?? undefined),
          sessionLabel: "Session" as const,
        }
      case "agent":
        if (selection.trainingMode) {
          const frameLabel = voicePromptSectionDef(
            selection.activeTrainingFrame,
          ).stripLabel
          return {
            primary: frameLabel,
            secondary: selectedAgentRecord?.name ?? def.conversation.agentName,
            prelude: "Exit Training",
            onPreludeClick: () => actions.onExitTrainingMode(),
            sessionLabel: "Training" as const,
          }
        }
        if (usingSelectedNonDefaultAgent && selectedAgentRecord) {
          return {
            primary: selectedAgentRecord.name,
            secondary: def.displayName,
            ...(selectedAgentRecord.purpose ? { prelude: selectedAgentRecord.purpose } : {}),
            sessionLabel: "Session" as const,
          }
        }
        return {
          primary: selectedDraftId ? "Draft" : "Conversation",
          secondary: "Agent Studio",
        }
      case "designer": {
        const boardDefLabel = selectedBoardDefId
          ? (BOARD_DEFINITIONS[selectedBoardDefId]?.displayName ?? selectedBoardDefId)
          : null
        return {
          primary: dialogAgentDisplayName,
          secondary: designerFocusKey
            ? (BOARD_DEFINITIONS[designerFocusKey]?.displayName ?? designerFocusKey)
            : boardDefLabel ?? "Treatment",
          ...(hasDraftSpec ? { prelude: "Draft in progress" } : {}),
        }
      }
      case "domain":
      default: {
        const df = domainFrame as {
          theme?: { wordmark?: string; tagline?: string; colors?: { primary?: string } }
          cover?: { card?: { tagLine?: string } }
        } | null
        const wordmark = df?.theme?.wordmark?.trim() || domainName?.trim() || ""
        const tagline = df?.cover?.card?.tagLine?.trim() || df?.theme?.tagline?.trim() || undefined
        const primaryAccent = df?.theme?.colors?.primary?.trim() || undefined
        const statJourneys = journeyCount === null ? "—" : String(journeyCount)
        const statMoments = momentCount === null ? "—" : momentCount >= 50 ? "50+" : String(momentCount)
        return {
          primary: wordmark,
          ...(tagline ? { tagline } : {}),
          ...(activeBoardInstrument
            ? {
                secondary:
                  directorInstrumentLabels[activeBoardInstrument] ?? activeBoardInstrument,
              }
            : {}),
          livePulse: { color: primaryAccent },
          stats: [
            { label: "Journeys", value: statJourneys },
            { label: "Moments", value: statMoments },
          ] as const,
        }
      }
    }
  }, [
    kipMode,
    keeperName,
    journeyName,
    domainName,
    selectedDialogId,
    selectedJourneyId,
    selectedKeeperId,
    selectedDraftId,
    selectedAgentId,
    dialogTitle,
    draftTitle,
    selectedAgentRecord,
    def.conversation.agentName,
    def.displayName,
    usingSelectedNonDefaultAgent,
    domainFrame,
    designerFocusKey,
    dialogAgentDisplayName,
    selectedBoardDefId,
    hasDraftSpec,
    activeBoardInstrument,
    defaultAgentName,
    directorInstrumentLabels,
    journeyCount,
    momentCount,
    selection.trainingMode,
    selection.activeTrainingFrame,
    actions,
  ])

  // ── modelProvider — ide mode reads from domain frame ──────────────────────
  const modelProvider = kipMode === "ide"
    ? ((domainFrame as { kip?: { model?: string } } | null)?.kip?.model ?? null)
    : null

  // Composer gate: requires a resolved agent id (Lead via slug lookup, or nav-selected id).
  const dialogAgentId =
    agentId ??
    (usingSelectedNonDefaultAgent && activeDialogAgentId ? activeDialogAgentId : null)
  const composerDisabled = !dialogAgentId

  const handleConfirmDraftUpdate = React.useCallback(
    (
      draftId: string,
      payload: { title?: string; summary?: string; status?: string; spec?: unknown },
    ) => {
      if (!domainId) return
      void KipApi.updateDraft(domainId, draftId, {
        ...payload,
        status: payload.status as KipDraftStatus | undefined,
      }).then(() => {
        onDraftListRefresh?.()
        onDraftSelect(draftId)
        actions.bumpDraftPresence()
      })
    },
    [domainId, onDraftListRefresh, onDraftSelect, actions],
  )

  const [applyingTreatmentProposal, setApplyingTreatmentProposal] = React.useState(false)

  const handleApplyTreatmentProposal = React.useCallback(
    async (proposal: DomainFrameTreatment) => {
      if (!domainSlug) return
      setApplyingTreatmentProposal(true)
      try {
        await patchDomainTreatment(domainSlug, proposal)
        await reloadDomainFrame()
        actions.bumpDraftPresence()
      } finally {
        setApplyingTreatmentProposal(false)
      }
    },
    [domainSlug, reloadDomainFrame, actions],
  )

  const {
    acceptedDraftPointIds,
    acceptingDraftPointId,
    acceptDraftPoint: handleAcceptDraftPoint,
  } = useDraftPointAccept({
    domainId,
    onDraftListRefresh,
    onDraftSelect,
    bumpDraftPresence: actions.bumpDraftPresence,
    bumpDraftNav: actions.bumpDraftNav,
    setMessages,
    setError,
  })

  const handleComposerFileUpload = React.useCallback(
    async (file: File) => {
      if (!domainId || !user?.id) {
        throw new Error("Sign in on a domain board to attach files.")
      }
      const url = await uploadLibraryFile({
        domainId,
        userId: user.id,
        file,
      })
      return { url, name: file.name }
    },
    [domainId, user?.id],
  )

  const handleCommitAttachmentsToLibrary = React.useCallback(
    async (attachments: ReadonlyArray<{ url: string; name: string; libraryItemId?: string }>) => {
      if (!domainId || !user?.id || attachments.length === 0) return
      const committed = await commitComposerAttachmentsToLibrary({
        domainId,
        userId: user.id,
        attachments,
        activeKeeperId: selection.selectedKeeperId ?? selectedKeeperId ?? null,
        activeAgentId: selection.selectedAgentId ?? selectedAgentId ?? null,
      })
      const last = committed[committed.length - 1]
      if (last?.libraryItemId) {
        actions.onLibraryItemSelect(last.libraryItemId)
      }
      actions.bumpLibraryNav()
    },
    [
      domainId,
      user?.id,
      selection.selectedKeeperId,
      selection.selectedAgentId,
      selectedKeeperId,
      selectedAgentId,
      actions,
    ],
  )

  const handleKeepAsMoment = React.useCallback(
    async (payload: KeepAsMomentPayload) => {
      if (!domainSlug) {
        throw new Error("Domain context is required to keep moments")
      }
      try {
        const bodyParts: string[] = []
        if (payload.narrative.trim()) bodyParts.push(payload.narrative.trim())
        if (payload.imageUrl) {
          bodyParts.push(`![${payload.title}](${payload.imageUrl})`)
        }
        const draft = await createDraftMoment({
          domainSlug,
          title: payload.title,
          body: bodyParts.join("\n\n") || payload.title,
        })
        const kept = await keepMoment(draft.id, {
          domainSlug,
          journeyId: selectedJourneyId ?? undefined,
          keeperId: selectedKeeperId ?? undefined,
          imageUrl: payload.libraryItemId ? undefined : payload.imageUrl,
          libraryItemId: payload.libraryItemId,
        })
        actions.bumpLibraryNav?.()
        const libraryItemId = payload.libraryItemId ?? kept.data.libraryItemId
        if (libraryItemId) {
          actions.onLibraryItemSelect(libraryItemId)
        }
        onJourneyListRefresh?.()
        onMomentSelect(draft.id)
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Could not keep this as a moment. Try again."
        setError(message)
        throw err
      }
    },
    [
      domainSlug,
      selectedJourneyId,
      selectedKeeperId,
      onJourneyListRefresh,
      onMomentSelect,
      setError,
      actions,
    ],
  )

  const handleGlossThreadUpdate = React.useCallback(
    (messageId: string, threads: GlossThread[]) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, glossThreads: threads } : m)),
      )
    },
    [setMessages],
  )

  const realmInvitationActions = React.useMemo<RealmInvitationActions>(
    () => ({
      onSessionSelect: onSessionSelect ?? actions.onSessionSelect,
      onDialogSelect: actions.onDialogSelect,
      onDraftSelect: onDraftSelect ?? actions.onDraftSelect,
      bumpDialogNav: actions.bumpDialogNav,
      bumpDraftNav: actions.bumpDraftNav,
      focusChronicleFeed: () => realmArrival?.setChronicleView("feed"),
    }),
    [
      actions.bumpDialogNav,
      actions.bumpDraftNav,
      actions.onDialogSelect,
      actions.onDraftSelect,
      actions.onSessionSelect,
      onDraftSelect,
      onSessionSelect,
      realmArrival,
    ],
  )

  const handleArrivalInvitation = React.useCallback(
    (id: RealmInvitationId) => {
      applyRealmInvitation(id, realmFeed, realmInvitationActions)
    },
    [realmFeed, realmInvitationActions],
  )

  const realmComposerPlaceholder = isRealmHomeArrival
    ? `Message ${dialogAgentDisplayName}`
    : undefined

  const dialogMessages = React.useMemo(() => {
    if (!isRealmHomeArrival) return messages
    if (messages.some((m) => m.role === "user")) return messages
    if (messages.some(isRealmArrivalMessage)) return messages
    return [
      buildRealmArrivalMessage(
        realmFeed?.remarks ?? "Welcome back.",
        realmFeed?.counts ?? { drafts: 0, sessions: 0, moments: 0, domains: 0 },
        realmFeedLoading,
      ),
      ...messages,
    ]
  }, [
    isRealmHomeArrival,
    messages,
    realmFeed?.remarks,
    realmFeed?.counts,
    realmFeedLoading,
  ])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* DraftBar — designer mode only, above the dialog frame */}
      {kipMode === "designer" && designerDraftCtx && (
        <DraftBar
          hasDraftSpec={hasDraftSpec}
          publishSuccess={designerDraftCtx.publishSuccess}
          draftId={designerDraftCtx.draftId}
          isPublishing={designerDraftCtx.isPublishing}
          onPublish={handlePublish}
        />
      )}

      <KeeperDialogFrame
        bannerContext={bannerContext}
        sessionId={dialogSessionId}
        soleActive={false}
        modelProvider={modelProvider}
        onSaveTitle={kipMode === "ide" ? handleSaveTitle : undefined}
        showServiceBar={def.conversation.showServiceBar}
        onServiceOpen={kipMode === "ide" ? (service) => onServiceOpen(service ?? "vercel") : undefined}
        onToolInvoke={isDirectorMode && kipMode === "ide" ? handleToolInvoke : undefined}
        activeToolSlug={isDirectorMode && kipMode === "ide" ? activeBoardInstrument : null}
        boardInstruments={
          isLeadLedDomain && kipMode === "domain"
            ? domainCollaborationInstruments
            : isDirectorMode && kipMode === "domain"
              ? domainDirectorBoardInstruments
              : isDirectorMode && kipMode === "designer"
                ? designerBoardInstruments
                : undefined
        }
        onBoardInstrumentInvoke={
          (isLeadLedDomain && kipMode === "domain")
          || (isDirectorMode && (kipMode === "domain" || kipMode === "designer"))
            ? handleBoardInstrumentInvoke
            : undefined
        }
        activeBoardInstrumentSlug={
          isLeadLedDomain && kipMode === "domain"
            ? (kipSupportInvoked ? KIP_FALLBACK_SLUG : KIP_SUPPORT_DISENGAGED)
            : isDirectorMode && (kipMode === "domain" || kipMode === "designer")
              ? activeBoardInstrument
              : null
        }
        boardInstrumentsCollaborationMode={
          isLeadLedDomain && kipMode === "domain" ? true : undefined
        }
        composerAgents={composerAgentChips.length > 0 ? composerAgentChips : undefined}
        onRemoveComposerAgent={
          composerAgentChips.length > 0 ? handleRemoveComposerAgent : undefined
        }
        showToolbarAgentIdentity={showComposerToolbarAgentIdentity}
        thinkingStatusLabel={horizonThinkingLabel}
        thinkingSteps={thinkingSteps}
        messages={dialogMessages}
        isSending={isSending}
        error={error}
        agentName={dialogAgentDisplayName}
        userName={dialogUserDisplayName}
        echoAgentName={isLeadLedDomain ? KIP_FALLBACK_DISPLAY_NAME : defaultAgentName}
        agentBoardMessaging={agentBoardMessaging}
        onOpenDraft={onDraftSelect}
        onOpenMoment={onMomentSelect}
        onOpenJourney={(id) => onJourneySelect(id)}
        onOpenLibraryItem={(id) => actions.onLibraryItemSelect(id)}
        onKeepAsMoment={domainSlug ? handleKeepAsMoment : undefined}
        onOpenSoleMemory={(memoryCardId) => actions.onSoleMemorySelect(memoryCardId)}
        onConfirmDraftUpdate={domainId ? handleConfirmDraftUpdate : undefined}
        onApplyTreatmentProposal={
          kipMode === "designer" && domainSlug ? handleApplyTreatmentProposal : undefined
        }
        applyingTreatmentProposal={applyingTreatmentProposal}
        onAcceptDraftPoint={domainId ? handleAcceptDraftPoint : undefined}
        acceptedDraftPointIds={acceptedDraftPointIds}
        acceptingDraftPointId={acceptingDraftPointId}
        agentBubbleFullWidth={kipMode !== "ide"}
        agentId={dialogAgentId}
        domainId={domainId ?? null}
        dialogueMode={def.conversation.dialogueMode === "domain" ? "domain" : undefined}
        inputValue={input}
        onInputChange={setInput}
        onSubmit={handleDialogSubmit}
        onComposerFileUpload={domainId && user?.id ? handleComposerFileUpload : undefined}
        onCommitAttachmentsToLibrary={
          domainId && user?.id ? handleCommitAttachmentsToLibrary : undefined
        }
        activeSessionId={dialogSessionId}
        disabled={composerDisabled}
        inputPlaceholder={realmComposerPlaceholder}
        onArrivalInvitation={isRealmHomeArrival ? handleArrivalInvitation : undefined}
        glossConfig={{
          agentId: dialogAgentId,
          sessionId: dialogSessionId,
          domainId: domainId ?? null,
          domainSlug: domainSlug ?? null,
          agentContext: agentContext as Record<string, unknown> | undefined,
          agentName: dialogAgentDisplayName,
          onUpdateMessageThreads: handleGlossThreadUpdate,
        }}
      />
    </div>
  )
}
