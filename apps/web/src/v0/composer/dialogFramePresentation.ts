import { promotedDialogFrame, type FramePerformance } from "@keeper/shared"

export type DialogSurfaceTurn = {
  id: string
  role: "user" | "agent" | "system"
  content?: string
  framePerformance?: FramePerformance | null
}

export type DialogTurnSurface =
  | { kind: "work" }
  | { kind: "frame"; messageId: string; performance: FramePerformance }
  | { kind: "reply"; messageId: string; text: string }

/**
 * The Dialog Frame's current slide.
 * While a turn runs, the slide is the work.
 * When the output is determined, that output replaces the work in the same frame.
 * On Stage the cover stays up until this turn is actually running or just finished.
 */
export function dialogTurnSurface(input: {
  messages: readonly DialogSurfaceTurn[]
  dismissedMessageId: string | null
  /** An earlier turn's Frame, opened from its own control. */
  openedMessageId?: string | null
  isSending: boolean
  stageOwnsSurface: boolean
  /** This turn just finished. Hold its output in the frame until dismissed. */
  holdOutput: boolean
  /**
   * This Dialog’s Stage filmstrip is the current performance.
   * A plain reply does not cover those slides.
   */
  filmstripCoversStage?: boolean
}): DialogTurnSurface | null {
  if (input.isSending) return { kind: "work" }

  if (!input.stageOwnsSurface && input.openedMessageId) {
    const opened = input.messages.find((message) => message.id === input.openedMessageId)
    const openedPerformance = opened && opened.role === "agent"
      ? promotedDialogFrame(opened.framePerformance)
      : null
    if (opened && openedPerformance) {
      return { kind: "frame", messageId: opened.id, performance: openedPerformance }
    }
  }

  const latest = input.messages[input.messages.length - 1]
  if (!latest || latest.role !== "agent" || latest.id === input.dismissedMessageId) return null

  const performance = promotedDialogFrame(latest.framePerformance)
  if (performance) {
    // Stage presents this Frame on the canvas. The Dialog overlay does not cover it.
    if (input.stageOwnsSurface) return null
    return { kind: "frame", messageId: latest.id, performance }
  }
  if (!input.stageOwnsSurface || !input.holdOutput) return null
  if (input.filmstripCoversStage) return null
  const text = latest.content?.trim() ?? ""
  if (!text) return null
  return { kind: "reply", messageId: latest.id, text }
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
