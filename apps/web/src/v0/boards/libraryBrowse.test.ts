// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { LibraryNavRow } from "../presence/integrationChronicle/libraryNavUtils"
import {
  buildLibraryBrowseRails,
  filterLibraryBrowseRows,
  formatLibraryCategoryLabel,
  listLibraryBrowseChips,
  resolveLibraryBrowseKind,
} from "./libraryBrowse"

function row(partial: Partial<LibraryNavRow> & Pick<LibraryNavRow, "id" | "source_ref">): LibraryNavRow {
  return {
    source_type: "upload",
    display_label: partial.display_label ?? partial.id,
    ...partial,
  }
}

describe("library browse kinds", () => {
  it("classifies image, video, document, link, writing, and github", () => {
    expect(
      resolveLibraryBrowseKind(row({ id: "1", source_ref: "https://blob.example/shot.png" })),
    ).toBe("image")
    expect(
      resolveLibraryBrowseKind(
        row({ id: "2", source_type: "url", source_ref: "https://cdn.example/clip.mp4" }),
      ),
    ).toBe("video")
    expect(
      resolveLibraryBrowseKind(row({ id: "3", source_ref: "https://blob.example/notes.pdf" })),
    ).toBe("document")
    expect(
      resolveLibraryBrowseKind(
        row({ id: "4", source_type: "url", source_ref: "https://ke3p.com/docs" }),
      ),
    ).toBe("link")
    expect(
      resolveLibraryBrowseKind(
        row({ id: "5", source_type: "draft", source_ref: "keeper://draft/abc" }),
      ),
    ).toBe("writing")
    expect(
      resolveLibraryBrowseKind(
        row({ id: "6", source_type: "github", source_ref: "doc://docs/glossary.md" }),
      ),
    ).toBe("github")
  })
})

describe("library browse chips and rails", () => {
  const rows: LibraryNavRow[] = [
    row({
      id: "img",
      source_ref: "https://blob.example/a.png",
      created_at: "2026-08-22T10:00:00.000Z",
    }),
    row({
      id: "doc",
      source_ref: "https://blob.example/recipe.md",
      category: ["canon"],
      created_at: "2026-08-21T10:00:00.000Z",
    }),
    row({
      id: "old",
      source_ref: "https://blob.example/retired.png",
      category: ["archive"],
      created_at: "2026-08-01T10:00:00.000Z",
    }),
  ]

  it("offers All, live kinds, custom categories, then Archive", () => {
    expect(listLibraryBrowseChips(rows).map((chip) => chip.id)).toEqual([
      "all",
      "kind:image",
      "kind:document",
      "category:canon",
      "archive",
    ])
  })

  it("keeps archived items off kind shelves", () => {
    const images = filterLibraryBrowseRows(rows, { type: "kind", kind: "image" })
    expect(images.map((item) => item.id)).toEqual(["img"])
    expect(filterLibraryBrowseRows(rows, { type: "archive" }).map((item) => item.id)).toEqual([
      "old",
    ])
  })

  it("builds Recent, kind, category, and Archive rails", () => {
    const rails = buildLibraryBrowseRails(rows)
    expect(rails.map((rail) => rail.id)).toEqual([
      "recent",
      "kind:image",
      "kind:document",
      "category:canon",
      "archive",
    ])
    expect(rails[0]?.rows.map((item) => item.id)).toEqual(["img", "doc"])
  })

  it("filters rails by title query", () => {
    const rails = buildLibraryBrowseRails(
      [
        ...rows,
        row({
          id: "welcome",
          display_label: "Welcome, Charley",
          source_ref: "https://example.com/welcome",
          source_type: "url",
        }),
      ],
      "charley",
    )
    expect(rails.map((rail) => rail.id)).toEqual(["recent", "kind:link"])
    expect(rails[0]?.rows.map((item) => item.id)).toEqual(["welcome"])
  })

  it("titles category tags in Keeper sentence case", () => {
    expect(formatLibraryCategoryLabel("archive")).toBe("Archive")
    expect(formatLibraryCategoryLabel("shared-context")).toBe("Shared Context")
  })
})
