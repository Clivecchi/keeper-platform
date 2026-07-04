import { describe, expect, it } from "vitest"
import {
  isPlatformDomainSlug,
  isWorkspaceBoardAvailableForDomain,
  resolveAvailableWorkspaceBoardIds,
  resolveDefaultWorkspaceBoardId,
} from "./domainWorkspaceBoards"

describe("domainWorkspaceBoards", () => {
  it("treats default slug as platform domain", () => {
    expect(isPlatformDomainSlug("default")).toBe(true)
    expect(isPlatformDomainSlug("DEFAULT")).toBe(true)
    expect(isPlatformDomainSlug("livecchi")).toBe(false)
  })

  it("platform domain includes IDE and Design", () => {
    expect(resolveAvailableWorkspaceBoardIds("default")).toEqual([
      "realm",
      "domain",
      "ide",
      "designer",
      "agent",
    ])
  })

  it("member domains get Domain and Agent only (plus Realm home)", () => {
    expect(resolveAvailableWorkspaceBoardIds("livecchi")).toEqual([
      "realm",
      "domain",
      "agent",
    ])
    expect(isWorkspaceBoardAvailableForDomain("ide", "livecchi")).toBe(false)
    expect(isWorkspaceBoardAvailableForDomain("designer", "livecchi")).toBe(false)
    expect(isWorkspaceBoardAvailableForDomain("domain", "livecchi")).toBe(true)
    expect(isWorkspaceBoardAvailableForDomain("agent", "livecchi")).toBe(true)
  })

  it("defaults to domain board", () => {
    expect(resolveDefaultWorkspaceBoardId("livecchi")).toBe("domain")
    expect(resolveDefaultWorkspaceBoardId("default")).toBe("domain")
  })
})
