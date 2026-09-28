import { promotedDialogFrame, type FramePerformance } from "@keeper/shared"

export type DialogSurfaceTurn = {
  id: string
  role: "user" | "agent" | "system"
  framePerformance?: FramePerformance | null
}

/**
 * Conversation fills the Dialog. A Frame takes that surface only when the
 * latest turn was authorized — Lead or an explicit human request — and stamped.
 * Stage already owns the surface. Sending returns to the transcript.
 */
export function dialogSurfaceFrame(input: {
  messages: readonly DialogSurfaceTurn[]
  dismissedMessageId: string | null
  isSending: boolean
  stageOwnsSurface: boolean
}): { messageId: string; performance: FramePerformance } | null {
  if (input.stageOwnsSurface || input.isSending) return null
  const latest = input.messages[input.messages.length - 1]
  if (!latest || latest.role !== "agent" || latest.id === input.dismissedMessageId) return null
  const performance = promotedDialogFrame(latest.framePerformance)
  if (!performance) return null
  return { messageId: latest.id, performance }
}
