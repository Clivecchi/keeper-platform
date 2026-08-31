import {
  domainCoverRootSlide,
  withDomainCoverRoot,
  type StageSlideKind,
  type StageSlideType,
  type StageStorySlide,
} from "@keeper/shared"
import { type StageNowBeatModel } from "./stageNowBeat"

export type { StageSlideKind, StageSlideType }

export type StageSlide = StageStorySlide

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
 * Domain presentations: Root is always the Cover (`domain_cover`).
 * Forward opens the selected story (beats). Agents do not author the Root.
 */
export function resolveStageFilmstrip(input: {
  wordmark?: string | null
  tagline?: string | null
  domainLabel?: string | null
  beat: StageNowBeatModel
  waiting: boolean
  persisted?: ReadonlyArray<StageSlide> | null
}): StageSlide[] {
  const root = domainCoverRootSlide({
    wordmark: input.wordmark,
    tagline: input.tagline,
    domainLabel: input.domainLabel,
  })

  if (input.persisted && input.persisted.length > 0) {
    return withDomainCoverRoot(input.persisted, root)
  }

  const slides: StageSlide[] = [root]
  if (input.beat.you || input.beat.answer || input.waiting) {
    slides.push({
      id: "now",
      slideType: "text_slide",
      kind: "beat",
      title: input.beat.answer?.name || input.beat.you?.name || "Now",
      body: beatBody(input.beat, input.waiting),
    })
  }
  return slides
}
