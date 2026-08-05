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
import { TreatmentProposeCard } from "../kip/TreatmentProposeCard"
import type { DomainFrameTreatment } from "../../v0/data/domain-frame.types"
import type { AgentDialogueMessage, DialogResponseEcho } from "./types"
import { normalizeActionReceipt } from "./types"
import { formatTime } from "./helpers"
import { getAgentErrorPresentation } from "./errorPresentation"
import { isDirectorDelegationFailureContent, sanitizeAgentMessageContent } from "../../v0/boards/directorDialog"
import type { AgentBoardMessaging } from "../../v0/data/domain-frame.types"
import { GlossSurface } from "../gloss/GlossSurface"
import { buildMessageGlossAnchor } from "@keeper/shared"
import { RealmInvitationButtons } from "../../v0/realm/RealmInvitationButtons"
import type { RealmInvitationId } from "../../v0/realm/realmInvitations"
import { AgentMessageContent } from "./AgentMessageContent"
import {
  MessageSenderLabel,
  type MessageSenderVariant,
} from "./MessageSenderLabel"

function visibleDelegationBeat(
  delegation: DialogResponseEcho | undefined,
): DialogResponseEcho | null {
  if (!delegation) return null
  const content = delegation.content?.trim()
  if (delegation.status === "failed" || delegation.status === "empty") {
    return {
      ...delegation,
      content:
        content ||
        `${delegation.attributedTo ?? "Agent"} couldn't respond this turn. Kip answered using platform knowledge instead.`,
    }
  }
  if (!content || isDirectorDelegationFailureContent(content)) return null
  return delegation
}

type AgentBubbleVariant = "lead" | "collaborator" | "echo" | "delegation-failed"

function agentBubbleSurface(variant: AgentBubbleVariant): React.CSSProperties {
  switch (variant) {
    case "collaborator":
      return {
        backgroundColor:
          "hsl(var(--treatment-color, var(--theme-focus-ring, 152 45% 42%)) / 0.14)",
        color: "var(--theme-ink-primary-color)",
        border:
          "1px solid hsl(var(--treatment-color, var(--theme-focus-ring, 152 45% 42%)) / 0.28)",
        boxShadow: "0 1px 2px hsl(var(--theme-ink-primary) / 0.05)",
      }
    case "echo":
      return {
        backgroundColor: "hsl(var(--theme-dialogue-area-bg, 35 33% 97%))",
        color: "var(--theme-ink-primary-color)",
        border: "1px solid hsl(var(--theme-border-soft) / 0.85)",
        boxShadow: "0 1px 2px hsl(var(--theme-ink-primary) / 0.04)",
      }
    case "delegation-failed":
      return {
        backgroundColor: "hsl(38 90% 94%)",
        color: "hsl(38 55% 28%)",
        border: "1px solid hsl(38 60% 80%)",
        boxShadow: "0 1px 2px hsl(var(--theme-ink-primary) / 0.04)",
      }
    case "lead":
    default:
      return {
        backgroundColor: "hsl(var(--theme-surface-paper))",
        color: "var(--theme-ink-primary-color)",
        border: "1px solid hsl(var(--theme-border-soft))",
        boxShadow: "0 1px 2px hsl(var(--theme-ink-primary) / 0.06)",
      }
  }
}

/** Distinct chat bubble for multi-agent turns — equal weight, variant tint per agent. */
function AgentChatBubble({
  name,
  content,
  variant,
  grouped = false,
  card,
  chronicleChip,
  onOpenChronicleChip,
}: {
  name: string
  content: string
  variant: AgentBubbleVariant
  grouped?: boolean
  card?: AgentDialogueMessage["keeperCard"]
  chronicleChip?: AgentDialogueMessage["chronicleChip"]
  onOpenChronicleChip?: (chip: NonNullable<AgentDialogueMessage["chronicleChip"]>) => void
}) {
  const trimmed = content.trim()
  if (!trimmed && !card && !chronicleChip) return null

  const senderVariant: MessageSenderVariant =
    variant === "collaborator"
      ? "collaborator"
      : variant === "echo"
        ? "echo"
        : variant === "delegation-failed"
          ? "delegation-failed"
          : "agent"

  if (grouped) {
    return (
      <div className="dialog-voice-card" data-agent-variant={variant}>
        <div className="dialog-voice-card__rail" aria-hidden />
        <div className="dialog-voice-card__body">
          <MessageSenderLabel name={name} variant={senderVariant} />
          <div className="dialog-voice-card__content">
            <AgentMessageContent
              content={trimmed}
              card={card}
              chronicleChip={chronicleChip}
              onOpenChronicleChip={onOpenChronicleChip}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <MessageSenderLabel name={name} variant={senderVariant} />
      <div
        className="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
        style={agentBubbleSurface(variant)}
      >
        <AgentMessageContent
          content={trimmed}
          card={card}
          chronicleChip={chronicleChip}
          onOpenChronicleChip={onOpenChronicleChip}
        />
      </div>
    </div>
  )
}

function MessageSenderFooter({
  name,
  variant,
  timestamp,
  align = "end",
  timestampStyle,
}: {
  name: string
  variant: MessageSenderVariant
  timestamp: string
  align?: "start" | "end"
  timestampStyle?: React.CSSProperties
}) {
  return (
    <div
      className={clsx(
        "dialog-message-footer",
        align === "end" ? "dialog-message-footer--end" : "dialog-message-footer--start",
      )}
    >
      <MessageSenderLabel name={name} variant={variant} />
      <span className="text-xs" style={timestampStyle}>
        {timestamp}
      </span>
    </div>
  )
}

/**
 * Domain/Realm multi-select — shows who was engaged for this turn beneath the
 * lead reply. Honest engagement stamp (not fake sub-turn bubbles).
 */
function EngagedCollaboratorsStrip({
  collaborators,
}: {
  collaborators: ReadonlyArray<{ slug: string; label: string }>
}) {
  if (!collaborators.length) return null
  const labels = collaborators.map((c) => c.label).join(" · ")
  return (
    <div
      className="dialog-engaged-collaborators"
      aria-label={`Collaborating with ${labels}`}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
      }}
    >
      <span
        className="text-[10px]"
        style={{
          color: "hsl(var(--theme-ink-placeholder))",
          letterSpacing: "0.03em",
          marginRight: 2,
        }}
      >
        With
      </span>
      {collaborators.map((c) => (
        <span
          key={c.slug}
          className="text-[10px]"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "1px 6px",
            borderRadius: 999,
            border: "1px solid hsl(var(--treatment-color, var(--theme-focus-ring, 152 45% 42%)) / 0.28)",
            backgroundColor:
              "hsl(var(--treatment-color, var(--theme-focus-ring, 152 45% 42%)) / 0.12)",
            color: "var(--theme-ink-secondary-color)",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {c.label}
        </span>
      ))}
    </div>
  )
}

function MultiAgentTurnGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="dialog-multi-agent-turn">
      <div className="dialog-multi-agent-turn__body">{children}</div>
    </div>
  )
}

function AgentMessageTurn({
  message,
  agentName,
  echoAgentName,
  onOpenDraft,
  onOpenMoment,
  onOpenJourney,
  onOpenLibraryItem,
  onKeepAsMoment,
  onConfirmDraftUpdate,
  onApplyTreatmentProposal,
  applyingTreatmentProposal,
  onArrivalInvitation,
  onOpenChronicleChip,
}: {
  message: AgentDialogueMessage
  agentName: string
  echoAgentName?: string
  onOpenDraft?: (draftId: string) => void
  onOpenMoment?: (momentId: string) => void
  onOpenJourney?: (journeyId: string) => void
  onOpenLibraryItem?: (libraryItemId: string) => void
  onKeepAsMoment?: DialogueMessageListProps["onKeepAsMoment"]
  onConfirmDraftUpdate?: DialogueMessageListProps["onConfirmDraftUpdate"]
  onApplyTreatmentProposal?: DialogueMessageListProps["onApplyTreatmentProposal"]
  applyingTreatmentProposal?: boolean
  onArrivalInvitation?: (id: RealmInvitationId) => void
  onOpenChronicleChip?: (chip: NonNullable<AgentDialogueMessage["chronicleChip"]>) => void
}) {
  const castVoices = (message.castVoices ?? []).filter((voice) => {
    const content = voice.content?.trim()
    if (!content) return voice.status === "failed" || voice.status === "empty"
    return !isDirectorDelegationFailureContent(content)
  })
  const delegation =
    castVoices.length > 0 ? null : visibleDelegationBeat(message.delegation)
  const echo =
    message.echo?.content?.trim() && !isDirectorDelegationFailureContent(message.echo.content)
      ? message.echo
      : null
  const isMultiAgentTurn = Boolean(castVoices.length > 0 || delegation || echo)
  const resolvedAgentName = message.senderName?.trim() || agentName
  const visibleContent = sanitizeAgentMessageContent(message.content)

  if (!isMultiAgentTurn) {
    if (
      !visibleContent.trim()
      && !message.arrivalInvitations?.length
      && !message.keeperCard
      && !message.chronicleChip
    ) {
      return (
        <MessageAttachments
          message={message}
          onOpenDraft={onOpenDraft}
          onOpenMoment={onOpenMoment}
          onOpenJourney={onOpenJourney}
          onOpenLibraryItem={onOpenLibraryItem}
          onKeepAsMoment={onKeepAsMoment}
          onConfirmDraftUpdate={onConfirmDraftUpdate}
          onApplyTreatmentProposal={onApplyTreatmentProposal}
          applyingTreatmentProposal={applyingTreatmentProposal}
        />
      )
    }

    return (
      <div className="max-w-xl min-w-0">
        <GlossSurface
          messageId={message.id}
          anchor={buildMessageGlossAnchor(message.id, "body")}
          glossThreads={message.glossThreads}
          snapshot={{ label: "message", text: visibleContent.trim().slice(0, 280) }}
          highlightMode="border"
          affordancePlacement="border"
          className="rounded-2xl px-4 py-3 text-sm shadow-sm break-words"
          style={{
            backgroundColor: "hsl(var(--theme-surface-paper))",
            color: "var(--theme-ink-primary-color)",
            border: "1px solid hsl(var(--theme-border-soft))",
            boxShadow: "0 1px 2px hsl(var(--theme-ink-primary) / 0.06)",
          }}
        >
          <AgentMessageContent
            content={visibleContent}
            card={message.keeperCard}
            chronicleChip={message.chronicleChip}
            onOpenChronicleChip={onOpenChronicleChip}
          />
          {message.arrivalInvitations?.length && onArrivalInvitation ? (
            <RealmInvitationButtons
              invitations={message.arrivalInvitations}
              onInvite={onArrivalInvitation}
            />
          ) : null}
        </GlossSurface>
        <MessageAttachments
          message={message}
          onOpenDraft={onOpenDraft}
          onOpenMoment={onOpenMoment}
          onOpenJourney={onOpenJourney}
          onOpenLibraryItem={onOpenLibraryItem}
          onKeepAsMoment={onKeepAsMoment}
          onConfirmDraftUpdate={onConfirmDraftUpdate}
          onApplyTreatmentProposal={onApplyTreatmentProposal}
          applyingTreatmentProposal={applyingTreatmentProposal}
        />
        <MessageSenderFooter
          name={resolvedAgentName}
          variant="agent"
          timestamp={formatTime(message.createdAt)}
          timestampStyle={{ color: "var(--theme-ink-tertiary-color)" }}
        />
        <EngagedCollaboratorsStrip collaborators={message.engagedCollaborators ?? []} />
      </div>
    )
  }

  const leadName = echoAgentName ?? agentName

  return (
    <div className="max-w-xl min-w-0 space-y-2.5">
      <MultiAgentTurnGroup>
        {castVoices.map((voice, index) => (
          <AgentChatBubble
            key={`${voice.slug ?? voice.attributedTo ?? "voice"}-${index}`}
            grouped
            variant={
              voice.status === "failed" || voice.status === "empty"
                ? "delegation-failed"
                : "collaborator"
            }
            name={voice.attributedTo ?? "Agent"}
            content={
              voice.content?.trim()
              || `${voice.attributedTo ?? "Agent"} returned nothing this turn.`
            }
          />
        ))}
        {delegation && (
          <AgentChatBubble
            grouped
            variant={
              delegation.status === "failed" || delegation.status === "empty"
                ? "delegation-failed"
                : "collaborator"
            }
            name={delegation.attributedTo ?? "Agent"}
            content={delegation.content}
          />
        )}
        {message.content.trim() && (
          <AgentChatBubble
            grouped
            variant="lead"
            name={resolvedAgentName}
            content={sanitizeAgentMessageContent(message.content)}
            card={message.keeperCard}
            chronicleChip={message.chronicleChip}
            onOpenChronicleChip={onOpenChronicleChip}
          />
        )}
        {!message.content.trim() && (message.keeperCard || message.chronicleChip) ? (
          <AgentChatBubble
            grouped
            variant="lead"
            name={resolvedAgentName}
            content=""
            card={message.keeperCard}
            chronicleChip={message.chronicleChip}
            onOpenChronicleChip={onOpenChronicleChip}
          />
        ) : null}
        {echo && (
          <AgentChatBubble
            grouped
            variant="echo"
            name={echo.attributedTo ?? leadName}
            content={echo.content}
          />
        )}
      </MultiAgentTurnGroup>
      <MessageAttachments
        message={message}
        onOpenDraft={onOpenDraft}
        onOpenMoment={onOpenMoment}
        onOpenJourney={onOpenJourney}
        onKeepAsMoment={onKeepAsMoment}
        onConfirmDraftUpdate={onConfirmDraftUpdate}
        onApplyTreatmentProposal={onApplyTreatmentProposal}
        applyingTreatmentProposal={applyingTreatmentProposal}
      />
      <MessageSenderFooter
        name={resolvedAgentName}
        variant="agent"
        timestamp={formatTime(message.createdAt)}
        timestampStyle={{ color: "var(--theme-ink-tertiary-color)" }}
      />
      <EngagedCollaboratorsStrip collaborators={message.engagedCollaborators ?? []} />
    </div>
  )
}

function MessageAttachments({
  message,
  onOpenDraft,
  onOpenMoment,
  onOpenJourney,
  onOpenLibraryItem,
  onKeepAsMoment,
  onConfirmDraftUpdate,
  onApplyTreatmentProposal,
  applyingTreatmentProposal,
}: {
  message: AgentDialogueMessage
  onOpenDraft?: (draftId: string) => void
  onOpenMoment?: (momentId: string) => void
  onOpenJourney?: (journeyId: string) => void
  onOpenLibraryItem?: (libraryItemId: string) => void
  onKeepAsMoment?: DialogueMessageListProps["onKeepAsMoment"]
  onConfirmDraftUpdate?: DialogueMessageListProps["onConfirmDraftUpdate"]
  onApplyTreatmentProposal?: DialogueMessageListProps["onApplyTreatmentProposal"]
  applyingTreatmentProposal?: boolean
}) {
  return (
    <>
      {message.linkedCard && (
        <div className="mt-1">
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
        <div className="mt-2 space-y-2">
          {message.actionResults.filter(isVisibleActionResult).map((actionResult, idx) => {
            const receipt = normalizeActionReceipt(actionResult)
            const isPropose = receipt.type === "draft.update.propose" && receipt.status === "success"
            const isTreatmentPropose =
              receipt.type === "treatment.propose" && receipt.status === "success"
            const proposeData = receipt.data as {
              draftId?: string
              draftTitle?: string
              summary?: string
              proposedPayload?: { id: string; title?: string; summary?: string; status?: string; spec?: unknown }
            } | undefined
            const treatmentData = receipt.data as {
              summary?: string
              rationale?: string
              proposal?: DomainFrameTreatment
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
            if (
              isTreatmentPropose
              && treatmentData?.proposal
              && onApplyTreatmentProposal
            ) {
              return (
                <TreatmentProposeCard
                  key={idx}
                  summary={treatmentData.summary ?? "Treatment update"}
                  rationale={treatmentData.rationale}
                  proposal={treatmentData.proposal}
                  onApply={onApplyTreatmentProposal}
                  onDismiss={() => {}}
                  isApplying={applyingTreatmentProposal}
                />
              )
            }
            return (
              <ActionReceiptCard
                key={idx}
                receipt={receipt}
                glossMessageId={message.id}
                glossReceiptIndex={idx}
                glossThreads={message.glossThreads}
                contextNarrative={message.role === "agent" ? message.content : undefined}
                onOpenDraft={
                  receipt.data?.draft?.id ? (draftId) => onOpenDraft?.(draftId) : undefined
                }
                onOpenMoment={
                  receipt.data?.moment?.id ? (momentId) => onOpenMoment?.(momentId) : undefined
                }
                onOpenJourney={
                  receipt.data?.journey?.id ? (journeyId) => onOpenJourney?.(journeyId) : undefined
                }
                onOpenLibraryItem={
                  typeof receipt.data?.libraryItemId === "string"
                    ? (libraryItemId) => onOpenLibraryItem?.(libraryItemId)
                    : undefined
                }
                onKeepAsMoment={onKeepAsMoment}
              />
            )
          })}
        </div>
      )}
    </>
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
  /** Callback when a library item receipt is tapped — opens Chronicle focus */
  onOpenLibraryItem?: (libraryItemId: string) => void
  /** Callback when user confirms a proposed draft update */
  onConfirmDraftUpdate?: (draftId: string, payload: { title?: string; summary?: string; status?: string; spec?: unknown }) => void
  /** Callback when user applies a Rendr Treatment proposal on Design Board */
  onApplyTreatmentProposal?: (proposal: DomainFrameTreatment) => void
  /** True while a Treatment proposal is being saved */
  applyingTreatmentProposal?: boolean
  /** Callback when user keeps dialog content (e.g. generated image) as a moment */
  onKeepAsMoment?: (payload: KeepAsMomentPayload) => void | Promise<void>
  /** Agent name for empty state and thinking indicator (dynamic, not hardcoded) */
  agentName?: string
  /** Display name for the current user — shown on user message bubbles. */
  userName?: string
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
  /** Realm arrival — invitation buttons inside the welcome Dialog Response. */
  onArrivalInvitation?: (id: RealmInvitationId) => void
  /** Open Chronicle Document from an in-stream chronicle_update / Known Issue chip. */
  onOpenChronicleChip?: (chip: NonNullable<AgentDialogueMessage["chronicleChip"]>) => void
}

export const DialogueMessageList: React.FC<DialogueMessageListProps> = ({
  isLoading,
  messages,
  isSending,
  error,
  onOpenDraft,
  onOpenMoment,
  onOpenJourney,
  onOpenLibraryItem,
  onKeepAsMoment,
  onConfirmDraftUpdate,
  onApplyTreatmentProposal,
  applyingTreatmentProposal,
  agentName = "Agent",
  userName = "You",
  echoAgentName,
  agentBoardMessaging,
  horizonThinking = false,
  onArrivalInvitation,
  onOpenChronicleChip,
}) => (
  <div className="dialogue-message-list min-h-[24rem] space-y-4 overflow-x-hidden overflow-y-auto rounded-2xl px-4 py-4">
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
        if (message.role === "user") {
          const resolvedUserName = message.senderName?.trim() || userName
          return (
            <div key={message.id} className="flex w-full min-w-0 justify-end">
              <div className="max-w-xl min-w-0">
                <GlossSurface
                  messageId={message.id}
                  anchor={buildMessageGlossAnchor(message.id, "body")}
                  glossThreads={message.glossThreads}
                  snapshot={{ label: "your message", text: message.content.trim().slice(0, 280) }}
                  highlightMode="border"
                  affordancePlacement="border"
                  className="rounded-2xl px-4 py-3 text-sm text-white shadow-sm break-words"
                  style={{
                    backgroundColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))",
                    border: "1px solid hsl(var(--theme-dialogue-user-bg, 14 60% 56%) / 0.85)",
                  }}
                >
                  <p className="whitespace-pre-line break-words">{message.content}</p>
                </GlossSurface>
                <MessageSenderFooter
                  name={resolvedUserName}
                  variant="user"
                  timestamp={formatTime(message.createdAt)}
                  timestampStyle={{ color: "rgba(255,255,255,0.8)" }}
                />
              </div>
            </div>
          )
        }

        if (message.role === "system") {
          return (
            <div key={message.id} className="flex w-full min-w-0 justify-start" role="alert">
              <div className="w-full max-w-xl min-w-0">
                <AgentErrorAlert error={message.content} />
              </div>
            </div>
          )
        }

        return (
          <div key={message.id} className="flex w-full min-w-0 justify-start">
            <AgentMessageTurn
              message={message}
              agentName={agentName}
              echoAgentName={echoAgentName}
              onOpenDraft={onOpenDraft}
              onOpenMoment={onOpenMoment}
              onOpenJourney={onOpenJourney}
              onOpenLibraryItem={onOpenLibraryItem}
              onKeepAsMoment={onKeepAsMoment}
              onConfirmDraftUpdate={onConfirmDraftUpdate}
              onApplyTreatmentProposal={onApplyTreatmentProposal}
              applyingTreatmentProposal={applyingTreatmentProposal}
              onArrivalInvitation={onArrivalInvitation}
              onOpenChronicleChip={onOpenChronicleChip}
            />
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
      className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-sm shadow-sm ${
        isWarning
          ? "border-amber-400 bg-amber-50 text-amber-950"
          : "border-red-400 bg-red-50 text-red-900"
      }`}
      data-dialog-message="system-error"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isWarning ? "text-amber-600" : "text-red-600"}`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
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
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">
          System
        </span>
        <span className="font-semibold leading-snug">{presentation.title}</span>
        <span className="text-xs leading-relaxed opacity-90">{presentation.detail}</span>
      </div>
    </div>
  )
}

function isVisibleActionResult(actionResult: NonNullable<AgentDialogueMessage["actionResults"]>[number]): boolean {
  if (!actionResult || typeof actionResult !== "object") return false
  const receipt = normalizeActionReceipt(actionResult)
  if (receipt.status === "skipped" || receipt.status === "error") {
    return Boolean(receipt.message?.trim())
  }
  return true
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
