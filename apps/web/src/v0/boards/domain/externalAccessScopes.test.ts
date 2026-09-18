// @vitest-environment node
import { describe, expect, it } from "vitest"
import { formatScopeList, withDialogAndGlossScopes } from "./externalAccessScopes"

describe("externalAccessScopes", () => {
  it("labels scopes for Nav/Chronicle", () => {
    expect(formatScopeList([])).toBe("No scopes")
    expect(formatScopeList(["library.ro", "gloss.rw"])).toBe("Library read, Gloss write")
  })

  it("adds Dialog+Gloss without dropping an existing library.rw grant", () => {
    expect(withDialogAndGlossScopes(["library.rw"])).toEqual([
      "library.rw",
      "dialog.ro",
      "dialog.rw",
      "gloss.rw",
    ])
    expect(withDialogAndGlossScopes(["library.ro"])).toEqual([
      "library.ro",
      "dialog.ro",
      "dialog.rw",
      "gloss.rw",
    ])
  })
})
