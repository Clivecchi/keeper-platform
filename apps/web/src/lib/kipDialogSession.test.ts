import { describe, expect, it } from "vitest"
import { pickBestDialogSessionId } from "./kipDialogSession"

describe("pickBestDialogSessionId", () => {
  it("prefers the most recent session that has messages", () => {
    const sessionId = pickBestDialogSessionId([
      { id: "empty-new", updated_at: "2026-06-28T20:00:00Z", kip_messages: [] },
      { id: "with-msgs", updated_at: "2026-06-28T10:00:00Z", kip_messages: [{ id: "1" }] },
    ])
    expect(sessionId).toBe("with-msgs")
  })

  it("falls back to the newest session when none have messages", () => {
    const sessionId = pickBestDialogSessionId([
      { id: "older", updated_at: "2026-06-27T10:00:00Z", kip_messages: [] },
      { id: "newer", updated_at: "2026-06-28T10:00:00Z", kip_messages: [] },
    ])
    expect(sessionId).toBe("newer")
  })

  it("returns null for an empty list", () => {
    expect(pickBestDialogSessionId([])).toBeNull()
  })
})
