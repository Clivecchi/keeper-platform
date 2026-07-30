import { describe, expect, it } from "vitest"
import {
  AGENT_BOARD_ECHO_SESSION_NAME,
  DOMAIN_LEAD_COLLABORATION_SESSION_NAME,
  findSessionIdByName,
  isEchoSessionName,
  pickBestDialogSessionId,
} from "./kipDialogSession"

describe("isEchoSessionName", () => {
  it("recognizes Agent Board and Domain collaboration Echo sessions", () => {
    expect(isEchoSessionName(AGENT_BOARD_ECHO_SESSION_NAME)).toBe(true)
    expect(isEchoSessionName(DOMAIN_LEAD_COLLABORATION_SESSION_NAME)).toBe(true)
    expect(isEchoSessionName("Agent Board")).toBe(false)
    expect(isEchoSessionName("")).toBe(false)
  })
})

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

  it("never resumes an Echo side-session as the primary board session", () => {
    const id = pickBestDialogSessionId(
      [
        {
          id: "echo-session",
          agent_id: "kip-uuid",
          session_name: AGENT_BOARD_ECHO_SESSION_NAME,
          updated_at: "2026-07-30T12:00:00.000Z",
          messageCount: 40,
        },
        {
          id: "primary-session",
          agent_id: "kip-uuid",
          session_name: "Agent Board",
          updated_at: "2026-07-29T12:00:00.000Z",
          messageCount: 3,
        },
      ],
      "kip-uuid",
    )
    expect(id).toBe("primary-session")
  })

  it("returns null when only Echo side-sessions exist for the agent", () => {
    const id = pickBestDialogSessionId(
      [
        {
          id: "echo-session",
          agent_id: "kip-uuid",
          session_name: DOMAIN_LEAD_COLLABORATION_SESSION_NAME,
          updated_at: "2026-07-30T12:00:00.000Z",
          messageCount: 8,
        },
      ],
      "kip-uuid",
    )
    expect(id).toBeNull()
  })
})

describe("findSessionIdByName", () => {
  it("finds an Echo session by exact name for ensure/create paths", () => {
    const id = findSessionIdByName(
      [
        {
          id: "primary",
          agent_id: "kip-uuid",
          session_name: "Agent Board",
        },
        {
          id: "echo",
          agent_id: "kip-uuid",
          session_name: AGENT_BOARD_ECHO_SESSION_NAME,
        },
      ],
      AGENT_BOARD_ECHO_SESSION_NAME,
      "kip-uuid",
    )
    expect(id).toBe("echo")
  })
})
