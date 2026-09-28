import { describe, expect, it } from "vitest"
import { createDraftPoint } from "@keeper/shared"
import { manuscriptPointsToRealmNavEntries } from "./realmNavGrowth"

describe("Jev-recommended Point in Chronicle", () => {
  it("shows the Point as proposed with Jev as the voice", () => {
    const point = createDraftPoint({
      content: "A proposed Point is already kept by the Agency that recognized it.",
      proposedBy: "Jev",
      status: "proposed",
      prelude: "Agency keeps",
    })
    const [entry] = manuscriptPointsToRealmNavEntries(
      {
        id: "manuscript-1",
        kind: "document_manuscript",
        key: "manuscript",
        title: "Becoming Together",
        status: "draft",
        dialogId: "dialog-1",
        spec: { points: [point] },
      },
      "dialog-1",
    )

    expect(entry?.point.status?.label).toBe("proposed")
    expect(entry?.point.status?.tone).toBe("pending")
    expect(entry?.point.identity.label).toBe("Jev")
    expect(entry?.point.identity.voice).toBe("Jev")
    expect(entry?.point.title).toBe("Agency keeps")
    expect(entry?.point.body.text).toContain("already kept")
  })
})
