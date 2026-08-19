import { describe, expect, it } from "vitest"
import { getAgentErrorPresentation } from "./errorPresentation"

describe("getAgentErrorPresentation", () => {
  it("titles the failure with the speaking agent", () => {
    const presentation = getAgentErrorPresentation(
      "Ceox is not configured correctly for this board.",
      "Ceox",
    )
    expect(presentation.title).toBe("Ceox could not respond")
  })

  it("treats a lost session as session expiry, not a generic Kip failure", () => {
    const presentation = getAgentErrorPresentation(
      "This conversation session could not be found. Send again to continue.",
      "Ceox",
    )
    expect(presentation.title).toBe("Session expired")
  })
})
