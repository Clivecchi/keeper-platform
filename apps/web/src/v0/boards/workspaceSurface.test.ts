// @vitest-environment node
import { describe, expect, it } from "vitest"
import { isDomainStageArrival, nextWorkspaceSurface, shouldRenderRealmDocumentChronicle } from "./workspaceSurface"

describe("nextWorkspaceSurface", () => {
  it("enters Stage when opening the room or inspecting a presence", () => {
    expect(nextWorkspaceSurface("open-stage")).toBe("stage")
    expect(nextWorkspaceSurface("stage-presence")).toBe("stage")
  })

  it("keeps Stage open across domain and board changes during arrival", () => {
    expect(nextWorkspaceSurface("domain-change", { arriving: true })).toBe("stage")
    expect(nextWorkspaceSurface("board-change", { arriving: true })).toBe("stage")
  })

  it("returns to Dialog when arrival is over, or when someone chooses a subject", () => {
    expect(nextWorkspaceSurface("domain-change")).toBe("dialog")
    expect(nextWorkspaceSurface("board-change", { arriving: false })).toBe("dialog")
    expect(nextWorkspaceSurface("platform-nav", { arriving: true })).toBe("dialog")
    expect(nextWorkspaceSurface("leave-stage", { arriving: true })).toBe("dialog")
  })
})

describe("isDomainStageArrival", () => {
  it("opens Stage for a domain or brand entry with no Dialog link", () => {
    expect(isDomainStageArrival({ shellMode: "domain", dialogId: null })).toBe(true)
    expect(isDomainStageArrival({ shellMode: "brand" })).toBe(true)
  })

  it("opens Stage for Realm home, and stays in Dialog for a Dialog deep link", () => {
    expect(isDomainStageArrival({ shellMode: "home", dialogId: null })).toBe(true)
    expect(isDomainStageArrival({ shellMode: "home", dialogId: "dlg-1" })).toBe(false)
    expect(isDomainStageArrival({ shellMode: "domain", dialogId: "dlg-1" })).toBe(false)
  })
})

describe("shouldRenderRealmDocumentChronicle", () => {
  it("keeps a named Dialog Document", () => {
    expect(
      shouldRenderRealmDocumentChronicle({
        workspaceSurface: "stage",
        boardId: "realm",
        subjectKind: "dialog",
        dialogIsDocumentBearing: true,
      }),
    ).toBe(true)
  })

  it("on Stage shows Moment and Library instead of the Dialog Document", () => {
    expect(
      shouldRenderRealmDocumentChronicle({
        workspaceSurface: "stage",
        boardId: "realm",
        subjectKind: "moment",
        dialogIsDocumentBearing: true,
      }),
    ).toBe(false)
    expect(
      shouldRenderRealmDocumentChronicle({
        workspaceSurface: "stage",
        boardId: "realm",
        subjectKind: "library",
        dialogIsDocumentBearing: true,
      }),
    ).toBe(false)
  })
})
