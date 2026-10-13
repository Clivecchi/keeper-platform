import { describe, expect, it } from "vitest"
import { consumeAgentRunSse } from "./kipApi"

function sseResponse(text: string): Response {
  const bytes = new TextEncoder().encode(text)
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const mid = Math.max(1, Math.floor(bytes.length / 2))
      controller.enqueue(bytes.slice(0, mid))
      controller.enqueue(bytes.slice(mid))
      controller.close()
    },
  })
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } })
}

describe("consumeAgentRunSse", () => {
  it("reads a done event after a heartbeat, including CRLF framing", async () => {
    const payload = { success: true, data: { data: { response: "The slides are still there." } } }
    const text = `: ping 1\r\n\r\nevent: done\r\ndata: ${JSON.stringify(payload)}\r\n\r\n`
    const result = await consumeAgentRunSse(sseResponse(text))
    expect(result).toEqual(payload)
  })

  it("fails when the stream closes without a done or error event", async () => {
    const text = "event: status\ndata: {\"label\":\"Preparing…\"}\n\n"
    await expect(consumeAgentRunSse(sseResponse(text))).rejects.toThrow(
      "Agent stream ended without a result",
    )
  })
})
