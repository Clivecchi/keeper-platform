// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  AGENT_BOARD_DEF,
  BUILD_BOARD_DEF,
  DESIGNER_BOARD_DEF,
  DOMAIN_BOARD_DEF,
  REALM_BOARD_DEF,
} from "./UniversalBoardDefinition"
import {
  boardHasConfigPane,
  configBlockEnabled,
  paneBlocksFor,
  paneForNavBlock,
  resolveConfigBlockOrder,
} from "./navPanes"

describe("nav panes", () => {
  it("puts Dialogs, Drafts, Chatter, and Library on Universal for every board", () => {
    for (const def of [
      BUILD_BOARD_DEF,
      AGENT_BOARD_DEF,
      DOMAIN_BOARD_DEF,
      REALM_BOARD_DEF,
      DESIGNER_BOARD_DEF,
    ]) {
      const blocks = paneBlocksFor(def, "universal")
      expect(blocks).toContain("dialogs")
      expect(blocks).toContain("drafts")
      expect(blocks).toContain("chatter")
      expect(blocks).toContain("library")
      expect(blocks).not.toContain("integrations")
      expect(blocks).not.toContain("agents")
      if (def.boardId === "realm") {
        expect(blocks).toContain("stage")
      } else {
        expect(blocks).not.toContain("stage")
      }
    }
  })

  it("puts Stage on Realm Universal only — launch, not a board", () => {
    expect(paneBlocksFor(REALM_BOARD_DEF, "universal")).toContain("stage")
    expect(paneBlocksFor(REALM_BOARD_DEF, "config")).not.toContain("stage")
    expect(paneForNavBlock("stage")).toBe("universal")
    expect(paneBlocksFor(DOMAIN_BOARD_DEF, "universal")).not.toContain("stage")
    expect(paneBlocksFor(BUILD_BOARD_DEF, "universal")).not.toContain("stage")
  })

  it("keeps Design Sessions on Universal only", () => {
    expect(paneBlocksFor(DESIGNER_BOARD_DEF, "universal")).toContain("sessions")
    expect(paneBlocksFor(DOMAIN_BOARD_DEF, "universal")).not.toContain("sessions")
  })

  it("puts Keepers and Journeys on the Keepers pane", () => {
    expect(paneBlocksFor(BUILD_BOARD_DEF, "keepers")).toEqual(["keepers", "journeys"])
  })

  it("keeps Build Config as integrations, keys, and capabilities", () => {
    const config = paneBlocksFor(BUILD_BOARD_DEF, "config")
    expect(config).toEqual(["integrations", "keys", "capabilities"])
    expect(config).not.toContain("drafts")
    expect(config).not.toContain("dialogs")
  })

  it("keeps Domain Config as glossary, external access, and boards", () => {
    expect(paneBlocksFor(DOMAIN_BOARD_DEF, "config")).toEqual([
      "glossary",
      "externalAccess",
      "boards",
    ])
  })

  it("keeps Agent Config as agents plus access summaries", () => {
    expect(paneBlocksFor(AGENT_BOARD_DEF, "config")).toEqual([
      "agents",
      "aiAccess",
      "externalAccess",
    ])
  })

  it("keeps Design Config as glossary and board definitions", () => {
    expect(paneBlocksFor(DESIGNER_BOARD_DEF, "config")).toEqual(["glossary", "boardDefs"])
  })

  it("reports a Config pane on every current board", () => {
    expect(boardHasConfigPane(BUILD_BOARD_DEF)).toBe(true)
    expect(boardHasConfigPane(AGENT_BOARD_DEF)).toBe(true)
    expect(boardHasConfigPane(DOMAIN_BOARD_DEF)).toBe(true)
    expect(boardHasConfigPane(REALM_BOARD_DEF)).toBe(true)
    expect(boardHasConfigPane(DESIGNER_BOARD_DEF)).toBe(true)
  })

  it("does not treat Dialogs as a Config block", () => {
    expect(configBlockEnabled(BUILD_BOARD_DEF, "dialogs")).toBe(false)
    expect(paneForNavBlock("dialogs")).toBe("universal")
    expect(paneForNavBlock("keepers")).toBe("keepers")
    expect(paneForNavBlock("capabilities")).toBe("config")
  })

  it("orders Config from navBlockOrder without appending Universal remainder", () => {
    expect(resolveConfigBlockOrder(BUILD_BOARD_DEF)).not.toContain("drafts")
    expect(resolveConfigBlockOrder(DOMAIN_BOARD_DEF)).not.toContain("dialogs")
  })
})
