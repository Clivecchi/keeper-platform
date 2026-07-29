import { describe, expect, it } from "vitest"
import { pickBestDialogSessionId } from "./kipDialogSession"

describe("pickBestDialogSessionId", () => {
  it("prefers sessions for the requested agent", () => {
    const id = pickBestDialogSessionId(
      [
        {
          id: "kip-session",
          agent_id: "kip-uuid",
          updated_at: "2026-07-07T00:00:00.000Z",
          messageCount: 5,
        },
        {
          id: "rendr-session",
          agent_id: "rendr-uuid",
          updated_at: "2026-07-06T00:00:00.000Z",
          messageCount: 1,
        },
      ],
      "rendr-uuid",
    )
    expect(id).toBe("rendr-session")
  })

  it("falls back to the Dialog's best session when agent has none", () => {
    const id = pickBestDialogSessionId(
      [
        {
          id: "kip-session",
          agent_id: "kip-uuid",
          updated_at: "2026-07-07T00:00:00.000Z",
          messageCount: 2,
        },
      ],
      "rendr-uuid",
    )
    expect(id).toBe("kip-session")
  })

  it("returns null only when the Dialog has no sessions", () => {
    expect(pickBestDialogSessionId([], "kip-uuid")).toBeNull()
  })
})
