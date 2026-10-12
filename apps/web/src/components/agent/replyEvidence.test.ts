// @vitest-environment node
import { describe, expect, it } from "vitest"
import { separateReplyEvidence } from "./replyEvidence"

describe("separateReplyEvidence", () => {
  it("keeps a short answer as the reply", () => {
    expect(separateReplyEvidence("The room is ready.")).toEqual({
      prose: "The room is ready.",
      evidence: null,
    })
  })

  it("moves a directory listing and tool JSON out of the reply", () => {
    const text = [
      "Cloud read the allowlist.",
      "apps/api/src/api/kip/agents.ts",
      "apps/web/src/v0/boards/UniversalConversation.tsx",
      "packages/shared/src/framePerformance.ts",
      "",
      '{"sha":"d549cc86","path":"apps/api/src/api/kip/action-allowlist.ts","truncated":false}',
    ].join("\n")
    const split = separateReplyEvidence(text)
    expect(split.prose).toBe("Cloud read the allowlist.")
    expect(split.evidence).toContain("agents.ts")
    expect(split.evidence).toContain('"sha"')
  })

  it("keeps a fenced file body as evidence and leaves a sentence when nothing else remains", () => {
    const split = separateReplyEvidence("```ts\nexport const x = 1\n```")
    expect(split.prose).toBe("The detail is in Evidence.")
    expect(split.evidence).toContain("export const x")
  })
})
