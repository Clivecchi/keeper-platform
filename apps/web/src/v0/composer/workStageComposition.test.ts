import { describe, expect, it } from "vitest"
import { projectStoryPass } from "@keeper/shared"
import { selectPerformedFrame, workCompositionSlides } from "./workStageComposition"

describe("workCompositionSlides", () => {
  it("composes the selected work and not Where are we?", () => {
    const slides = workCompositionSlides({
      workId: "dlg-plot",
      workTitle: "Finding the Plot",
    })
    const projected = projectStoryPass({
      context: { scope: "domain", domainId: "ke3p", audience: "admin", arriving: true },
      slides,
    })
    const texts = projected.reading.items.map((item) => item.text)
    expect(texts).toContain("Finding the Plot")
    expect(texts.join(" ")).not.toMatch(/Where are we/)
    expect(projected.composition.id).toBe("pass-story")
    expect(slides[0]?.body).toBe("No slides in this Dialog yet.")
  })
})

describe("selectPerformedFrame", () => {
  const frames = [
    { messageId: "older", title: "First holding", slideCount: 2 },
    { messageId: "newer", title: "Later note", slideCount: 1 },
  ]

  it("prefers the frame taken to Stage, then a stored source, then the latest", () => {
    expect(selectPerformedFrame({
      frames,
      focusMessageId: "older",
      storySourceIds: ["newer"],
    })?.messageId).toBe("older")
    expect(selectPerformedFrame({
      frames,
      storySourceIds: ["older"],
    })?.messageId).toBe("older")
    expect(selectPerformedFrame({ frames })?.messageId).toBe("newer")
  })
})
