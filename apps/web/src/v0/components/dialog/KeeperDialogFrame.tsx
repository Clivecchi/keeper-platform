"use client"

/**
 * KeeperDialogFrame
 *
 * Shared conversation shell used by IDE Board, Agent Board, and Domain Board.
 *
 * Canonical surfaces (product language):
 *   Header Bar   — expandable breadcrumb / session meta (`.dialog-header-banner`)
 *   Dialog Space — scrollable messages above the Horizon (`.dialog-message-zone`)
 *   Composer        — user input floor; two states via `data-composer-state`:
 *     composing    — input only; optional post-run summary atop composer
 *     working      — Broadcast Strip (live + ticker) + input
 *
 * While sending: Broadcast Strip expands with live beat + prior story beats.
 * After the reply lands: strip collapses; a one-line dialogic summary sits atop
 * the composer (`.dialog-composer-horizon`).
 *
 * Message logic and API calls live in the Board; this file owns layout only.
 */

import * as React from "react"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import type { AgentComposerProps, AgentAttachment, PendingAttachment, ComposerSubmitPayload } from "../../../components/agent/AgentComposer"
import { isPastedSupportingDoc } from "../../../components/agent/composerSupporting"
import { DialogueMessageList } from "../../../components/agent/DialogueMessageList"
import type { KeepAsMomentPayload } from "../../../components/kip/ActionReceiptCard"
import type { AgentDialogueMessage } from "../../../components/agent/types"
import { IntegratedServicesBar } from "../../boards/components/IntegratedServicesBar"
import {
  CastCueBar,
  type CastMemberChip,
  type CastCueSelectionMode,
} from "../../boards/components/CastCueBar"
import {
  DirectorCastHeader,
  type CastCandidate,
} from "../../boards/components/DirectorCastHeader"
import { RealmCastAccessActions } from "../../realm/DialogCastBar"
import type { AgentBoardMessaging } from "../../data/domain-frame.types"
import { installConsoleDiagCapture } from "../../../lib/consoleDiagCapture"
import { ComposerDebugToolbar } from "./ComposerDebugToolbar"
import { DialogDebugOverlay } from "./DialogDebugOverlay"
import { DialogScrollHint } from "./DialogScrollHint"
import { DialogScrollRail } from "./DialogScrollRail"
import { DialogBroadcastStrip } from "./DialogBroadcastStrip"
import { DialogUploadStream } from "./DialogUploadStream"
import {
  composeHorizonBeat,
  dialogicRunSummary,
  type DialogThinkingStep,
} from "./dialogThinking"
import { useTalkMode } from "../../../hooks/useTalkMode"
import { useIsMobile } from "../../../mobile/hooks/useIsMobile"
import { GlossProvider, type GlossRunConfig } from "../../../components/gloss/GlossProvider"
import type { GlossThread } from "@keeper/shared"
import "../../../components/gloss/gloss.css"

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceSlug = "railway" | "vercel" | "github"
type ToolSlug = "cloud" | "rendr"
type ServiceStatus = "connected" | "warning" | "disconnected"

/**
 * BannerContext
 *
 * Structured replacement for the five individual banner props:
 * keeperName, journeyName, pathName, pathPrelude, sessionTitle.
 *
 * The Header Bar renders Talking in / Working on when those coordinates
 * are provided. Otherwise: primary · secondary · tertiary + prelude.
 * Domain idle still uses the livePulse wordmark layout.
 *
 * Callers assemble this from board selection. KeeperDialogFrame renders the shape.
 */
export interface BannerContext {
  /** Conversation you are in — Dialog or Session. */
  talkingIn?: { title: string; kindLabel: string }
  /** Chronicle / action target — Document, Draft, or other work subject. */
  workingOn?: { title: string; kindLabel: string }
  /** Domain name — belongs on the Header Bar (not SOLE, not a repeated title). */
  domainLabel?: string
  /** Lead label — wordmark / agent eyebrow when Talking in / Working on is not set. */
  primary?: string
  /** Second breadcrumb segment — was journeyName / session name / dialog title. */
  secondary?: string
  /** Third breadcrumb segment — was pathName. */
  tertiary?: string
  /** Italic sub-line below the breadcrumb — was pathPrelude. */
  prelude?: string
  /** When set, prelude renders as a tappable control (e.g. Exit Training). */
  onPreludeClick?: () => void
  /** Editable session label in the expanded meta row — was sessionTitle. */
  sessionLabel?: string
  /**
   * Domain-mode fields — when present, Zone 1 renders the domain identity layout
   * (serif wordmark, tagline, live pulse dot, stats) instead of the breadcrumb layout.
   */
  /** Sub-line below the wordmark (tagline from domain frame). */
  tagline?: string
  /** When set, renders the live pulse dot + "Live" label. Optional accent color. */
  livePulse?: { color?: string }
  /** Right-side stat pairs shown in domain mode (e.g. Journeys, Moments). */
  stats?: ReadonlyArray<{ label: string; value: string }>
}

export interface KeeperDialogFrameProps {
  // ── Header context — frosted breadcrumb banner ────────────────────────────
  bannerContext?: BannerContext

  // ── Session context — absorbed from SessionBannerCard (IDE Board only) ────
  sessionId?: string | null
  soleActive?: boolean
  modelProvider?: string | null
  onOpenCockpit?: () => void
  onSaveTitle?: (title: string) => void

  // ── Service bar — bottom zone, IDE Board only ─────────────────────────────
  showServiceBar?: boolean
  onServiceOpen?: (service?: ServiceSlug) => void
  onToolInvoke?: (tool: ToolSlug) => void
  activeToolSlug?: ToolSlug | null
  /**
   * Director-mode cast — header shows identity (DirectorCastHeader); composer
   * CastCueBar is the invoke control. Same roster array for both.
   */
  boardCast?: ReadonlyArray<CastMemberChip>
  onCastCueToggle?: (slug: string) => void
  /** IDE/Designer single-swap pin. */
  activeCastMemberSlug?: string | null
  /** Domain/Realm multi-select cued Cast members. */
  cuedCastMemberSlugs?: ReadonlyArray<string>
  castEyebrow?: string
  /** Header cast eyebrow — defaults to "Cast". */
  castHeaderEyebrow?: string
  /** Cueing mode label shown next to the header cast eyebrow (e.g. "Cueing: Directed"). */
  cueingLabel?: string
  castCueSelectionMode?: CastCueSelectionMode
  /** Lead chip always engaged at composer (default true). */
  castLeadLocked?: boolean
  /** Lead-led domain: footer toggles support-agent inclusion, not dialog lead. */
  castCollaborationMode?: boolean
  /**
   * Realm trailing access chrome (Invite / Get key / Manage) on the header cast strip.
   */
  castAccessActions?: {
    domainId: string | null
    onInvite?: () => void
    onManageAccess?: () => void
  }
  /** Cross-domain cast Add — candidates from domains the user administers. */
  castCandidates?: ReadonlyArray<CastCandidate>
  onEnableCastCandidate?: (homeDomainId: string) => void | Promise<void>
  enablingCast?: boolean
  castAddEnabled?: boolean
  /** Overrides Horizon summary while sending; otherwise derived from thinkingSteps. */
  thinkingStatusLabel?: string
  /** Run trace for Broadcast Strip while sending. */
  thinkingSteps?: readonly DialogThinkingStep[]
  railwayStatus?: ServiceStatus
  vercelStatus?: ServiceStatus
  githubStatus?: ServiceStatus

  // ── DialogueMessageList pass-through ──────────────────────────────────────
  messages: AgentDialogueMessage[]
  isSending: boolean
  error: string | null
  onOpenDraft?: (draftId: string) => void
  onOpenMoment?: (momentId: string) => void
  onOpenJourney?: (journeyId: string) => void
  onOpenLibraryItem?: (libraryItemId: string) => void
  onOpenChronicleChip?: (chip: {
    dialogId: string
    dialogTitle: string
    actor: string
    anchor?: {
      dialogId?: string
      manuscriptDraftId?: string
      pointId?: string
      breadcrumb?: string[]
    }
  }) => void
  onOpenSoleMemory?: (memoryCardId: string) => void
  onKeepAsMoment?: (payload: KeepAsMomentPayload) => void | Promise<void>
  onConfirmDraftUpdate?: (
    draftId: string,
    payload: { title?: string; summary?: string; status?: string; spec?: unknown },
  ) => void
  onApplyTreatmentProposal?: (
    proposal: import("../../data/domain-frame.types").DomainFrameTreatment,
  ) => void
  applyingTreatmentProposal?: boolean
  onAcceptDraftPoint?: (draftId: string, pointId: string) => void
  acceptedDraftPointIds?: ReadonlySet<string>
  acceptingDraftPointId?: string | null
  agentName?: string
  /** Display name for the current user — shown on user message bubbles. */
  userName?: string
  /** Invoked collaborators on composer toolbar (Domain lead agent, etc.). */
  composerAgents?: AgentComposerProps["composerAgents"]
  onRemoveComposerAgent?: AgentComposerProps["onRemoveComposerAgent"]
  /** When false, agent identity is shown in the footer Agents bar only. */
  showToolbarAgentIdentity?: boolean
  /** Echo attribution fallback — board def agentName (def.conversation.agentName) */
  echoAgentName?: string
  agentBubbleFullWidth?: boolean
  agentBoardMessaging?: AgentBoardMessaging
  onArrivalInvitation?: (id: import("../../../v0/realm/realmInvitations").RealmInvitationId) => void

  // ── AgentComposer pass-through ────────────────────────────────────────────
  agentId: string | null
  domainId: string | null
  dialogueMode?: AgentComposerProps["dialogueMode"]
  inputValue: string
  onInputChange: (value: string) => void
  onSubmit: AgentComposerProps["onSubmit"]
  /** Stage blob upload for Thinking Space — Library commit on send via onCommitAttachmentsToLibrary. */
  onComposerFileUpload?: AgentComposerProps["onComposerFileUpload"]
  /** @deprecated Use onComposerFileUpload */
  onLibraryFileUpload?: AgentComposerProps["onComposerFileUpload"]
  /** Create Library items for staged attachments when the message sends. */
  onCommitAttachmentsToLibrary?: (
    attachments: ReadonlyArray<PendingAttachment>,
  ) => Promise<void>
  activeSessionId: string | null
  disabled?: boolean
  inputPlaceholder?: string

  // ── Optional Dialog zone override ─────────────────────────────────────────
  /** When provided, renders in Zone 2 instead of DialogueMessageList (dialog mode only). */
  dialogContent?: React.ReactNode

  // ── Feed / Dialog mode ────────────────────────────────────────────────────
  /**
   * Controls the center panel mode.
   * 'feed'   — hides the Banner; renders feedContent in Zone 2.
   * 'dialog' — shows the Banner; renders DialogueMessageList (or dialogContent) in Zone 2.
   * Default: 'dialog'. IDE Board and Agent Board omit this prop — behavior unchanged.
   */
  mode?: 'feed' | 'dialog'
  /** Renders in Zone 2 when mode === 'feed'. */
  feedContent?: React.ReactNode
  /** When provided and mode === 'dialog', shows a ← Commons back affordance in the Banner. */
  onReturnToFeed?: () => void

  /** Mobile Universal Kip — three full-screen stages: composing, thinking, response. */
  dialogLayout?: "default" | "mobile-staged"
  mobileDialogStage?: "composing" | "thinking" | "response"
  onComposerFocusChange?: (focused: boolean) => void
  /** Renders between Dialog Space and Composer in mobile response stage (e.g. Text / Chronicle toggle). */
  mobileResponseToolbar?: React.ReactNode
  /**
   * When true on mobile, suppress the domain livePulse identity banner —
   * Playbill owns identity/location (one top bar).
   */
  suppressMobileDomainBanner?: boolean
  /** When true, composer shows mic for speech-to-text (confirm before send). */
  talkMode?: boolean

  /** Inline Gloss — anchored sub-dialog on discrete message content */
  glossConfig?: GlossRunConfig & {
    onUpdateMessageThreads: (messageId: string, threads: GlossThread[]) => void
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KeeperDialogFrame({
  // Header
  bannerContext,
  // Session context
  sessionId,
  soleActive: _soleActive,
  modelProvider,
  onOpenCockpit,
  onSaveTitle,
  // Service bar
  showServiceBar = false,
  onServiceOpen,
  onToolInvoke,
  activeToolSlug = null,
  boardCast,
  onCastCueToggle,
  activeCastMemberSlug = null,
  cuedCastMemberSlugs = [],
  castEyebrow = "Agents",
  castHeaderEyebrow = "Cast",
  cueingLabel,
  castCueSelectionMode = "single",
  castLeadLocked = true,
  castCollaborationMode = false,
  castAccessActions,
  castCandidates,
  onEnableCastCandidate,
  enablingCast = false,
  castAddEnabled = true,
  thinkingStatusLabel,
  thinkingSteps = [],
  railwayStatus = "disconnected",
  vercelStatus = "disconnected",
  githubStatus = "disconnected",
  // DialogueMessageList
  messages,
  isSending,
  error,
  onOpenDraft,
  onOpenMoment,
  onOpenJourney,
  onOpenLibraryItem,
  onOpenChronicleChip,
  onOpenSoleMemory,
  onKeepAsMoment,
  onConfirmDraftUpdate,
  onApplyTreatmentProposal,
  applyingTreatmentProposal,
  onAcceptDraftPoint,
  acceptedDraftPointIds,
  acceptingDraftPointId,
  agentName = "Kip",
  userName,
  composerAgents,
  onRemoveComposerAgent,
  showToolbarAgentIdentity = true,
  echoAgentName,
  agentBubbleFullWidth = true,
  agentBoardMessaging,
  onArrivalInvitation,
  // AgentComposer
  agentId,
  domainId,
  dialogueMode = "domain",
  inputValue,
  onInputChange,
  onSubmit,
  onComposerFileUpload,
  onLibraryFileUpload,
  onCommitAttachmentsToLibrary,
  activeSessionId,
  disabled,
  inputPlaceholder,
  dialogContent,
  mode = 'dialog',
  feedContent,
  onReturnToFeed,
  dialogLayout = "default",
  mobileDialogStage,
  onComposerFocusChange,
  mobileResponseToolbar,
  suppressMobileDomainBanner = false,
  talkMode = false,
  glossConfig,
}: KeeperDialogFrameProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const broadcastStripRef = React.useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const [bannerExpanded, setBannerExpanded] = React.useState(false)
  const [dialogScrollInset, setDialogScrollInset] = React.useState(172)
  const [debugPanelOpen, setDebugPanelOpen] = React.useState(false)
  const [pendingAttachments, setPendingAttachments] = React.useState<PendingAttachment[]>([])
  const [isFileUploading, setIsFileUploading] = React.useState(false)
  const [isSubmittingMessage, setIsSubmittingMessage] = React.useState(false)
  const hasUploads = pendingAttachments.length > 0 || isFileUploading
  const isWorking = isSending || isFileUploading || isSubmittingMessage
  const showBroadcastStrip = mode !== "feed" && (isWorking || hasUploads)
  const showComposerFooter = mode !== "feed"
  /**
   * Adaptive mobile: Playbill is the sole top identity/location bar.
   * Suppress Dialog header banners entirely (domain LIVE + breadcrumb).
   * Dialog/Document context surfaces on the Chronicle strip instead.
   */
  const hideDomainIdentityBanner = isMobile && suppressMobileDomainBanner
  /** Mobile Domain banner: name + LIVE by default; tagline/stats behind expand. */
  const domainBannerCompact =
    isMobile && !!bannerContext?.livePulse && !hideDomainIdentityBanner
  const showDomainBannerDetails = !domainBannerCompact || bannerExpanded
  /** Response stage reclaims chrome — cast strip returns when composing. */
  const hideCastHeaderOnMobileResponse =
    isMobile
    && dialogLayout === "mobile-staged"
    && mobileDialogStage === "response"
  const toggleDebugPanel = React.useCallback(() => {
    setDebugPanelOpen((open) => !open)
  }, [])

  const mergeTalkTranscript = React.useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const existing = inputValue.trim()
      onInputChange(existing ? `${existing} ${trimmed}` : trimmed)
    },
    [inputValue, onInputChange],
  )

  const {
    state: talkState,
    isSupported: talkSupported,
    startListening,
    stopListening,
    error: talkError,
  } = useTalkMode({
    onTranscript: mergeTalkTranscript,
  })

  React.useEffect(() => {
    installConsoleDiagCapture()
  }, [])

  const measureDialogScrollInset = React.useCallback(() => {
    const broadcastHeight = broadcastStripRef.current?.offsetHeight ?? 0
    const fadeEl = scrollRef.current?.parentElement?.querySelector(
      ".dialog-fade-overlay",
    ) as HTMLElement | null
    const fadeHeight = fadeEl?.offsetHeight ?? 120
    setDialogScrollInset(broadcastHeight + fadeHeight)
  }, [])

  React.useLayoutEffect(() => {
    if (mode === "feed" || dialogContent) return
    measureDialogScrollInset()
    window.addEventListener("resize", measureDialogScrollInset)
    return () => window.removeEventListener("resize", measureDialogScrollInset)
  }, [mode, dialogContent, measureDialogScrollInset, isSending, isFileUploading, showBroadcastStrip])

  const getLatestScrollTop = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return 0
    const broadcastHeight = broadcastStripRef.current?.offsetHeight ?? 0
    const fadeEl = el.parentElement?.querySelector(
      ".dialog-fade-overlay",
    ) as HTMLElement | null
    const fadeHeight = fadeEl?.offsetHeight ?? 120
    const clearance = broadcastHeight + fadeHeight
    const maxScroll = el.scrollHeight - el.clientHeight
    return Math.max(0, maxScroll - clearance + broadcastHeight)
  }, [])

  const composerState: "composing" | "working" = isWorking ? "working" : "composing"

  const handleComposerSubmit = React.useCallback(
    async (event: React.FormEvent, options: ComposerSubmitPayload) => {
      if (isSubmittingMessage) return
      setIsSubmittingMessage(true)
      try {
        const libraryAttachments = pendingAttachments.filter((a) => !isPastedSupportingDoc(a))
        if (onCommitAttachmentsToLibrary && libraryAttachments.length > 0) {
          try {
            await onCommitAttachmentsToLibrary(libraryAttachments)
          } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to save attachments to Library.")
            return
          }
        }
        await onSubmit(event, options)
        setPendingAttachments([])
      } finally {
        setIsSubmittingMessage(false)
      }
    },
    [onSubmit, onCommitAttachmentsToLibrary, pendingAttachments, isSubmittingMessage],
  )

  const broadcastLiveLabel = React.useMemo(() => {
    if (isFileUploading) return "Uploading…"
    if (isSending) {
      return composeHorizonBeat(thinkingSteps, agentName, thinkingStatusLabel)
    }
    return ""
  }, [
    isFileUploading,
    isSending,
    thinkingStatusLabel,
    thinkingSteps,
    agentName,
  ])

  const postRunSummary = React.useMemo(() => {
    if (isWorking || thinkingSteps.length === 0) return null
    return dialogicRunSummary(thinkingSteps, agentName)
  }, [isWorking, thinkingSteps, agentName])

  // Auto-scroll so the newest message clears the Broadcast Strip + fade overlay
  React.useEffect(() => {
    if (mode === "feed" || dialogContent) return
    const el = scrollRef.current
    if (!el) return

    const run = () => {
      measureDialogScrollInset()
      const broadcastHeight = broadcastStripRef.current?.offsetHeight ?? 0
      const fadeEl = el.parentElement?.querySelector(
        ".dialog-fade-overlay",
      ) as HTMLElement | null
      const fadeHeight = fadeEl?.offsetHeight ?? 120
      const clearance = broadcastHeight + fadeHeight
      const maxScroll = el.scrollHeight - el.clientHeight
      el.scrollTop = Math.max(0, maxScroll - clearance + broadcastHeight)
    }

    requestAnimationFrame(run)
  }, [messages, isSending, dialogContent, mode, measureDialogScrollInset])

  const hasCoordinates = Boolean(bannerContext?.talkingIn || bannerContext?.workingOn)
  const hasBreadcrumb = bannerContext?.primary || bannerContext?.secondary || bannerContext?.tertiary
  const hasSessionMeta = Boolean(sessionId || onOpenCockpit || modelProvider)
  // Banner renders in dialog mode when there is context to show
  const showBanner = mode !== 'feed' && (!!hasCoordinates || !!hasBreadcrumb || !!bannerContext?.prelude || !!onReturnToFeed || hasSessionMeta)
  const showBannerEffective = showBanner && !hideDomainIdentityBanner

  const isMobileStaged = dialogLayout === "mobile-staged" && mode !== "feed"
  // Idle + thinking: pinned bubble. Focus/type: expanded (~2/3). Desktop unchanged.
  const mobileComposerSize =
    isMobileStaged && mobileDialogStage === "composing"
      ? "mobile-expanded"
      : isMobileStaged
        ? "mobile-compact"
        : "default"
  const hideMobileComposerFooter =
    isMobileStaged
    && (mobileDialogStage === "response" || mobileDialogStage === "thinking")

  return (
    <div
      className="keeper-dialog-frame"
      data-composer-state={mode === "feed" ? undefined : composerState}
      data-has-run-summary={postRunSummary ? "true" : undefined}
      data-has-uploads={hasUploads ? "true" : undefined}
      data-dialog-layout={isMobileStaged ? "mobile-staged" : undefined}
      data-mobile-dialog-stage={isMobileStaged ? mobileDialogStage : undefined}
    >

      {/* ── Header Bar — expandable breadcrumb; hidden in feed mode ─────────── */}
      {showBannerEffective && (
        <div
          className={[
            "dialog-header-banner",
            domainBannerCompact ? "dialog-header-banner--mobile-compact" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {bannerContext?.livePulse
            ? (
              /* Domain-mode banner: wordmark + live pulse; tagline/stats expand on mobile */
              <>
                <div className="dialog-banner-main-row" style={{ alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <p
                        className={[
                          "keeper-treatment-title font-serif font-semibold leading-tight truncate",
                          domainBannerCompact ? "text-[15px]" : "text-lg",
                        ].join(" ")}
                        style={{ color: "hsl(var(--theme-ink-primary))" }}
                      >
                        {bannerContext.primary}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          paddingLeft: 8,
                          borderLeft: "1px solid hsl(var(--theme-line-hairline))",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={
                            bannerContext.livePulse.color
                              ? {
                                  backgroundColor: bannerContext.livePulse.color,
                                  boxShadow: `0 0 0 2px color-mix(in srgb, ${bannerContext.livePulse.color} 35%, transparent)`,
                                }
                              : {
                                  backgroundColor: "hsl(var(--theme-border-strong))",
                                  boxShadow: "0 0 0 2px hsl(var(--theme-border-soft) / 0.6)",
                                }
                          }
                          aria-hidden
                        />
                        <span
                          className="text-[10px] font-semibold uppercase tracking-widest"
                          style={{ color: "hsl(var(--theme-ink-secondary))" }}
                        >
                          Live
                        </span>
                      </div>
                    </div>
                    {showDomainBannerDetails && bannerContext.tagline ? (
                      <p
                        className="text-xs leading-snug truncate mt-0.5"
                        style={{ color: "hsl(var(--theme-ink-secondary))" }}
                      >
                        {bannerContext.tagline}
                      </p>
                    ) : null}
                  </div>
                  {showDomainBannerDetails
                    && bannerContext.stats
                    && bannerContext.stats.length > 0 ? (
                    <dl
                      className="shrink-0 flex items-center gap-4 text-right"
                      style={{ color: "hsl(var(--theme-ink-secondary))" }}
                    >
                      {bannerContext.stats.map((s) => (
                        <div key={s.label}>
                          <dt className="text-[9px] font-semibold uppercase tracking-widest">
                            {s.label}
                          </dt>
                          <dd
                            className="text-sm font-medium tabular-nums"
                            style={{ color: "hsl(var(--theme-ink-primary))" }}
                          >
                            {s.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {domainBannerCompact ? (
                    <button
                      type="button"
                      className={`banner-chevron${bannerExpanded ? " open" : ""}`}
                      onClick={() => setBannerExpanded((v) => !v)}
                      aria-expanded={bannerExpanded}
                      aria-label={bannerExpanded ? "Collapse domain details" : "Expand domain details"}
                    >
                      ›
                    </button>
                  ) : null}
                </div>
                {domainBannerCompact && bannerExpanded && castAccessActions ? (
                  <div
                    className="dialog-banner-mobile-access flex flex-wrap items-center gap-3 px-0 pb-1.5 pt-1"
                    style={{ borderTop: "1px solid hsl(var(--theme-border-soft) / 0.35)" }}
                  >
                    <RealmCastAccessActions
                      domainId={castAccessActions.domainId}
                      onInvite={castAccessActions.onInvite}
                      onManageAccess={castAccessActions.onManageAccess}
                    />
                  </div>
                ) : null}
              </>
            )
            : (
              /* Header Bar — Talking in / Working on, or breadcrumb fallback */
              <>
                <div className="dialog-banner-main-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {onReturnToFeed && (
                      <button type="button" onClick={onReturnToFeed} className="dialog-back-to-feed">
                        ← Commons
                      </button>
                    )}
                    {hasCoordinates ? (
                      <div className="dialog-coordinates" aria-label="Talking in and Working on">
                        {bannerContext?.talkingIn && (
                          <div className="dialog-coordinate">
                            <span className="dialog-coordinate-label">
                              Talking in
                              <span className="dialog-coordinate-kind">{bannerContext.talkingIn.kindLabel}</span>
                            </span>
                            <span className="dialog-coordinate-title keeper-treatment-title">
                              {bannerContext.talkingIn.title}
                            </span>
                          </div>
                        )}
                        {bannerContext?.workingOn && (
                          <div className="dialog-coordinate">
                            <span className="dialog-coordinate-label">
                              Working on
                              <span className="dialog-coordinate-kind">{bannerContext.workingOn.kindLabel}</span>
                            </span>
                            <span className="dialog-coordinate-title keeper-treatment-title">
                              {bannerContext.workingOn.title}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : hasBreadcrumb ? (
                      <div className="dialog-breadcrumb">
                        {bannerContext?.primary && (
                          <span className="keeper-treatment-title">{bannerContext.primary}</span>
                        )}
                        {bannerContext?.secondary && (
                          <>
                            <span className="breadcrumb-sep" aria-hidden>·</span>
                            <span>{bannerContext.secondary}</span>
                          </>
                        )}
                        {bannerContext?.tertiary && (
                          <>
                            <span className="breadcrumb-sep" aria-hidden>·</span>
                            <span className="breadcrumb-path">{bannerContext.tertiary}</span>
                          </>
                        )}
                      </div>
                    ) : null}
                    {bannerContext?.prelude && bannerContext.onPreludeClick ? (
                      <button
                        type="button"
                        className="dialog-prelude text-left"
                        title={bannerContext.prelude}
                        onClick={bannerContext.onPreludeClick}
                      >
                        {bannerContext.prelude}
                      </button>
                    ) : bannerContext?.prelude ? (
                      <p className="dialog-prelude" title={bannerContext.prelude}>
                        {bannerContext.prelude}
                      </p>
                    ) : null}
                  </div>

                  <div className="dialog-session-meta">
                    {bannerContext?.domainLabel && (
                      <span className="dialog-domain-label">{bannerContext.domainLabel}</span>
                    )}
                    {hasSessionMeta && (
                      <button
                        type="button"
                        className={`banner-chevron${bannerExpanded ? ' open' : ''}`}
                        onClick={() => setBannerExpanded((v) => !v)}
                        aria-expanded={bannerExpanded}
                        aria-label={bannerExpanded ? "Collapse session details" : "Expand session details"}
                      >
                        ›
                      </button>
                    )}
                  </div>
                </div>

                {bannerExpanded && hasSessionMeta && (
                  <div className="dialog-banner-expanded">
                    {sessionId && (
                      <span className="meta-item session-id-short" title="Session">
                        Session {sessionId.slice(0, 8)}
                      </span>
                    )}
                    {bannerContext?.sessionLabel && onSaveTitle && (
                      <span
                        className="meta-item session-title"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onSaveTitle(e.currentTarget.textContent?.trim() ?? '')}
                      >
                        {bannerContext.sessionLabel}
                      </span>
                    )}
                    {modelProvider && (
                      <span className="meta-item model-badge">
                        {modelProvider.toUpperCase()}
                      </span>
                    )}
                    {onOpenCockpit && (
                      <button type="button" className="meta-action" onClick={onOpenCockpit}>
                        Configure
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          }
        </div>
      )}

      {/* ── Header cast — identity roster (invoke lives at composer) ─────────── */}
      {mode !== "feed" && boardCast?.length && !hideCastHeaderOnMobileResponse ? (
        <DirectorCastHeader
          eyebrow={castHeaderEyebrow}
          cueingLabel={cueingLabel}
          instruments={boardCast}
          castCandidates={castCandidates}
          onEnableCandidate={onEnableCastCandidate}
          enablingCast={enablingCast}
          castAddEnabled={castAddEnabled}
          trailing={
            castAccessActions && !domainBannerCompact ? (
              <RealmCastAccessActions
                domainId={castAccessActions.domainId}
                onInvite={castAccessActions.onInvite}
                onManageAccess={castAccessActions.onManageAccess}
              />
            ) : null
          }
        />
      ) : null}

      {/* ── Dialog Space — messages scroll above the Horizon ─────────────────── */}
      {/* `.dialog-message-zone` owns flex:1 / min-height:0 so the inner surface can be height:100% */}
      <div className="dialog-message-zone">
        <div ref={scrollRef} className="dialog-message-surface">
          {mode === 'feed'
            ? feedContent
            : dialogContent ?? (
                <div
                  className="dialog-column pt-2"
                  style={{ paddingBottom: dialogScrollInset }}
                >
                  {glossConfig ? (
                    <GlossProvider
                      config={{
                        agentId: glossConfig.agentId,
                        sessionId: glossConfig.sessionId,
                        domainId: glossConfig.domainId,
                        domainSlug: glossConfig.domainSlug,
                        agentContext: glossConfig.agentContext,
                        agentName: glossConfig.agentName,
                      }}
                      onUpdateMessageThreads={glossConfig.onUpdateMessageThreads}
                    >
                      <DialogueMessageList
                        isLoading={false}
                        messages={messages}
                        isSending={isSending}
                        error={error}
                        agentName={agentName}
                        userName={userName}
                        echoAgentName={echoAgentName}
                        onOpenDraft={onOpenDraft}
                        onOpenMoment={onOpenMoment}
                        onOpenJourney={onOpenJourney}
                        onOpenLibraryItem={onOpenLibraryItem}
                        onOpenChronicleChip={onOpenChronicleChip}
                        onKeepAsMoment={onKeepAsMoment}
                        onOpenSoleMemory={onOpenSoleMemory}
                        onConfirmDraftUpdate={onConfirmDraftUpdate}
                        onApplyTreatmentProposal={onApplyTreatmentProposal}
                        applyingTreatmentProposal={applyingTreatmentProposal}
                        onAcceptDraftPoint={onAcceptDraftPoint}
                        acceptedDraftPointIds={acceptedDraftPointIds}
                        acceptingDraftPointId={acceptingDraftPointId}
                        agentBubbleFullWidth={agentBubbleFullWidth}
                        agentBoardMessaging={agentBoardMessaging}
                        scrollContainerRef={scrollRef}
                        horizonThinking
                        onArrivalInvitation={onArrivalInvitation}
                      />
                    </GlossProvider>
                  ) : (
                  <DialogueMessageList
                    isLoading={false}
                    messages={messages}
                    isSending={isSending}
                    error={error}
                    agentName={agentName}
                    userName={userName}
                    echoAgentName={echoAgentName}
                    onOpenDraft={onOpenDraft}
                    onOpenMoment={onOpenMoment}
                    onOpenJourney={onOpenJourney}
                    onOpenChronicleChip={onOpenChronicleChip}
                    onKeepAsMoment={onKeepAsMoment}
                    onOpenSoleMemory={onOpenSoleMemory}
                    onConfirmDraftUpdate={onConfirmDraftUpdate}
                    onApplyTreatmentProposal={onApplyTreatmentProposal}
                    applyingTreatmentProposal={applyingTreatmentProposal}
                    onAcceptDraftPoint={onAcceptDraftPoint}
                    acceptedDraftPointIds={acceptedDraftPointIds}
                    acceptingDraftPointId={acceptingDraftPointId}
                    agentBubbleFullWidth={agentBubbleFullWidth}
                    agentBoardMessaging={agentBoardMessaging}
                    scrollContainerRef={scrollRef}
                    horizonThinking
                    onArrivalInvitation={onArrivalInvitation}
                  />
                  )}
                </div>
              )
          }
        </div>

        <DialogScrollRail scrollRef={scrollRef} />
        <DialogScrollHint scrollRef={scrollRef} getLatestScrollTop={getLatestScrollTop} />

        {/* Horizon dissolve — softens Dialog Space floor; live status lives in Broadcast Strip */}
        {mode !== "feed" && (
          <div
            className={[
              "dialog-horizon-band",
              isWorking ? " dialog-horizon-band--working" : " dialog-horizon-band--idle",
            ].join("")}
          >
            <div className="dialog-fade-overlay" aria-hidden="true" />
          </div>
        )}
      </div>

      {isMobileStaged && mobileDialogStage === "response" ? mobileResponseToolbar : null}

      {/* ── Broadcast Strip — live beat + ticker while working; uploads when staging ── */}
      {showBroadcastStrip && (
        <div
          ref={broadcastStripRef}
          className={[
            "dialog-broadcast-strip",
            isWorking ? " dialog-broadcast-strip--working" : "",
            hasUploads && !isWorking ? " dialog-broadcast-strip--uploads" : "",
            isMobileStaged && mobileDialogStage === "composing" && hasUploads
              ? " dialog-broadcast-strip--mobile-composing"
              : "",
          ].join("")}
        >
          <div className="dialog-broadcast-scanlines" aria-hidden="true" />
          <div className="dialog-column dialog-broadcast-inner">
            {isWorking ? (
              <DialogBroadcastStrip
                liveLabel={broadcastLiveLabel}
                steps={thinkingSteps}
                agentName={agentName}
                isActive={isWorking}
              />
            ) : (
              <DialogUploadStream
                attachments={pendingAttachments}
                onRemove={(id) => setPendingAttachments((prev) => prev.filter((a) => a.id !== id))}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Composer — input floor; post-run Horizon summary sits directly above ── */}
      <div className="dialog-bottom-zone">
        <div className="dialog-column dialog-bottom-stack">
          {mode !== "feed" && postRunSummary && (
            <div className="dialog-composer-horizon" aria-live="polite">
              <p className="dialog-composer-horizon-summary">{postRunSummary}</p>
            </div>
          )}
          <AgentComposer
            agentName={agentName}
            composerAgents={composerAgents}
            onRemoveComposerAgent={onRemoveComposerAgent}
            showToolbarAgentIdentity={showToolbarAgentIdentity}
            agentId={agentId}
            domainId={domainId}
            dialogueMode={dialogueMode}
            inputValue={inputValue}
            onInputChange={onInputChange}
            onSubmit={handleComposerSubmit}
            onComposerFileUpload={onComposerFileUpload ?? onLibraryFileUpload}
            attachments={pendingAttachments}
            onAttachmentsChange={setPendingAttachments}
            attachmentDisplay="thinking-space"
            onUploadingChange={setIsFileUploading}
            isSending={isSending || isFileUploading || isSubmittingMessage}
            activeSessionId={activeSessionId}
            disabled={disabled}
            inputPlaceholder={inputPlaceholder}
            submitOnEnter={!isMobileStaged}
            onInputFocusChange={onComposerFocusChange}
            composerSize={mobileComposerSize}
            talkMode={talkMode}
            talkState={talkState}
            talkSupported={talkSupported}
            onTalkStart={startListening}
            onTalkStop={stopListening}
            talkError={talkError}
            dialogueMessages={messages}
            userName={userName}
          />
          {showComposerFooter && !hideMobileComposerFooter && (
            <div className="dialog-composer-footer">
              {showServiceBar ? (
                <IntegratedServicesBar
                  onOpen={onServiceOpen ?? (() => {})}
                  instruments={boardCast}
                  onInstrumentInvoke={onCastCueToggle}
                  activeInstrumentSlug={activeCastMemberSlug}
                  agentsEyebrow={castEyebrow}
                  onToolInvoke={onToolInvoke}
                  activeToolSlug={activeToolSlug}
                  railwayStatus={railwayStatus}
                  vercelStatus={vercelStatus}
                  githubStatus={githubStatus}
                />
              ) : boardCast?.length ? (
                <CastCueBar
                  eyebrow={castEyebrow}
                  instruments={boardCast}
                  activeSlug={activeCastMemberSlug}
                  activeSlugs={cuedCastMemberSlugs}
                  selectionMode={castCueSelectionMode}
                  leadLocked={castLeadLocked}
                  onInvoke={onCastCueToggle}
                  collaborationMode={castCollaborationMode}
                />
              ) : (
                <div className="dialog-composer-footer-spacer" aria-hidden />
              )}
              <ComposerDebugToolbar
                active={debugPanelOpen}
                onToggle={toggleDebugPanel}
              />
            </div>
          )}
        </div>
      </div>

      <DialogDebugOverlay open={debugPanelOpen} onClose={() => setDebugPanelOpen(false)} />

    </div>
  )
}

export default KeeperDialogFrame
