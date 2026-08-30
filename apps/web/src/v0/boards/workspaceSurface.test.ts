// @vitest-environment node
import { describe, expect, it } from "vitest"
import { nextWorkspaceSurface, shouldRenderRealmDocumentChronicle } from "./workspaceSurface"

describe("nextWorkspaceSurface", () => {
  it("enters Stage only when opening the room or inspecting a presence", () => {
    expect(nextWorkspaceSurface("open-stage")).toBe("stage")
    expect(nextWorkspaceSurface("stage-presence")).toBe("stage")
  })

  it("leaves Stage on platform navigation, board change, and domain change", () => {
    expect(nextWorkspaceSurface("platform-nav")).toBe("dialog")
    expect(nextWorkspaceSurface("board-change")).toBe("dialog")
    expect(nextWorkspaceSurface("domain-change")).toBe("dialog")
    expect(nextWorkspaceSurface("leave-stage")).toBe("dialog")
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
