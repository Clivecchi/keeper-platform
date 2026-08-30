import { displayStageTitle, type StageNowBeatModel } from "./stageNowBeat"

/** Already named in jsonframe spec — story beats, not a new SlideType. */
export const STAGE_SLIDE_TYPE_TEXT = "text_slide" as const

export type StageSlideType = typeof STAGE_SLIDE_TYPE_TEXT

export type StageSlideKind = "title" | "beat"

export type StageSlide = {
  id: string
  slideType: StageSlideType
  kind: StageSlideKind
  title: string
  body: string
}

function excerpt(text: string, max = 280): string {
  const trimmed = text.replace(/\s+/g, " ").trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}…`
}

function beatBody(beat: StageNowBeatModel, waiting: boolean): string {
  const parts: string[] = []
  if (beat.you) parts.push(`${beat.you.name}: ${excerpt(beat.you.text)}`)
  if (waiting && !beat.answer) parts.push("The room is answering…")
  else if (beat.answer) parts.push(`${beat.answer.name}: ${excerpt(beat.answer.text)}`)
  return parts.join("\n\n")
}

/**
 * Derived filmstrip — no Prisma table.
 * Slide 1 is the title that already exists (Talking in, else Stage name).
 * The current beat is a later text_slide, not a special Now surface.
 */
export function resolveStageFilmstrip(input: {
  stageTitle: string
  storyTitle?: string | null
  domainLabel?: string | null
  beat: StageNowBeatModel
  waiting: boolean
}): StageSlide[] {
  const stageName = displayStageTitle(input.stageTitle, input.domainLabel)
  const heading = input.storyTitle?.trim() || stageName
  const slides: StageSlide[] = [
    {
      id: "title",
      slideType: STAGE_SLIDE_TYPE_TEXT,
      kind: "title",
      title: heading,
      body:
        heading === stageName
          ? "The story has a name. Speak from the lectern."
          : `On ${stageName}.`,
    },
  ]

  if (input.beat.you || input.beat.answer || input.waiting) {
    slides.push({
      id: "now",
      slideType: STAGE_SLIDE_TYPE_TEXT,
      kind: "beat",
      title: input.beat.answer?.name || input.beat.you?.name || "Now",
      body: beatBody(input.beat, input.waiting),
    })
  }

  return slides
}
