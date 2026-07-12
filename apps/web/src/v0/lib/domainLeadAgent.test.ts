import { describe, expect, it } from "vitest"
import { resolveDialogLeadSlug, resolveDomainLeadContext } from "./domainLeadAgent"

describe("domainLeadAgent", () => {
  it("resolveDomainLeadContext uses API-enriched slug only", () => {
    expect(
      resolveDomainLeadContext({
        leadAgentId: "vecchio-uuid",
        leadAgentSlug: "livecchi-us-lead",
        leadAgentName: "Vecchio",
      }),
    ).toEqual({
      id: "vecchio-uuid",
      slug: "livecchi-us-lead",
      name: "Vecchio",
      isUncast: false,
    })
  })

  it("resolveDomainLeadContext is uncast without enriched slug", () => {
    expect(resolveDomainLeadContext({ leadAgentName: "Vecchio" })).toEqual({
      id: null,
      slug: null,
      name: "Vecchio",
      isUncast: true,
    })
    expect(resolveDomainLeadContext(null)).toEqual({
      id: null,
      slug: null,
      name: null,
      isUncast: true,
    })
  })

  it("resolveDialogLeadSlug falls back to platform kip when uncast", () => {
    expect(resolveDialogLeadSlug(null)).toBe("kip")
    expect(resolveDialogLeadSlug({ leadAgentSlug: "ceox" })).toBe("ceox")
    expect(resolveDialogLeadSlug({ leadAgentSlug: "ceox" }, "rendr")).toBe("ceox")
  })
})
