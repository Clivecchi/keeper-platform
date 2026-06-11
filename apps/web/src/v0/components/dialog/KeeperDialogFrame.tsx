"use client"

/**
 * KeeperDialogFrame
 *
 * Shared conversation shell used by IDE Board, Agent Board, and Domain Board.
 * Assembles the staged frame layout from Keeper_DialogFrame_Spec_v1.md Path 8:
 *   Zone 1 — Frosted header banner (breadcrumb + path prelude)
 *   Zone 2 — Scrollable message surface with gradient dissolve
 *   Zone 3 — Frosted bottom zone: optional service bar + composer
 *
 * This component owns the shell only. Message logic and API calls live in the Board.
 */

import * as React from "react"
import { AgentComposer } from "../../../components/agent/AgentComposer"
import type { AgentComposerProps } from "../../../components/agent/AgentComposer"
import { DialogueMessageList } from "../../../components/agent/DialogueMessageList"
import type { AgentDialogueMessage } from "../../../components/agent/types"
import { IntegratedServicesBar } from "../../boards/ide/components/IntegratedServicesBar"
import type { AgentBoardMessaging } from "../../data/domain-frame.types"
import { DialogScrollRail } from "./DialogScrollRail"

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
  onFileAttach?: (text: string) => void
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
  onFileAttach,
  activeSessionId,
  disabled,
  dialogContent,
  mode = 'dialog',
  feedContent,
  onReturnToFeed,
}: KeeperDialogFrameProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const thinkSpaceRef = React.useRef<HTMLDivElement>(null)
  const [bannerExpanded, setBannerExpanded] = React.useState(false)
  const [dialogScrollInset, setDialogScrollInset] = React.useState(172)

  const measureDialogScrollInset = React.useCallback(() => {
    const thinkHeight = thinkSpaceRef.current?.offsetHeight ?? 52
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
  }, [mode, dialogContent, measureDialogScrollInset])

  const thinkingLabel = React.useMemo(
    () =>
      (agentBoardMessaging?.dialogue.thinking ?? "{agent_name} is thinking…").replace(
        "{agent_name}",
        agentName,
      ),
    [agentBoardMessaging?.dialogue.thinking, agentName],
  )

  // Auto-scroll so the newest message clears the Horizon (Thinking space + fade overlay)
  React.useEffect(() => {
    if (mode === "feed" || dialogContent) return
    const el = scrollRef.current
    if (!el) return

    const run = () => {
      measureDialogScrollInset()
      const thinkHeight = thinkSpaceRef.current?.offsetHeight ?? 52
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

  return (
    <div className="keeper-dialog-frame">

      {/* ── Zone 1: Frosted Header Banner — hidden in feed mode ─────────────── */}
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

      {/* ── Zone 2: Scrollable Message Surface ──────────────────────────────── */}
      {/* dialog-message-zone owns flex:1 / min-height:0 so the inner surface can be height:100% */}
      <div className="dialog-message-zone">
        <div ref={scrollRef} className="dialog-message-surface">
          {mode === 'feed'
            ? feedContent
            : dialogContent ?? (
                <div
                  className="mx-auto w-full max-w-3xl px-4 pt-2"
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

        {/* Gradient dissolve — messages fade before reaching the Composer */}
        {mode !== 'feed' && (
          <div
            className="dialog-fade-overlay"
            aria-hidden="true"
          />
        )}

        {/* Horizon — top edge of Thinking Space; agent status sits here, left-aligned */}
        {mode !== 'feed' && isSending && (
          <div
            className="dialog-horizon-status"
            aria-live="polite"
          >
            <div className="mx-auto w-full max-w-3xl px-4">
              <span className="dialog-think-pulse">{thinkingLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Thinking Space: reserved for uploads, messaging, composer features ── *
       *  Fixed height: never causes the composer to resize or jump.               *
       *  Agent thinking status lives on the Horizon above, not in this zone.     */}
      {mode !== 'feed' && (
        <div
          ref={thinkSpaceRef}
          className="dialog-think-space"
          aria-hidden="true"
        />
      )}

      {/* ── Zone 3: Composer Zone — where the user speaks ───────────────────── *
       *  Service bar lives below the input field: barely-there, at the floor.  */}
      <div className="dialog-bottom-zone">
        <div className="mx-auto w-full max-w-3xl">
          <AgentComposer
            agentName={agentName}
            agentId={agentId}
            domainId={domainId}
            dialogueMode={dialogueMode}
            inputValue={inputValue}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            onFileAttach={onFileAttach}
            isSending={isSending}
            activeSessionId={activeSessionId}
            disabled={disabled}
          />
        </div>
        {showServiceBar && (
          <IntegratedServicesBar
            onOpen={onServiceOpen ?? (() => {})}
            onToolInvoke={onToolInvoke}
            activeToolSlug={activeToolSlug}
            railwayStatus={railwayStatus}
            vercelStatus={vercelStatus}
            githubStatus={githubStatus}
          />
        )}
      </div>

    </div>
  )
}

export default KeeperDialogFrame
