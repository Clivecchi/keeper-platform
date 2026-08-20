// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  DOCUMENT_EMPTY_POINTS_COPY,
  formatDocumentStatusLabel,
  resolveDocumentHeaderTitle,
} from "./documentHeader"

describe("Document Chronicle header", () => {
  it("prefers Dialog title, then Forward, then Nav — never Realm idle copy", () => {
    expect(
      resolveDocumentHeaderTitle({
        dialogTitle: "Touchdown",
        forwardTitle: "Forward",
        navTitle: "Nav",
      }),
    ).toBe("Touchdown")
    expect(
      resolveDocumentHeaderTitle({
        dialogTitle: "  ",
        forwardTitle: "Stage",
        navTitle: "Nav",
      }),
    ).toBe("Stage")
    expect(resolveDocumentHeaderTitle({ navTitle: "Touchdown" })).toBe("Touchdown")
    expect(resolveDocumentHeaderTitle({})).toBe("Untitled document")
    expect(DOCUMENT_EMPTY_POINTS_COPY).toBe("No Points yet.")
    expect(DOCUMENT_EMPTY_POINTS_COPY.toLowerCase()).not.toContain("breathing")
  })

  it("formats document status like Draft's status pill", () => {
    expect(formatDocumentStatusLabel(null)).toBe("document")
    expect(formatDocumentStatusLabel("in_progress")).toBe("in progress")
  })
})
