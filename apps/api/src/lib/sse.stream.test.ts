import { describe, expect, it } from "vitest"
import { agentResultForStream } from "./sse.js"

describe("agentResultForStream", () => {
  it("drops the prompt and raw model text from the stream result", () => {
    const slim = agentResultForStream({
      action: "lead_interaction",
      data: {
        response: "What you can do now.",
        composedSystemPrompt: "x".repeat(180_000),
        model_response_raw: "{\"response\":\"long\"}",
        actions: [{ type: "mcp.call" }],
      },
    })
    expect(slim.data.response).toBe("What you can do now.")
    expect(slim.data.actions).toHaveLength(1)
    expect(slim.data).not.toHaveProperty("composedSystemPrompt")
    expect(slim.data).not.toHaveProperty("model_response_raw")
  })
})
