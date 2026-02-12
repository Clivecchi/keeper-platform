/**
 * DialogueMessageList
 * Renders a scrollable list of agent conversation messages with action receipts.
 * Extracted from KipAgentBoardPage for reuse in the new Agent Board frame.
 */

import React from "react"
import clsx from "clsx"
import { LinkedCard } from "../props/LinkedCard"
import { ActionReceiptCard } from "../kip/ActionReceiptCard"
import type { AgentDialogueMessage } from "./types"
import { normalizeActionReceipt } from "./types"
import { formatTime } from "./helpers"

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
  /** Agent name for empty state and thinking indicator (dynamic, not hardcoded) */
  agentName?: string
}

export const DialogueMessageList: React.FC<DialogueMessageListProps> = ({
  isLoading,
  messages,
  isSending,
  error,
  onOpenDraft,
  agentName = "Agent",
}) => (
  <div
    className="min-h-[24rem] space-y-4 overflow-y-auto rounded-2xl px-4 py-4"
    style={{ backgroundColor: 'var(--theme-dialogue-area-bg, hsl(35, 33%, 97%))' }}
  >
    {isLoading ? (
      <>
        <SkeletonBubble alignment="left" />
        <SkeletonBubble alignment="right" />
      </>
    ) : messages.length === 0 ? (
      <div
        className="rounded-xl border border-dashed bg-white/70 p-6 text-center text-sm text-gray-500"
        style={{ borderColor: 'var(--theme-dialogue-border, hsl(35, 20%, 88%))' }}
      >
        Say hello to {agentName} to start the conversation.
      </div>
    ) : (
      messages.map((message) => (
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
              message.role === "user" ? "text-white" : "text-gray-900",
            )}
            style={{
              backgroundColor:
                message.role === "user"
                  ? "var(--theme-dialogue-user-bg, hsl(14, 60%, 56%))"
                  : "var(--theme-dialogue-agent-bg, white)",
            }}
          >
            <p className="whitespace-pre-line">{message.content}</p>
            {message.linkedCard && (
              <div className="mt-3">
                <LinkedCard {...message.linkedCard} variant="inline" />
              </div>
            )}
            {message.actionResults && message.actionResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.actionResults.map((actionResult, idx) => {
                  const receipt = normalizeActionReceipt(actionResult)
                  return (
                    <ActionReceiptCard
                      key={idx}
                      receipt={receipt}
                      onOpenDraft={
                        receipt.data?.draft?.id
                          ? (draftId) => onOpenDraft?.(draftId)
                          : undefined
                      }
                    />
                  )
                })}
              </div>
            )}
            <span
              className={clsx(
                "mt-2 block text-xs",
                message.role === "user" ? "text-white/80" : "text-gray-500",
              )}
            >
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>
      ))
    )}
    {isSending && (
      <p className="text-xs text-gray-500">{agentName} is thinking…</p>
    )}
    {error && (
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          error.toLowerCase().includes("credits") ||
          error.toLowerCase().includes("quota")
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
          {error.toLowerCase().includes("credits") ||
          error.toLowerCase().includes("quota") ? (
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
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
          <span className="font-medium">
            {error.toLowerCase().includes("credits") ||
            error.toLowerCase().includes("quota")
              ? "AI Model Needs Credits"
              : "Something went wrong"}
          </span>
          <span className="text-xs opacity-80">{error}</span>
        </div>
      </div>
    )}
  </div>
)

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
