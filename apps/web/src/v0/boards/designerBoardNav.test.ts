// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  AGENT_BOARD_DEF,
  DESIGNER_BOARD_DEF,
  DOMAIN_BOARD_DEF,
  REALM_BOARD_DEF,
} from "./UniversalBoardDefinition"
import { paneBlocksFor } from "./navPanes"

describe("DESIGNER_BOARD_DEF nav", () => {
  it("surfaces Dialog, Session, Chatter, Drafts, and Library on Universal", () => {
    expect(DESIGNER_BOARD_DEF.nav.sections.dialogs).toBe(true)
    expect(DESIGNER_BOARD_DEF.nav.sections.sessions).toBe(true)
    expect(DESIGNER_BOARD_DEF.nav.sections.drafts).toBe(true)
    expect(paneBlocksFor(DESIGNER_BOARD_DEF, "universal")).toEqual([
      "dialogs",
      "sessions",
      "drafts",
      "chatter",
      "library",
    ])
  })

  it("puts Glossary and Board Definitions on Config, not Universal", () => {
    expect(paneBlocksFor(DESIGNER_BOARD_DEF, "config")).toEqual(["glossary", "boardDefs"])
    expect(DESIGNER_BOARD_DEF.nav.navBlockOrder).toEqual(["glossary", "boardDefs"])
  })

  it("does not replace Design Nav with Realm Stages", () => {
    expect(DESIGNER_BOARD_DEF.nav.navStages).toBeUndefined()
  })

  it("does not turn Sessions on for other boards by default", () => {
    expect(DOMAIN_BOARD_DEF.nav.sections.sessions).toBeUndefined()
    expect(REALM_BOARD_DEF.nav.sections.sessions).toBeUndefined()
    expect(AGENT_BOARD_DEF.nav.sections.sessions).toBeUndefined()
  })
})
