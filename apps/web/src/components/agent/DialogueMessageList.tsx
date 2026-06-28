/**
 * DialogueMessageList
 * Renders a scrollable list of agent conversation messages with action receipts.
 * Extracted from KipAgentBoardPage for reuse in the new Agent Board frame.
 */

import React from "react"
import clsx from "clsx"
import { LinkedCard } from "../props/LinkedCard"
import { ActionReceiptCard, type KeepAsMomentPayload } from "../kip/ActionReceiptCard"
import { DraftUpdateProposeCard } from "../kip/DraftUpdateProposeCard"
import type { AgentDialogueMessage, DialogResponseEcho } from "./types"
import { normalizeActionReceipt } from "./types"
import { formatTime } from "./helpers"
import { getAgentErrorPresentation } from "./errorPresentation"
import { isDirectorDelegationFailureContent } from "../../v0/boards/directorDialog"
import type { AgentBoardMessaging } from "../../v0/data/domain-frame.types"

function visibleDelegationBeat(
  delegation: DialogResponseEcho | undefined,
): DialogResponseEcho | null {
  const content = delegation?.content?.trim()
  if (!content || isDirectorDelegationFailureContent(content)) return null
  return delegation ?? null
}

function DialogResponseBeat({
  beat,
  fallbackName,
  position,
}: {
  beat: DialogResponseEcho
  fallbackName: string
  position: "above" | "below"
}) {
  const content = beat.content?.trim()
  if (!content) return null
  return (
    <div
      className={clsx(
        position === "above" ? "mb-2.5 border-b pb-2.5" : "mt-2.5 border-t pt-2.5",
      )}
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.65)" }}
    >
      <p
        className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {beat.attributedTo ?? fallbackName}
      </p>
      <p
        className="whitespace-pre-line text-[12px] leading-relaxed"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {content}
      </p>
    </div>
  )
}

export interface DialogueMessageListProps {
  /** Whether messages are still loading */
  isLoading: boolean
  /** Array of conversation messages */
  messages: AgentDialogueMessage[]
  /** Whether a message is currently being sent */
  isSending: boolean
  /** Error message to display */
  error: string | null
  /** Callback when a draft link is clicked */
  onOpenDraft?: (draftId: string) => void
  /** Callback when a moment link is clicked (e.g. in action receipts) */
  onOpenMoment?: (momentId: string) => void
  /** Callback when a journey link is clicked */
  onOpenJourney?: (journeyId: string) => void
  /** Callback when user confirms a proposed draft update */
  onConfirmDraftUpdate?: (draftId: string, payload: { title?: string; summary?: string; status?: string; spec?: unknown }) => void
  /** Callback when user keeps dialog content (e.g. generated image) as a moment */
  onKeepAsMoment?: (payload: KeepAsMomentPayload) => void | Promise<void>
  /** Agent name for empty state and thinking indicator (dynamic, not hardcoded) */
  agentName?: string
  /** Echo attribution fallback when message.echo.attributedTo is missing */
  echoAgentName?: string
  /** Domain-driven messaging strings for dialogue states */
  agentBoardMessaging?: AgentBoardMessaging
  /** Agent messages span full width of the centered column */
  agentBubbleFullWidth?: boolean
  /** Scroll container ref from KeeperDialogFrame (opacity depth — optional) */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
  /** When true, suppress the in-list “is thinking…” line — Horizon owns working status. */
  horizonThinking?: boolean
  /** @deprecated Legacy draft point accept — retained for KeeperDialogFrame pass-through */
  onAcceptDraftPoint?: (draftId: string, pointId: string) => void
  acceptedDraftPointIds?: ReadonlySet<string>
  acceptingDraftPointId?: string | null
  onOpenSoleMemory?: (memoryCardId: string) => void
}

export const DialogueMessageList: React.FC<DialogueMessageListProps> = ({
  isLoading,
  messages,
  isSending,
  error,
  onOpenDraft,
  onOpenMoment,
  onOpenJourney,
  onKeepAsMoment,
  onConfirmDraftUpdate,
  agentName = "Agent",
  echoAgentName,
  agentBoardMessaging,
  horizonThinking = false,
}) => (
  <div
    className="min-h-[24rem] space-y-4 overflow-y-auto rounded-2xl px-4 py-4"
    style={{ backgroundColor: 'hsl(var(--theme-dialogue-area-bg, 35 33% 97%))' }}
  >
    {isLoading ? (
      <>
        <SkeletonBubble alignment="left" />
        <SkeletonBubble alignment="right" />
      </>
    ) : messages.length === 0 ? (
      <div
        className="rounded-xl border border-dashed p-6 text-center text-sm"
        style={{
          borderColor: 'hsl(var(--theme-dialogue-border, 35 20% 88%))',
          backgroundColor: 'hsl(var(--theme-surface-paper) / 0.7)',
          color: 'var(--theme-ink-secondary-color)',
        }}
      >
        {(agentBoardMessaging?.dialogue?.start_prompt ?? "Say hello to {agent_name} to start the conversation.").replace("{agent_name}", agentName)}
      </div>
    ) : (
      messages.map((message) => {
        const delegation = visibleDelegationBeat(message.delegation)
        const echo =
          message.echo?.content?.trim() && !isDirectorDelegationFailureContent(message.echo.content)
            ? message.echo
            : null

        return (
        <div
          key={message.id}
          className={clsx(
            "flex",
            message.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          <div
            className={clsx(
              "max-w-xl rounded-2xl px-4 py-3 text-sm shadow-sm",
              message.role === "user" && "text-white",
            )}
            style={{
              backgroundColor:
                message.role === "user"
                  ? "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))"
                  : "hsl(var(--theme-surface-paper))",
              color: message.role === "user" ? undefined : "var(--theme-ink-primary-color)",
              border: message.role === "agent" ? "1px solid hsl(var(--theme-border-soft))" : undefined,
              boxShadow: message.role === "agent" ? "0 1px 2px hsl(var(--theme-ink-primary) / 0.06)" : undefined,
            }}
          >
            {delegation && (
              <DialogResponseBeat
                beat={delegation}
                fallbackName="Instrument"
                position="above"
              />
            )}
            <p className="whitespace-pre-line">{message.content}</p>
            {echo && (
              <DialogResponseBeat
                beat={echo}
                fallbackName={echoAgentName ?? agentName}
                position="below"
              />
            )}
            {message.linkedCard && (
              <div className="mt-3">
                <LinkedCard
                  {...message.linkedCard}
                  variant="inline"
                  onNavigate={(() => {
                    const card = message.linkedCard!
                    const entityType = card.entityType as string
                    if (entityType === "draft" && onOpenDraft) return () => onOpenDraft(card.entityId)
                    if (entityType === "moment" && onOpenMoment) return () => onOpenMoment(card.entityId)
                    if (entityType === "journey" && onOpenJourney) return () => onOpenJourney(card.entityId)
                    return undefined
                  })()}
                />
              </div>
            )}
            {message.actionResults && message.actionResults.filter(isVisibleActionResult).length > 0 && (
              <div className="mt-3 space-y-2">
                {message.actionResults.filter(isVisibleActionResult).map((actionResult, idx) => {
                  const receipt = normalizeActionReceipt(actionResult)
                  const isPropose = receipt.type === "draft.update.propose" && receipt.status === "success"
                  const proposeData = receipt.data as {
                    draftId?: string
                    draftTitle?: string
                    summary?: string
                    proposedPayload?: { id: string; title?: string; summary?: string; status?: string; spec?: unknown }
                  } | undefined
                  if (isPropose && proposeData?.draftId && proposeData?.proposedPayload && onConfirmDraftUpdate) {
                    return (
                      <DraftUpdateProposeCard
                        key={idx}
                        draftId={proposeData.draftId}
                        draftTitle={proposeData.draftTitle ?? "Draft"}
                        summary={proposeData.summary ?? "Update draft"}
                        proposedPayload={proposeData.proposedPayload}
                        onConfirm={onConfirmDraftUpdate}
                        onReject={() => {}}
                        onOpenDraft={onOpenDraft}
                      />
                    )
                  }
                  return (
                    <ActionReceiptCard
                      key={idx}
                      receipt={receipt}
                      contextNarrative={message.role === "agent" ? message.content : undefined}
                      onOpenDraft={
                        receipt.data?.draft?.id
                          ? (draftId) => onOpenDraft?.(draftId)
                          : undefined
                      }
                      onOpenMoment={
                        receipt.data?.moment?.id
                          ? (momentId) => onOpenMoment?.(momentId)
                          : undefined
                      }
                      onOpenJourney={
                        receipt.data?.journey?.id
                          ? (journeyId) => onOpenJourney?.(journeyId)
                          : undefined
                      }
                      onKeepAsMoment={onKeepAsMoment}
                    />
                  )
                })}
              </div>
            )}
            <span
              className="mt-2 block text-xs"
              style={{
                color: message.role === "user" ? "rgba(255,255,255,0.8)" : "var(--theme-ink-tertiary-color)",
              }}
            >
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>
        )
      })
    )}
    {isSending && !horizonThinking && (
      <p className="text-xs" style={{ color: "var(--theme-ink-tertiary-color)" }}>{(agentBoardMessaging?.dialogue?.thinking ?? "{agent_name} is thinking…").replace("{agent_name}", agentName)}</p>
    )}
    {error && <AgentErrorAlert error={error} />}
  </div>
)

const AgentErrorAlert: React.FC<{ error: string }> = ({ error }) => {
  const presentation = getAgentErrorPresentation(error)
  const isWarning = presentation.tone === "warning"

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isWarning
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="mt-0.5 h-5 w-5 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        {isWarning ? (
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        )}
      </svg>
      <div className="flex flex-col gap-1">
        <span className="font-medium">{presentation.title}</span>
        <span className="text-xs opacity-80">{presentation.detail}</span>
      </div>
    </div>
  )
}

function isVisibleActionResult(actionResult: NonNullable<AgentDialogueMessage["actionResults"]>[number]): boolean {
  const receipt = normalizeActionReceipt(actionResult)
  return receipt.errorCode !== "NOT_ALLOWED"
}

const SkeletonBubble: React.FC<{ alignment: "left" | "right" }> = ({
  alignment,
}) => (
  <div
    className={clsx(
      "flex",
      alignment === "left" ? "justify-start" : "justify-end",
    )}
  >
    <div className="h-16 w-40 animate-pulse rounded-2xl bg-white/70" />
  </div>
)

export default DialogueMessageList
