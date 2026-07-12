import { describe, expect, it } from "vitest"
import {
  frameLeadMirrorNeedsSync,
  isFrameLeadMirrorPlaceholder,
  isUsableFrameLeadMirrorSlug,
  patchFrameLeadAgentMirror,
  readFrameLeadAgentMirror,
} from "./domainLeadMirror.js"

describe("domainLeadMirror", () => {
  it("readFrameLeadAgentMirror returns trimmed mirror slug", () => {
    expect(readFrameLeadAgentMirror({ kip: { agent_id: " livecchi-us-lead " } })).toBe(
      "livecchi-us-lead",
    )
    expect(readFrameLeadAgentMirror(null)).toBeNull()
  })

  it("frameLeadMirrorNeedsSync when mirror diverges from authoritative slug", () => {
    expect(
      frameLeadMirrorNeedsSync({ kip: { agent_id: "livecchi-us-lead" } }, "livecchi-us-lead"),
    ).toBe(false)
    expect(frameLeadMirrorNeedsSync({ kip: { agent_id: "kip" } }, "livecchi-us-lead")).toBe(true)
    expect(frameLeadMirrorNeedsSync(null, "livecchi-us-lead")).toBe(true)
  })

  it("patchFrameLeadAgentMirror preserves frame shape", () => {
    expect(
      patchFrameLeadAgentMirror(
        { theme: { wordmark: "livecchi.us" }, kip: { agent_id: "kip" } },
        "livecchi-us-lead",
      ),
    ).toEqual({
      theme: { wordmark: "livecchi.us" },
      kip: { agent_id: "livecchi-us-lead" },
    })
  })

  it("isUsableFrameLeadMirrorSlug rejects placeholders and kip defaults", () => {
    expect(isUsableFrameLeadMirrorSlug("livecchi-us-lead")).toBe(true)
    expect(isUsableFrameLeadMirrorSlug("kip")).toBe(false)
    expect(isUsableFrameLeadMirrorSlug("kip-default")).toBe(false)
    expect(isUsableFrameLeadMirrorSlug("")).toBe(false)
  })

  it("isFrameLeadMirrorPlaceholder detects synthetic provision slugs", () => {
    expect(isFrameLeadMirrorPlaceholder("livecchi-us-lead")).toBe(true)
    expect(isFrameLeadMirrorPlaceholder("ceox")).toBe(false)
  })
})
