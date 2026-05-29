import { describe, expect, it } from "vitest"
import { parseComposedPromptSections } from "./composedPromptPreview"

describe("parseComposedPromptSections", () => {
  it("splits domain lens from identity in the first block", () => {
    const text = [
      "Down to earth CTO voice.",
      "You are Kip, the Lead Agent.",
      "Mode: DOMAIN. Output style: normal.",
    ].join("\n\n")
    const sections = parseComposedPromptSections(text)
    expect(sections.some((s) => s.kind === "domain-lens")).toBe(true)
    expect(sections.some((s) => s.title === "Identity & mode")).toBe(true)
  })

  it("collapses environment JSON into a technical section", () => {
    const text = [
      "You are Kip.",
      'Environment context (resolved via KAM):\n{\n  "version": "env-v1"\n}',
    ].join("\n\n")
    const sections = parseComposedPromptSections(text)
    const env = sections.find((s) => s.kind === "technical")
    expect(env?.title).toBe("Platform environment")
    expect(env?.defaultOpen).toBe(false)
  })
})
