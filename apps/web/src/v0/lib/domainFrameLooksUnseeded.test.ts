import { describe, expect, it } from "vitest"
import type { DomainFrameJson } from "../data/domain-frame.types"
import { domainFrameLooksUnseeded } from "./domainFrameLooksUnseeded"

const baseFrame = {
  domain: "livecchi-us",
  theme: { wordmark: "KE3P", tagline: "" },
} as DomainFrameJson

describe("domainFrameLooksUnseeded", () => {
  it("detects platform fallback on personal domains", () => {
    expect(domainFrameLooksUnseeded(baseFrame, "livecchi-us", "livecchi.us")).toBe(true)
  })

  it("returns false when wordmark matches domain name", () => {
    const frame = {
      ...baseFrame,
      theme: { wordmark: "livecchi.us", tagline: "Realm of the old ones" },
    } as DomainFrameJson
    expect(domainFrameLooksUnseeded(frame, "livecchi-us", "livecchi.us")).toBe(false)
  })

  it("never treats the platform default hub as unseeded", () => {
    expect(domainFrameLooksUnseeded(baseFrame, "default", "Default")).toBe(false)
  })
})
