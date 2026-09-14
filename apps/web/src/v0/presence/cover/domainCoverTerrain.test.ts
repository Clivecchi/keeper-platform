// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  DOMAIN_COVER_TERRAIN_LIMITS,
  judgeDomainCoverTerrain,
} from "./domainCoverTerrain"

describe("judgeDomainCoverTerrain", () => {
  it("keeps judged Domain terrain in map order and drops warehouse extras", () => {
    const judged = judgeDomainCoverTerrain([
      {
        title: "Present",
        items: [
          { id: "p1", label: "Settled A", navigateKind: "journey" },
          { id: "p2", label: "Settled B", navigateKind: "journey" },
          { id: "p3", label: "Settled C", navigateKind: "journey" },
        ],
      },
      {
        title: "Recent Moments",
        items: [
          { id: "m1", label: "Beat 1", navigateKind: "moment" },
          { id: "m2", label: "Beat 2", navigateKind: "moment" },
          { id: "m3", label: "Beat 3", navigateKind: "moment" },
          { id: "m4", label: "Beat 4", navigateKind: "moment" },
        ],
      },
      {
        title: "Moving",
        items: [
          { id: "j1", label: "Live", navigateKind: "journey" },
          { id: "j2", label: "Also live", navigateKind: "journey" },
        ],
      },
      {
        title: "Sessions",
        items: [{ id: "s1", label: "Not terrain", navigateKind: "session" }],
      },
    ])

    expect(judged.map((section) => section.title)).toEqual([
      "Recent Moments",
      "Moving",
      "Present",
    ])
    expect(judged[0]?.items).toHaveLength(DOMAIN_COVER_TERRAIN_LIMITS["Recent Moments"])
    expect(judged[0]?.items.map((item) => item.id)).toEqual(["m1", "m2", "m3"])
    expect(judged[1]?.prominence).toBe("path")
    expect(judged[2]?.items).toHaveLength(DOMAIN_COVER_TERRAIN_LIMITS.Present)
    expect(judged[2]?.prominence).toBe("settled")
  })

  it("omits empty or unwired sections so Cover does not invent warehouse rows", () => {
    expect(
      judgeDomainCoverTerrain([
        { title: "Recent Moments", items: [] },
        { title: "Moving", items: [{ id: "  ", label: "Blank", navigateKind: "journey" }] },
        { title: "Present", items: [{ id: "p1", label: "No kind" }] },
      ]),
    ).toEqual([])
  })
})
