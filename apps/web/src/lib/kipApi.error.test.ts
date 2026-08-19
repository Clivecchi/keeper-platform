import { describe, expect, it } from "vitest"
import { formatKipRunErrorMessage, normalizeKipRunErrorCode } from "./kipApi"

describe("normalizeKipRunErrorCode", () => {
  it("keeps AGENT_MISCONFIGURED for a missing agent record", () => {
    expect(
      normalizeKipRunErrorCode("AGENT_MISCONFIGURED", "Agent with ID 'abc' not found"),
    ).toBe("AGENT_MISCONFIGURED")
  })

  it("does not treat session/dialog misses as agent misconfiguration", () => {
    expect(
      normalizeKipRunErrorCode("AGENT_MISCONFIGURED", "Session with ID 'x' not found"),
    ).toBe("UNKNOWN")
    expect(
      normalizeKipRunErrorCode("AGENT_MISCONFIGURED", "Dialog not found in this domain"),
    ).toBe("UNKNOWN")
  })
})

describe("formatKipRunErrorMessage", () => {
  it("names the speaking agent, not always Kip", () => {
    const message = formatKipRunErrorMessage(
      "AGENT_MISCONFIGURED",
      "Agent with ID 'abc' not found",
      undefined,
      "Ceox",
    )
    expect(message).toContain("Ceox")
    expect(message).not.toMatch(/^Kip /)
  })

  it("explains a lost session instead of blaming agent config", () => {
    const message = formatKipRunErrorMessage(
      "UNKNOWN",
      "Failed to fetch session memory: Session with ID 'x' not found",
    )
    expect(message.toLowerCase()).toContain("session")
    expect(message.toLowerCase()).not.toContain("not configured correctly")
  })
})
