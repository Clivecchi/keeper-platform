// @vitest-environment node
import { describe, expect, it } from "vitest"
import { resolveStageFilmstrip } from "./stageFilmstrip"

const emptyBeat = { you: null, answer: null }

describe("resolveStageFilmstrip", () => {
  it("uses the domain Cover as Root, not a text title", () => {
    const slides = resolveStageFilmstrip({
      wordmark: "ke3p",
      tagline: "Becoming together",
      domainLabel: "ke3p",
      beat: emptyBeat,
      waiting: false,
    })
    expect(slides).toHaveLength(1)
    expect(slides[0]).toMatchObject({
      id: "root",
      slideType: "domain_cover",
      kind: "root",
      title: "ke3p",
      body: "Becoming together",
    })
  })

  it("adds the current beat after Root — that is the selected story in progress", () => {
    const slides = resolveStageFilmstrip({
      wordmark: "ke3p",
      beat: {
        you: { name: "Chuck", text: "Where is the story?" },
        answer: { name: "Kip", text: "After Forward." },
      },
      waiting: false,
    })
    expect(slides.map((slide) => slide.kind)).toEqual(["root", "beat"])
    expect(slides[1]?.slideType).toBe("text_slide")
    expect(slides[1]?.body).toContain("Where is the story?")
  })

  it("keeps the domain Root in front of a persisted story", () => {
    const slides = resolveStageFilmstrip({
      wordmark: "ke3p",
      tagline: "Becoming together",
      beat: emptyBeat,
      waiting: false,
      persisted: [
        { id: "s2", slideType: "text_slide", kind: "beat", title: "The gap", body: "Stage is not the story." },
      ],
    })
    expect(slides.map((slide) => slide.title)).toEqual(["ke3p", "The gap"])
    expect(slides[0]?.slideType).toBe("domain_cover")
  })
})
