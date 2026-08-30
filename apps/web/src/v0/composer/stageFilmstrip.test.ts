// @vitest-environment node
import { describe, expect, it } from "vitest"
import { resolveStageFilmstrip } from "./stageFilmstrip"

const emptyBeat = { you: null, answer: null }

describe("resolveStageFilmstrip", () => {
  it("uses the existing story title as the first text_slide", () => {
    const slides = resolveStageFilmstrip({
      stageTitle: "Keeper",
      storyTitle: "Finding the Plot",
      beat: emptyBeat,
      waiting: false,
    })
    expect(slides).toHaveLength(1)
    expect(slides[0]).toMatchObject({
      id: "title",
      slideType: "text_slide",
      kind: "title",
      title: "Finding the Plot",
    })
  })

  it("falls back to the Stage name when no story title exists", () => {
    const slides = resolveStageFilmstrip({
      stageTitle: "Keeper",
      beat: emptyBeat,
      waiting: false,
    })
    expect(slides[0]?.title).toBe("Keeper Stage")
  })

  it("adds the current beat as a later text_slide, not a special Now surface", () => {
    const slides = resolveStageFilmstrip({
      stageTitle: "Keeper",
      storyTitle: "Finding the Plot",
      beat: {
        you: { name: "Chuck", text: "Where is the story?" },
        answer: { name: "Kip", text: "On the filmstrip." },
      },
      waiting: false,
    })
    expect(slides.map((slide) => slide.id)).toEqual(["title", "now"])
    expect(slides[1]?.slideType).toBe("text_slide")
    expect(slides[1]?.body).toContain("Where is the story?")
    expect(slides[1]?.body).toContain("On the filmstrip.")
  })
})
