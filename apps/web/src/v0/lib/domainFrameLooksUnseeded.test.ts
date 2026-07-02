import { describe, expect, it } from "vitest"
import type { DomainFrameJson } from "../data/domain-frame.types"
import { domainFrameLooksUnseeded } from "./domainFrameLooksUnseeded"

const platformFallbackFrame = {
  domain: "livecchi-us",
  keeper_type: "platform",
  theme: { wordmark: "KE3P", tagline: "cryptically designed, wonderfully underfolded" },
  kip: { agent_id: "kip-default", greeting: "Hello. What would you like to keep today?" },
  kip_context: { admin: "Platform admin. Full context available." },
} as DomainFrameJson

describe("domainFrameLooksUnseeded", () => {
  it("detects platform fallback on personal domains", () => {
    expect(domainFrameLooksUnseeded(platformFallbackFrame, "livecchi-us", "livecchi.us")).toBe(true)
  })

  it("detects domain wordmark with platform tagline", () => {
    const frame = {
      domain: "livecchi-us",
      keeper_type: "domain",
      theme: { wordmark: "livecchi.us", tagline: "cryptically designed, wonderfully underfolded" },
    } as DomainFrameJson
    expect(domainFrameLooksUnseeded(frame, "livecchi-us", "livecchi.us")).toBe(true)
  })

  it("returns false when wordmark matches domain name and tagline is personal", () => {
    const frame = {
      domain: "livecchi-us",
      keeper_type: "domain",
      theme: { wordmark: "livecchi.us", tagline: "Realm of the old ones" },
      kip: { agent_id: "livecchi-us-lead", greeting: "Welcome to livecchi.us." },
    } as DomainFrameJson
    expect(domainFrameLooksUnseeded(frame, "livecchi-us", "livecchi.us")).toBe(false)
  })

  it("never treats the platform default hub as unseeded", () => {
    expect(domainFrameLooksUnseeded(platformFallbackFrame, "default", "Default")).toBe(false)
  })
})
