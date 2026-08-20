// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  AGENT_BOARD_DEF,
  DESIGNER_BOARD_DEF,
  DOMAIN_BOARD_DEF,
  REALM_BOARD_DEF,
} from "./UniversalBoardDefinition"

describe("DESIGNER_BOARD_DEF nav", () => {
  it("surfaces Dialog, Session, Chatter, and Drafts before Glossary and Board Definitions", () => {
    expect(DESIGNER_BOARD_DEF.nav.sections.dialogs).toBe(true)
    expect(DESIGNER_BOARD_DEF.nav.sections.sessions).toBe(true)
    expect(DESIGNER_BOARD_DEF.nav.sections.drafts).toBe(true)
    expect(DESIGNER_BOARD_DEF.nav.navBlockOrder).toEqual([
      "dialogs",
      "sessions",
      "chatter",
      "drafts",
      "glossary",
      "boardDefs",
    ])
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
