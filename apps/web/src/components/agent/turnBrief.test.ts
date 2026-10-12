import { describe, expect, it } from "vitest"
import { turnBrief } from "./turnBrief"

describe("turnBrief", () => {
  it("keeps a short outcome intact", () => {
    const text = "No visual change is verified yet."
    expect(turnBrief(text)).toEqual({ shown: text, folded: null })
  })

  it("puts the outcome and the next step ahead of the rest", () => {
    const text = [
      "You want a visible change, not another explanation.",
      "No visual change is verified yet; a Chronicle palette proposal does not fix the wall of text.",
      "Cloud owns the response-renderer change, and the next check is the transcript fold.",
      "This Lead turn lacks the repository-write capability to implement it, so the detail stays available without leading the reply.",
    ].join(" ")
    const brief = turnBrief(text)
    expect(brief.shown.startsWith("You want a visible change")).toBe(true)
    expect(brief.shown).toContain("next check")
    expect(brief.shown.length).toBeLessThan(220)
    expect(brief.shown).not.toContain("palette proposal")
    expect(brief.folded).toContain("palette proposal")
  })
})
