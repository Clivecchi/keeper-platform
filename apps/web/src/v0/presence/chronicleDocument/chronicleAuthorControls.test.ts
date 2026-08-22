import { describe, expect, it } from "vitest"
import { splitDisplayedPointForEdit } from "./ChronicleAuthorControls"
import { splitDraftPointForEdit } from "./useDraftAuthoring"

describe("inline Point edit split", () => {
  it("does not repeat the title inside the body when it is the first line", () => {
    expect(
      splitDisplayedPointForEdit({
        title: "Introduction to the Plot",
        body: { text: "Introduction to the Plot\nEstablish the theme." },
      }),
    ).toEqual({
      title: "Introduction to the Plot",
      body: "Establish the theme.",
    })
  })

  it("keeps a distinct body when the title is not a prefix", () => {
    expect(
      splitDraftPointForEdit({
        prelude: "Introduction to the Plot",
        content: "1. **Introduction to the Plot**: Establish the theme.",
      }),
    ).toEqual({
      title: "Introduction to the Plot",
      body: "1. **Introduction to the Plot**: Establish the theme.",
    })
  })
})
