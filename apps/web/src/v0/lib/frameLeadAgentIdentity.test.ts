import { describe, expect, it, beforeEach, vi } from "vitest"
import {
  clearFrameLeadAgentDisplayNameCache,
  fetchFrameLeadAgentDisplayName,
  formatDomainLeadDisplayName,
  getCachedFrameLeadAgentDisplayName,
  KIP_FALLBACK_DISPLAY_NAME,
  readFrameLeadAgentSlug,
  resolveDialogAgentSlug,
  resolveLeadAgentId,
  resolvePlaybillLeadAgentSlug,
  STRICT_PLATFORM_AGENT_SLUGS,
} from "./frameLeadAgentIdentity"

vi.mock("../../lib/kipApi", () => ({
  KipApi: {
    getAgentBySlug: vi.fn(),
  },
}))

import { KipApi } from "../../lib/kipApi"

describe("frameLeadAgentIdentity", () => {
  beforeEach(() => {
    clearFrameLeadAgentDisplayNameCache()
    vi.mocked(KipApi.getAgentBySlug).mockReset()
  })

  it("resolvePlaybillLeadAgentSlug uses DB-enriched slug only", () => {
    expect(
      resolvePlaybillLeadAgentSlug("livecchi", { kip: { agent_id: "livecchi-us-lead" } }, {
        primaryAgentSlug: "livecchi-us-lead",
      }),
    ).toBe("livecchi-us-lead")
    expect(
      resolvePlaybillLeadAgentSlug("chuck", { kip: { agent_id: "ceox" } }),
    ).toBeNull()
  })

  it("readFrameLeadAgentSlug returns null for kip default and synthetic slugs", () => {
    expect(readFrameLeadAgentSlug({ kip: { agent_id: "kip" } })).toBeNull()
    expect(readFrameLeadAgentSlug({ kip: { agent_id: "kip-default" } })).toBeNull()
    expect(readFrameLeadAgentSlug(null)).toBeNull()
    expect(readFrameLeadAgentSlug({ kip: { agent_id: " livecchi-us-lead " } })).toBeNull()
    expect(readFrameLeadAgentSlug({ kip: { agent_id: "chuck-livecchi-lead" } })).toBeNull()
  })

  it("readFrameLeadAgentSlug returns non-synthetic mirror slugs", () => {
    expect(readFrameLeadAgentSlug({ kip: { agent_id: "ceox" } })).toBe("ceox")
  })

  it("fetchFrameLeadAgentDisplayName resolves agent name and caches", async () => {
    vi.mocked(KipApi.getAgentBySlug).mockResolvedValue({
      name: "Vecchio",
      slug: "livecchi-us-lead",
    } as Awaited<ReturnType<typeof KipApi.getAgentBySlug>>)

    await expect(fetchFrameLeadAgentDisplayName("livecchi-us-lead")).resolves.toBe("Vecchio")
    expect(getCachedFrameLeadAgentDisplayName("livecchi-us-lead")).toBe("Vecchio")
    expect(KipApi.getAgentBySlug).toHaveBeenCalledTimes(1)

    await expect(fetchFrameLeadAgentDisplayName("livecchi-us-lead")).resolves.toBe("Vecchio")
    expect(KipApi.getAgentBySlug).toHaveBeenCalledTimes(1)
  })

  it("fetchFrameLeadAgentDisplayName falls back for kip slug", async () => {
    await expect(fetchFrameLeadAgentDisplayName("kip")).resolves.toBe(KIP_FALLBACK_DISPLAY_NAME)
    expect(KipApi.getAgentBySlug).not.toHaveBeenCalled()
  })

  it("formatDomainLeadDisplayName formats ceox", () => {
    expect(formatDomainLeadDisplayName("ceox")).toBe("CeoX")
    expect(formatDomainLeadDisplayName("CeoX")).toBe("CeoX")
    expect(formatDomainLeadDisplayName("chuck-lead")).toBe("Chuck lead")
  })

  it("resolveDialogAgentSlug prefers DB slug over frame mirror", () => {
    expect(
      resolveDialogAgentSlug({ kip: { agent_id: "livecchi-us-lead" } }, {
        primaryAgentSlug: "livecchi-us-lead",
      }),
    ).toBe("livecchi-us-lead")
  })

  it("resolveDialogAgentSlug falls back to kip without DB enrichment", () => {
    sessionStorage.setItem("keeper:missing-lead-slugs", JSON.stringify(["ceox"]))
    clearFrameLeadAgentDisplayNameCache()
    sessionStorage.setItem("keeper:missing-lead-slugs", JSON.stringify(["ceox"]))
    expect(resolveDialogAgentSlug({ kip: { agent_id: "ceox" } })).toBe("kip")
    clearFrameLeadAgentDisplayNameCache()
  })

  it("resolveLeadAgentId does not fall back for domain lead slugs", async () => {
    vi.mocked(KipApi.getAgentBySlug).mockRejectedValueOnce(new Error("not found"))

    await expect(resolveLeadAgentId("chuck-livecchi-lead")).rejects.toThrow(
      /chuck-livecchi-lead agent is not available/,
    )
    expect(KipApi.getAgentBySlug).toHaveBeenCalledTimes(1)
  })

  it("resolveLeadAgentId does not fall back for strict platform agents", async () => {
    expect(STRICT_PLATFORM_AGENT_SLUGS.has("rendr")).toBe(true)
    vi.mocked(KipApi.getAgentBySlug).mockRejectedValueOnce(new Error("not found"))

    await expect(
      resolveLeadAgentId("rendr", { allowKipFallback: false }),
    ).rejects.toThrow(/rendr agent is not available/)
    expect(KipApi.getAgentBySlug).toHaveBeenCalledTimes(1)
  })

  it("resolveLeadAgentId retries strict platform agents after a failed lookup", async () => {
    vi.mocked(KipApi.getAgentBySlug)
      .mockRejectedValueOnce(new Error("not found"))
      .mockResolvedValueOnce({
        id: "rendr-uuid",
        slug: "rendr",
        name: "Rendr",
      } as Awaited<ReturnType<typeof KipApi.getAgentBySlug>>)

    await expect(
      resolveLeadAgentId("rendr", { allowKipFallback: false }),
    ).rejects.toThrow(/rendr agent is not available/)

    await expect(
      resolveLeadAgentId("rendr", { allowKipFallback: false }),
    ).resolves.toBe("rendr-uuid")
    expect(KipApi.getAgentBySlug).toHaveBeenCalledTimes(2)
  })
})
