import { describe, expect, it } from "vitest"
import {
  nameLooksLikeHostClip,
  resolvePlaybillDomainLabel,
  resolvePlaybillStarName,
} from "./domainLeadBindings.js"

describe("nameLooksLikeHostClip", () => {
  it("treats Liv as a clip of livecchi.biz", () => {
    expect(nameLooksLikeHostClip("Liv", "livecchi.biz")).toBe(true)
    expect(nameLooksLikeHostClip("liv", "livecchi.biz")).toBe(true)
  })

  it("does not clip a full hostname or a distinct lead", () => {
    expect(nameLooksLikeHostClip("livecchi.biz", "livecchi.biz")).toBe(false)
    expect(nameLooksLikeHostClip("Kip", "default")).toBe(false)
    expect(nameLooksLikeHostClip("vecch.io", "livecchi.us")).toBe(false)
  })
})

describe("resolvePlaybillDomainLabel", () => {
  it("promotes the slug when the name is a short clip of it", () => {
    expect(
      resolvePlaybillDomainLabel({ domainName: "Liv", domainSlug: "livecchi.biz" }),
    ).toBe("livecchi.biz")
  })

  it("keeps a real billing name", () => {
    expect(
      resolvePlaybillDomainLabel({ domainName: "KE3P", domainSlug: "default" }),
    ).toBe("KE3P")
    expect(
      resolvePlaybillDomainLabel({
        domainName: "livecchi.us",
        domainSlug: "livecchi.us",
      }),
    ).toBe("livecchi.us")
  })
})

describe("resolvePlaybillStarName", () => {
  it("uses the domain label instead of Agent when the lead is uncast", () => {
    expect(
      resolvePlaybillStarName({
        domainName: "Liv",
        domainSlug: "livecchi.biz",
        agentDisplayName: null,
        isUncast: true,
        isLoading: false,
      }),
    ).toBe("livecchi.biz")
  })

  it("uses the domain label when the provisioned lead is named after the domain", () => {
    expect(
      resolvePlaybillStarName({
        domainName: "Liv",
        domainSlug: "livecchi.biz",
        agentDisplayName: "Liv",
        isUncast: false,
        isLoading: false,
      }),
    ).toBe("livecchi.biz")
    expect(
      resolvePlaybillStarName({
        domainName: "livecchi.biz",
        domainSlug: "livecchi.biz",
        agentDisplayName: "livecchi.biz",
        isUncast: false,
        isLoading: false,
      }),
    ).toBe("livecchi.biz")
  })

  it("keeps a distinct cast lead on the marquee", () => {
    expect(
      resolvePlaybillStarName({
        domainName: "KE3P",
        domainSlug: "default",
        agentDisplayName: "Kip",
        isUncast: false,
        isLoading: false,
      }),
    ).toBe("Kip")
    expect(
      resolvePlaybillStarName({
        domainName: "livecchi.us",
        domainSlug: "livecchi.us",
        agentDisplayName: "vecch.io",
        isUncast: false,
        isLoading: false,
      }),
    ).toBe("vecch.io")
  })
})
