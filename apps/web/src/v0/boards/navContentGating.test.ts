// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { NavPanelDef } from "./UniversalBoardDefinition"
import {
  shouldRenderContentGatedBlock,
  type NavContentCountSnapshot,
} from "./navContentGating"

const emptyCounts: NavContentCountSnapshot = {
  dialogs: 0,
  journeys: 0,
  keepers: 0,
  drafts: 0,
  agents: 0,
  library: 0,
  chatter: 0,
  connections: 0,
}

const staticNav: NavPanelDef = {
  sections: {
    dialogs: true,
    journeys: true,
    keepers: true,
    drafts: true,
    agents: true,
    library: true,
  },
}

describe("shouldRenderContentGatedBlock", () => {
  it("shows all blocks in static mode even when counts are zero", () => {
    expect(shouldRenderContentGatedBlock("journeys", staticNav, emptyCounts)).toBe(true)
    expect(shouldRenderContentGatedBlock("keepers", staticNav, emptyCounts)).toBe(true)
  })

  it("hides empty entity blocks when contentGated", () => {
    const nav: NavPanelDef = { ...staticNav, navMode: "contentGated" }
    expect(shouldRenderContentGatedBlock("journeys", nav, emptyCounts)).toBe(false)
    expect(shouldRenderContentGatedBlock("library", nav, emptyCounts)).toBe(false)
  })

  it("keeps navAlwaysShow blocks visible when empty", () => {
    const nav: NavPanelDef = {
      ...staticNav,
      navMode: "contentGated",
      navAlwaysShow: ["dialogs"],
    }
    expect(shouldRenderContentGatedBlock("dialogs", nav, emptyCounts)).toBe(true)
    expect(shouldRenderContentGatedBlock("journeys", nav, emptyCounts)).toBe(false)
  })

  it("shows blocks while counts are still loading", () => {
    const nav: NavPanelDef = { ...staticNav, navMode: "contentGated" }
    const loadingCounts: NavContentCountSnapshot = {
      ...emptyCounts,
      journeys: null,
    }
    expect(shouldRenderContentGatedBlock("journeys", nav, loadingCounts)).toBe(true)
  })

  it("does not gate non-entity blocks like integrations", () => {
    const nav: NavPanelDef = { ...staticNav, navMode: "contentGated" }
    expect(shouldRenderContentGatedBlock("integrations", nav, emptyCounts)).toBe(true)
    expect(shouldRenderContentGatedBlock("boards", nav, emptyCounts)).toBe(true)
  })
})
