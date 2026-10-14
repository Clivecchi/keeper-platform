import { describe, expect, it } from "vitest"
import { ANTHROPIC_MODEL_TIMEOUT_MS, keepAnthropicPartial } from "./ModelProviderService.js"

describe("Cloud's Anthropic budget", () => {
  it("outlasts the 110s abort that returned no text", () => {
    expect(ANTHROPIC_MODEL_TIMEOUT_MS).toBeGreaterThanOrEqual(170_000)
  })

  it("keeps text that already arrived when the budget ends", () => {
    expect(keepAnthropicPartial("  The slides live on the Stage sequence.  ")).toBe(
      "The slides live on the Stage sequence.",
    )
    expect(keepAnthropicPartial("   ")).toBeNull()
  })
})
