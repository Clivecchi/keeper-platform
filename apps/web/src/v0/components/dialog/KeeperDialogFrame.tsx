"use client"

/**
 * KeeperDialogFrame
 *
 * Shared conversation shell used by IDE Board, Agent Board, and Domain Board.
 *
 * Canonical surfaces (product language):
 *   Header Bar   — expandable breadcrumb / session meta (`.dialog-header-banner`)
 *   Dialog Space — scrollable messages above the Horizon (`.dialog-message-zone`)
 *   Composer     — user input floor; two states via `data-composer-state`:
 *     composing — input only; optional post-run Horizon summary atop composer
 *     working   — Dialog Space Horizon (live status) + expanded Thinking Space + input
 *
 * While sending: Thinking Space expands with the run trace; Horizon summarizes live.
 * After the reply lands: Thinking Space collapses; a one-line dialogic summary sits
 * atop the composer (`.dialog-composer-horizon`).
 *
 * Message logic and API calls live in the Board; this file owns layout only.
 */

import * as React from "react"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import type { AgentComposerProps, AgentAttachment, PendingAttachment } from "../../../components/agent/AgentComposer"
import { DialogueMessageList } from "../../../components/agent/DialogueMessageList"
import type { AgentDialogueMessage } from "../../../components/agent/types"
import { IntegratedServicesBar } from "../../boards/ide/components/IntegratedServicesBar"
import type { AgentBoardMessaging } from "../../data/domain-frame.types"
import { clearConsoleDiagEntries, installConsoleDiagCapture } from "../../../lib/consoleDiagCapture"
import { ComposerDebugToolbar } from "./ComposerDebugToolbar"
import { DialogDiagStream } from "./DialogDiagStream"
import { DialogScrollHint } from "./DialogScrollHint"
import { DialogScrollRail } from "./DialogScrollRail"
import { DialogThinkStream } from "./DialogThinkStream"
import { DialogUploadStream } from "./DialogUploadStream"
import {
  composeHorizonBeat,
  dialogicRunSummary,
  type DialogThinkingStep,
} from "./dialogThinking"

type ThinkStream = "diag" | null

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
 * The Banner renders: primary · secondary · tertiary
 *                     prelude (italic, below)
 * The expanded meta row renders: primary (read-only) + sessionLabel (editable)
 *
 * Callers assemble this from whatever semantic labels their board uses —
 * keeper name, domain wordmark, agent eyebrow, session title, path prelude.
 * KeeperDialogFrame renders the shape; callers own the meaning.
 */
export interface BannerContext {
  /** Lead label — was keeperName / wordmark / agent eyebrow. Required when BannerContext is provided. */
  primary: string
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
  /** Overrides Horizon summary while sending; otherwise derived from thinkingSteps. */
  thinkingStatusLabel?: string
  /** Chain-of-thought detail for Thinking Space while sending. */
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
  onOpenSoleMemory?: (memoryCardId: string) => void
  onConfirmDraftUpdate?: (
    draftId: string,
    payload: { title?: string; summary?: string; status?: string; spec?: unknown },
  ) => void
  onAcceptDraftPoint?: (draftId: string, pointId: string) => void
  acceptedDraftPointIds?: ReadonlySet<string>
  acceptingDraftPointId?: string | null
  agentName?: string
  /** Echo attribution fallback — board def agentName (def.conversation.agentName) */
  echoAgentName?: string
  agentBubbleFullWidth?: boolean
  agentBoardMessaging?: AgentBoardMessaging

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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KeeperDialogFrame({
  // Header
  bannerContext,
  // Session context
  sessionId,
  soleActive,
  modelProvider,
  onOpenCockpit,
  onSaveTitle,
  // Service bar
  showServiceBar = false,
  onServiceOpen,
  onToolInvoke,
  activeToolSlug = null,
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
  onOpenSoleMemory,
  onConfirmDraftUpdate,
  onAcceptDraftPoint,
  acceptedDraftPointIds,
  acceptingDraftPointId,
  agentName = "Kip",
  echoAgentName,
  agentBubbleFullWidth = true,
  agentBoardMessaging,
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
  dialogContent,
  mode = 'dialog',
  feedContent,
  onReturnToFeed,
  dialogLayout = "default",
  mobileDialogStage,
  onComposerFocusChange,
  mobileResponseToolbar,
}: KeeperDialogFrameProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const thinkSpaceRef = React.useRef<HTMLDivElement>(null)
  const [bannerExpanded, setBannerExpanded] = React.useState(false)
  const [dialogScrollInset, setDialogScrollInset] = React.useState(172)
  const [thinkStream, setThinkStream] = React.useState<ThinkStream>(null)
  const [pendingAttachments, setPendingAttachments] = React.useState<PendingAttachment[]>([])
  const [isFileUploading, setIsFileUploading] = React.useState(false)
  const hasUploads = pendingAttachments.length > 0 || isFileUploading
  const isWorking = isSending || isFileUploading
  const hasWorkingThinkSpace = isWorking || hasUploads
  const showDiagStream = isSending && thinkStream === "diag"
  const showThinkStream = !showDiagStream && isSending
  const showComposerFooter = showServiceBar || isSending
  const toggleDiagStream = React.useCallback(() => {
    setThinkStream((current) => (current === "diag" ? null : "diag"))
  }, [])

  React.useEffect(() => {
    installConsoleDiagCapture()
  }, [])

  React.useEffect(() => {
    if (isSending) {
      clearConsoleDiagEntries()
      setThinkStream(null)
      return
    }
    setThinkStream(null)
  }, [isSending])

  const measureDialogScrollInset = React.useCallback(() => {
    const thinkHeight = thinkSpaceRef.current?.offsetHeight ?? 0
    const fadeEl = scrollRef.current?.parentElement?.querySelector(
      ".dialog-fade-overlay",
    ) as HTMLElement | null
    const fadeHeight = fadeEl?.offsetHeight ?? 120
    setDialogScrollInset(thinkHeight + fadeHeight)
  }, [])

  React.useLayoutEffect(() => {
    if (mode === "feed" || dialogContent) return
    measureDialogScrollInset()
    window.addEventListener("resize", measureDialogScrollInset)
    return () => window.removeEventListener("resize", measureDialogScrollInset)
  }, [mode, dialogContent, measureDialogScrollInset, isSending, isFileUploading, thinkStream, hasWorkingThinkSpace])

  const getLatestScrollTop = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return 0
    const thinkHeight = thinkSpaceRef.current?.offsetHeight ?? 0
    const fadeEl = el.parentElement?.querySelector(
      ".dialog-fade-overlay",
    ) as HTMLElement | null
    const fadeHeight = fadeEl?.offsetHeight ?? 120
    const clearance = thinkHeight + fadeHeight
    const maxScroll = el.scrollHeight - el.clientHeight
    return Math.max(0, maxScroll - clearance + thinkHeight)
  }, [])

  const composerState: "composing" | "working" = isSending ? "working" : "composing"

  const handleComposerSubmit = React.useCallback(
    async (
      event: React.FormEvent,
      options: { content: string; attachments?: AgentAttachment[] },
    ) => {
      if (onCommitAttachmentsToLibrary && pendingAttachments.length > 0) {
        try {
          await onCommitAttachmentsToLibrary(pendingAttachments)
        } catch (err) {
          alert(err instanceof Error ? err.message : "Failed to save attachments to Library.")
          return
        }
      }
      onSubmit(event, options)
      setPendingAttachments([])
    },
    [onSubmit, onCommitAttachmentsToLibrary, pendingAttachments],
  )

  const horizonStatusLabel = React.useMemo(() => {
    if (isFileUploading) return "Uploading…"
    if (isSending) {
      return composeHorizonBeat(thinkingSteps, agentName, thinkingStatusLabel)
    }
    return null
  }, [
    isFileUploading,
    isSending,
    thinkingStatusLabel,
    thinkingSteps,
    agentName,
  ])

  const showHorizonStatus = horizonStatusLabel !== null

  const postRunSummary = React.useMemo(() => {
    if (isWorking || thinkingSteps.length === 0) return null
    return dialogicRunSummary(thinkingSteps, agentName)
  }, [isWorking, thinkingSteps, agentName])

  // Auto-scroll so the newest message clears the Horizon (Thinking space + fade overlay)
  React.useEffect(() => {
    if (mode === "feed" || dialogContent) return
    const el = scrollRef.current
    if (!el) return

    const run = () => {
      measureDialogScrollInset()
      const thinkHeight = thinkSpaceRef.current?.offsetHeight ?? 0
      const fadeEl = el.parentElement?.querySelector(
        ".dialog-fade-overlay",
      ) as HTMLElement | null
      const fadeHeight = fadeEl?.offsetHeight ?? 120
      const clearance = thinkHeight + fadeHeight
      const maxScroll = el.scrollHeight - el.clientHeight
      el.scrollTop = Math.max(0, maxScroll - clearance + thinkHeight)
    }

    requestAnimationFrame(run)
  }, [messages, isSending, dialogContent, mode, measureDialogScrollInset])

  const hasBreadcrumb = bannerContext?.primary || bannerContext?.secondary || bannerContext?.tertiary
  const hasSessionMeta = sessionId !== undefined
  // Banner renders in dialog mode when there is context to show
  const showBanner = mode !== 'feed' && (!!hasBreadcrumb || !!bannerContext?.prelude || !!onReturnToFeed || hasSessionMeta)

  const isMobileStaged = dialogLayout === "mobile-staged" && mode !== "feed"
  const mobileComposerSize =
    isMobileStaged && mobileDialogStage === "composing"
      ? "mobile-expanded"
      : isMobileStaged && mobileDialogStage === "response"
        ? "mobile-compact"
        : "default"

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
      {showBanner && (
        <div className="dialog-header-banner">
          {bannerContext?.livePulse
            ? (
              /* Domain-mode banner: wordmark + tagline + live pulse + stats */
              <div className="dialog-banner-main-row" style={{ alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <p
                      className="font-serif text-lg font-semibold leading-tight truncate"
                      style={{ color: 'hsl(var(--theme-ink-primary))' }}
                    >
                      {bannerContext.primary}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        paddingLeft: 8,
                        borderLeft: '1px solid hsl(var(--theme-line-hairline))',
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
                                backgroundColor: 'hsl(var(--theme-border-strong))',
                                boxShadow: '0 0 0 2px hsl(var(--theme-border-soft) / 0.6)',
                              }
                        }
                        aria-hidden
                      />
                      <span
                        className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: 'hsl(var(--theme-ink-secondary))' }}
                      >
                        Live
                      </span>
                    </div>
                  </div>
                  {bannerContext.tagline && (
                    <p
                      className="text-xs leading-snug truncate mt-0.5"
                      style={{ color: 'hsl(var(--theme-ink-secondary))' }}
                    >
                      {bannerContext.tagline}
                    </p>
                  )}
                </div>
                {bannerContext.stats && bannerContext.stats.length > 0 && (
                  <dl
                    className="shrink-0 flex items-center gap-4 text-right"
                    style={{ color: 'hsl(var(--theme-ink-secondary))' }}
                  >
                    {bannerContext.stats.map((s) => (
                      <div key={s.label}>
                        <dt className="text-[9px] font-semibold uppercase tracking-widest">{s.label}</dt>
                        <dd
                          className="text-sm font-medium tabular-nums"
                          style={{ color: 'hsl(var(--theme-ink-primary))' }}
                        >
                          {s.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )
            : (
              /* Standard breadcrumb banner */
              <>
                <div className="dialog-banner-main-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {onReturnToFeed && (
                      <button type="button" onClick={onReturnToFeed} className="dialog-back-to-feed">
                        ← Commons
                      </button>
                    )}
                    {hasBreadcrumb && (
                      <div className="dialog-breadcrumb">
                        {bannerContext?.primary && <span>{bannerContext.primary}</span>}
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
                    )}
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

                  {hasSessionMeta && (
                    <div className="dialog-session-meta">
                      {soleActive !== undefined && (
                        <span className={`sole-badge ${soleActive ? 'active' : 'inactive'}`}>
                          SOLE
                        </span>
                      )}
                      {sessionId && (
                        <span className="session-id-short">
                          {sessionId.slice(0, 6)}
                        </span>
                      )}
                      <button
                        type="button"
                        className={`banner-chevron${bannerExpanded ? ' open' : ''}`}
                        onClick={() => setBannerExpanded((v) => !v)}
                        aria-label="Expand session details"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded session details — visible on chevron tap */}
                {bannerExpanded && hasSessionMeta && (
                  <div className="dialog-banner-expanded">
                    {bannerContext?.primary && <span className="meta-item">{bannerContext.primary}</span>}
                    {bannerContext?.sessionLabel && (
                      <span
                        className="meta-item session-title"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => onSaveTitle?.(e.currentTarget.textContent?.trim() ?? '')}
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
                  <DialogueMessageList
                    isLoading={false}
                    messages={messages}
                    isSending={isSending}
                    error={error}
                    agentName={agentName}
                    echoAgentName={echoAgentName}
                    onOpenDraft={onOpenDraft}
                    onOpenMoment={onOpenMoment}
                    onOpenJourney={onOpenJourney}
                    onOpenSoleMemory={onOpenSoleMemory}
                    onConfirmDraftUpdate={onConfirmDraftUpdate}
                    onAcceptDraftPoint={onAcceptDraftPoint}
                    acceptedDraftPointIds={acceptedDraftPointIds}
                    acceptingDraftPointId={acceptingDraftPointId}
                    agentBubbleFullWidth={agentBubbleFullWidth}
                    agentBoardMessaging={agentBoardMessaging}
                    scrollContainerRef={scrollRef}
                    horizonThinking
                  />
                </div>
              )
          }
        </div>

        <DialogScrollRail scrollRef={scrollRef} />
        <DialogScrollHint scrollRef={scrollRef} getLatestScrollTop={getLatestScrollTop} />

        {/* Horizon — gradient dissolve at Dialog Space floor; live status while working */}
        {mode !== 'feed' && (
          <div
            className={[
              "dialog-horizon-band",
              isWorking ? " dialog-horizon-band--working" : " dialog-horizon-band--idle",
            ].join("")}
          >
            <div className="dialog-fade-overlay" aria-hidden="true" />
            {isWorking && (
              <div className="dialog-horizon-status" aria-live="polite">
                <div className="dialog-column dialog-horizon-row">
                  {showHorizonStatus ? (
                    <span className="dialog-think-pulse dialog-horizon-summary">{horizonStatusLabel}</span>
                  ) : (
                    <span className="dialog-horizon-summary" aria-hidden="true" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isMobileStaged && mobileDialogStage === "response" ? mobileResponseToolbar : null}

      {/* ── Thinking Space — expands while the agent works; uploads when staging ── *
       *  Collapses after the reply; post-run summary moves to composer Horizon.  */}
      {mode !== 'feed' && hasWorkingThinkSpace && (
        <div
          ref={thinkSpaceRef}
          className={[
            "dialog-think-space",
            showDiagStream ? " dialog-think-space--diag" : "",
            showThinkStream ? " dialog-think-space--working" : "",
            hasUploads && !isSending ? " dialog-think-space--uploads" : "",
            isMobileStaged && mobileDialogStage === "composing" && hasUploads
              ? " dialog-think-space--mobile-composing"
              : "",
          ].join("")}
        >
          <div className="dialog-column dialog-think-space-inner">
            {showDiagStream ? (
              <DialogDiagStream active />
            ) : showThinkStream ? (
              <DialogThinkStream steps={thinkingSteps} agentName={agentName} isActive={isSending} />
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
            isSending={isSending || isFileUploading}
            activeSessionId={activeSessionId}
            disabled={disabled}
            submitOnEnter={!isMobileStaged}
            onInputFocusChange={onComposerFocusChange}
            composerSize={mobileComposerSize}
          />
          {showComposerFooter && (
            <div className="dialog-composer-footer">
              {showServiceBar ? (
                <IntegratedServicesBar
                  onOpen={onServiceOpen ?? (() => {})}
                  onToolInvoke={onToolInvoke}
                  activeToolSlug={activeToolSlug}
                  railwayStatus={railwayStatus}
                  vercelStatus={vercelStatus}
                  githubStatus={githubStatus}
                />
              ) : (
                <div className="dialog-composer-footer-spacer" aria-hidden />
              )}
              {isSending && (
                <ComposerDebugToolbar
                  active={thinkStream === "diag"}
                  onToggle={toggleDiagStream}
                />
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default KeeperDialogFrame
