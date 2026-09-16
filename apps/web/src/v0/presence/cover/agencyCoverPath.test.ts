// @vitest-environment node
import { describe, expect, it } from "vitest"
import { judgeAgencyCoverPath } from "./agencyCoverPath"
import type { AgencyPlaceFacts } from "./agencyPlace"

function baseFacts(overrides: Partial<AgencyPlaceFacts> = {}): AgencyPlaceFacts {
  return {
    domainId: "ke3p",
    domainName: "KE3P",
    domainSlug: "ke3p",
    entrusted: {
      ownerName: "Chuck Livecchi",
      ownerUserId: "chuck",
      leadName: "Kip",
      leadRole: "Lead",
      peopleCount: 1,
    },
    contract: {
      name: "Keeper Agent Contract",
      version: "1.1",
      enforcementMode: "warn",
    },
    lens: { name: "Domain Lens", source: "default" },
    lastPerformance: {
      messageId: "m1",
      dialogId: "finding-the-plot",
      dialogTitle: "Finding the Plot",
      recordedAt: "2026-09-13T22:05:52.350Z",
      agentId: "kip",
      agentName: "Kip",
      layers: [
        { key: "lead_judgment", label: "Lead Judgment", status: "recorded" },
        { key: "domain_lens", label: "Domain Lens", status: "recorded" },
        { key: "domain_contract", label: "Domain Contract", status: "recorded" },
      ],
    },
    ...overrides,
  }
}

describe("judgeAgencyCoverPath", () => {
  it("names Finding the Plot as Now and working Agency as Present", () => {
    const path = judgeAgencyCoverPath(baseFacts())
    expect(path.map((reach) => reach.role)).toEqual(["now", "present"])
    expect(path[0]?.item.label).toBe("Finding the Plot")
    expect(path[0]?.item.navigate).toBe("dialog")
    expect(path[1]?.item.label).toBe("Keeper's working Agency")
    expect(path[1]?.item.navigate).toBe("inspect")
    expect(path.some((reach) => reach.role === "needsYou")).toBe(false)
    expect(path.some((reach) => reach.role === "becoming")).toBe(false)
  })

  it("omits Now when there is no named last performance", () => {
    const path = judgeAgencyCoverPath(baseFacts({ lastPerformance: null }))
    expect(path.map((reach) => reach.role)).toEqual(["present"])
    expect(path[0]?.item.label).toBe("Keeper's working Agency")
  })

  it("omits Present when environment and performance evidence are missing", () => {
    const path = judgeAgencyCoverPath(
      baseFacts({
        contract: null,
        lens: null,
        lastPerformance: null,
      }),
    )
    expect(path).toEqual([])
  })

  it("returns nothing when facts are missing", () => {
    expect(judgeAgencyCoverPath(null)).toEqual([])
  })
})
