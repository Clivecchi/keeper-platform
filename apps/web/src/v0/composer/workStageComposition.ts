import type { StoryPassSlide } from "@keeper/shared"

/**
 * Slides for the selected work.
 * The domain filmstrip and Where are we? are not this reading.
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
      body: "",
      kind: "beat",
    },
  ]
}
