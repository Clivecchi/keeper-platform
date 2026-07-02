import { describe, expect, it, beforeEach, vi } from "vitest"
import {
  clearFrameLeadAgentDisplayNameCache,
  fetchFrameLeadAgentDisplayName,
  getCachedFrameLeadAgentDisplayName,
  KIP_FALLBACK_DISPLAY_NAME,
  readFrameLeadAgentSlug,
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

  it("readFrameLeadAgentSlug returns null for kip default", () => {
    expect(readFrameLeadAgentSlug({ kip: { agent_id: "kip" } })).toBeNull()
    expect(readFrameLeadAgentSlug(null)).toBeNull()
  })

  it("readFrameLeadAgentSlug returns trimmed slug", () => {
    expect(readFrameLeadAgentSlug({ kip: { agent_id: " livecchi-us-lead " } })).toBe(
      "livecchi-us-lead",
    )
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
})
