import { describe, expect, it } from "vitest"
import { projectStoryPass } from "@keeper/shared"
import { workCompositionSlides } from "./workStageComposition"

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
  })
})
