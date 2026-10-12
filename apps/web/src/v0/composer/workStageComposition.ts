import type { StoryPassSlide } from "@keeper/shared"

export type PerformedFrameRef = {
  messageId: string
  title: string
  slideCount: number
}

/**
 * Which Frame the selected Dialog is performing.
 * An explicit Take to Stage wins. A persisted live source is next.
 * Otherwise the latest Frame in this Dialog.
 */
export function selectPerformedFrame(input: {
  frames: readonly PerformedFrameRef[]
  focusMessageId?: string | null
  storySourceIds?: readonly string[]
}): PerformedFrameRef | null {
  if (input.frames.length === 0) return null
  const focus = input.focusMessageId?.trim()
  if (focus) {
    const match = input.frames.find((frame) => frame.messageId === focus)
    if (match) return match
  }
  const linked = new Set((input.storySourceIds ?? []).map((id) => id.trim()).filter(Boolean))
  for (let index = input.frames.length - 1; index >= 0; index -= 1) {
    const frame = input.frames[index]
    if (frame && linked.has(frame.messageId)) return frame
  }
  return input.frames[input.frames.length - 1] ?? null
}

/**
 * Slides for the selected work.
 * The domain filmstrip and Where are we? are not this reading.
 * An empty body means this Dialog has no Frame yet.
 */
export function workCompositionSlides(input: {
  workId: string
  workTitle: string
}): StoryPassSlide[] {
  const id = input.workId.trim()
  const title = input.workTitle.trim() || "Work in hand"
  return [
    {
      id,
      title,
      body: "No slides in this Dialog yet.",
      kind: "beat",
    },
  ]
}
