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

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceSlug = "cloud" | "railway" | "vercel" | "github"
type ServiceStatus = "connected" | "warning" | "disconnected"

export interface KeeperDialogFrameProps {
  // ── Header context — frosted breadcrumb banner ────────────────────────────
  keeperName?: string | null
  journeyName?: string | null
  pathName?: string | null
  pathPrelude?: string | null

  // ── Session context — absorbed from SessionBannerCard (IDE Board only) ────
  sessionTitle?: string | null
  sessionId?: string | null
  soleActive?: boolean
  modelProvider?: string | null
  onOpenCockpit?: () => void
  onSaveTitle?: (title: string) => void

  // ── Service bar — bottom zone, IDE Board only ─────────────────────────────
  showServiceBar?: boolean
  onServiceOpen?: (service?: ServiceSlug) => void
  cloudStatus?: ServiceStatus
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
  onConfirmDraftUpdate?: (
    draftId: string,
    payload: { title?: string; summary?: string; status?: string; spec?: unknown },
  ) => void
  agentName?: string
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
  keeperName,
  journeyName,
  pathName,
  pathPrelude,
  // Session context
  sessionTitle,
  sessionId,
  soleActive,
  modelProvider,
  onOpenCockpit,
  onSaveTitle,
  // Service bar
  showServiceBar = false,
  onServiceOpen,
  cloudStatus = "disconnected",
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
  onConfirmDraftUpdate,
  agentName = "Kip",
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
  const [bannerExpanded, setBannerExpanded] = React.useState(false)

  // Auto-scroll to bottom when messages change — skip in feed mode or when dialogContent is in use
  React.useEffect(() => {
    if (mode === 'feed' || dialogContent) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isSending, dialogContent, mode])

  const hasBreadcrumb = keeperName || journeyName || pathName
  const hasSessionMeta = sessionId !== undefined
  // Banner renders in dialog mode when there is context to show
  const showBanner = mode !== 'feed' && (!!hasBreadcrumb || !!pathPrelude || !!onReturnToFeed || hasSessionMeta)

  return (
    <div className="keeper-dialog-frame">

      {/* ── Zone 1: Frosted Header Banner — hidden in feed mode ─────────────── */}
      {showBanner && (
        <div className="dialog-header-banner">
          {/* Main banner row: breadcrumb left, session meta right */}
          <div className="dialog-banner-main-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              {onReturnToFeed && (
                <button type="button" onClick={onReturnToFeed} className="dialog-back-to-feed">
                  ← Commons
                </button>
              )}
              {hasBreadcrumb && (
                <div className="dialog-breadcrumb">
                  {keeperName && <span>{keeperName}</span>}
                  {journeyName && (
                    <>
                      <span className="breadcrumb-sep" aria-hidden>·</span>
                      <span>{journeyName}</span>
                    </>
                  )}
                  {pathName && (
                    <>
                      <span className="breadcrumb-sep" aria-hidden>·</span>
                      <span className="breadcrumb-path">{pathName}</span>
                    </>
                  )}
                </div>
              )}
              {pathPrelude && (
                <p className="dialog-prelude" title={pathPrelude}>
                  {pathPrelude}
                </p>
              )}
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
              {keeperName && <span className="meta-item">{keeperName}</span>}
              {sessionTitle && (
                <span
                  className="meta-item session-title"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => onSaveTitle?.(e.currentTarget.textContent?.trim() ?? '')}
                >
                  {sessionTitle}
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
        </div>
      )}

      {/* ── Zone 2: Scrollable Message Surface ──────────────────────────────── */}
      <div ref={scrollRef} className="dialog-message-surface">
        {mode === 'feed'
          ? feedContent
          : dialogContent ?? (
              <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-2">
                <DialogueMessageList
                  isLoading={false}
                  messages={messages}
                  isSending={isSending}
                  error={error}
                  agentName={agentName}
                  onOpenDraft={onOpenDraft}
                  onOpenMoment={onOpenMoment}
                  onOpenJourney={onOpenJourney}
                  onConfirmDraftUpdate={onConfirmDraftUpdate}
                  agentBubbleFullWidth={agentBubbleFullWidth}
                  agentBoardMessaging={agentBoardMessaging}
                />
              </div>
            )
        }
      </div>

      {/* ── Zone 3: Frosted Bottom Zone — Service Bar + Composer ────────────── */}
      <div className="dialog-bottom-zone">
        {showServiceBar && (
          <IntegratedServicesBar
            onOpen={onServiceOpen ?? (() => {})}
            cloudStatus={cloudStatus}
            railwayStatus={railwayStatus}
            vercelStatus={vercelStatus}
            githubStatus={githubStatus}
          />
        )}
        <div className="mx-auto w-full max-w-3xl px-3 py-3">
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
      </div>

    </div>
  )
}

export default KeeperDialogFrame
