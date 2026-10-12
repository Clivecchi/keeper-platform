import { describe, expect, it } from "vitest"
import { actionResultsToThinkingSteps } from "./dialogThinking"

describe("actionResultsToThinkingSteps", () => {
  it("keeps a tool failure to one short progress line", () => {
    const steps = actionResultsToThinkingSteps(
      [
        {
          type: "mcp.call",
          status: "error",
          message: `github_repo_read: GitHub file not found: apps/web/src/components/dialog. ${"Nearby entries. ".repeat(20)}`,
          data: { tool: "github_repo_read" },
        },
      ],
      0,
    )
    expect(steps[0]?.label.length).toBeLessThanOrEqual(96)
    expect(steps[0]?.label).toContain("github_repo_read")
  })
})
