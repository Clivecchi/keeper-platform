// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  DOMAIN_COVER_TERRAIN_LIMITS,
  judgeDomainCoverPath,
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
    expect(judged[0]?.items.map((item) => item.id)).toEqual(["m1", "m2"])
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

describe("judgeDomainCoverPath", () => {
  it("reads as one path with roles, not warehouse bands", () => {
    const path = judgeDomainCoverPath([
      {
        title: "Recent Moments",
        items: [
          { id: "m1", label: "Finding the Plot", preview: "Meaning takes form.", navigateKind: "moment" },
        ],
      },
      {
        title: "Moving",
        items: [{ id: "j1", label: "Keeper", preview: "The product story.", navigateKind: "journey" }],
      },
      {
        title: "Present",
        items: [
          { id: "j2", label: "Agency", navigateKind: "journey" },
          { id: "j3", label: "Pool Keeper", preview: "Available to encounter.", navigateKind: "journey" },
        ],
      },
    ])

    expect(path.map((reach) => [reach.role, reach.item.id])).toEqual([
      ["now", "m1"],
      ["needsYou", "j2"],
      ["becoming", "j1"],
      ["present", "j3"],
    ])
  })

  it("does not invent a second Needs you or duplicate a reach", () => {
    const path = judgeDomainCoverPath([
      {
        title: "Present",
        items: [
          { id: "a", label: "Open A", navigateKind: "journey" },
          { id: "b", label: "Open B", navigateKind: "journey" },
        ],
      },
      {
        title: "Moving",
        items: [{ id: "a", label: "Open A again", navigateKind: "journey" }],
      },
    ])

    expect(path.filter((reach) => reach.role === "needsYou")).toHaveLength(1)
    expect(path.filter((reach) => reach.item.id === "a")).toHaveLength(1)
  })
})
