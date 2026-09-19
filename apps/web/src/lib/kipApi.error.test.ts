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

  it("does not invent INVALID_MODEL from a capability mismatch that mentions model and not", () => {
    expect(
      normalizeKipRunErrorCode(
        "UNKNOWN",
        "this model does not support image content",
      ),
    ).toBe("UNKNOWN")
  })

  it("trusts a server INVALID_MODEL code", () => {
    expect(
      normalizeKipRunErrorCode("INVALID_MODEL", "model: claude-sonnet-4-6"),
    ).toBe("INVALID_MODEL")
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

  it("makes a failed sibling fallback visible instead of repeating only the preference", () => {
    const message = formatKipRunErrorMessage(
      "INVALID_MODEL",
      "model: claude-sonnet-4-6",
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        offeringId: "anthropic:claude-sonnet-4-6",
        fallbackUsed: true,
        preferenceModel: "claude-sonnet-4-6",
      },
      "Ceox",
    )
    expect(message).toContain("sibling offering")
    expect(message).toContain("anthropic:claude-sonnet-4-6")
  })
})
