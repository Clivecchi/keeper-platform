import { describe, expect, it } from "vitest"
import {
  isPlatformDomainSlug,
  isWorkspaceBoardAvailableForDomain,
  resolveAvailableWorkspaceBoardIds,
  resolveDefaultWorkspaceBoardId,
  resolveWorkspaceBoardLinks,
} from "./domainWorkspaceBoards"

describe("domainWorkspaceBoards", () => {
  it("treats default slug as platform domain", () => {
    expect(isPlatformDomainSlug("default")).toBe(true)
    expect(isPlatformDomainSlug("DEFAULT")).toBe(true)
    expect(isPlatformDomainSlug("livecchi")).toBe(false)
  })

  it("platform domain includes Realm, Domain, Build, Design, Agent", () => {
    expect(resolveAvailableWorkspaceBoardIds("default")).toEqual([
      "realm",
      "domain",
      "ide",
      "designer",
      "agent",
    ])
  })

  it("labels the ide workspace as Build", () => {
    const links = resolveWorkspaceBoardLinks("default")
    expect(links.find((board) => board.id === "ide")?.label).toBe("Build")
    expect(links.map((board) => board.label)).toEqual([
      "Realm",
      "Domain",
      "Build",
      "Design",
      "Agent",
    ])
  })

  it("member domains get Realm, Domain, and Agent only", () => {
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

  it("defaults to Realm board", () => {
    expect(resolveDefaultWorkspaceBoardId("livecchi")).toBe("realm")
    expect(resolveDefaultWorkspaceBoardId("default")).toBe("realm")
  })
})
