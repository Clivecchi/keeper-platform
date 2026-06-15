import { apiFetch } from "../../../lib/apiFetch"

export type LibraryNavRow = {
  id: string
  source_type: string
  source_ref: string
  display_label: string | null
}

export type LibraryNavRowPatch = {
  libraryItemId: string
  display_label?: string
  description?: string
}

/** Derive a human label from source_ref when display_label is empty. */
export function deriveLibraryItemName(row: Pick<LibraryNavRow, "source_type" | "source_ref" | "display_label">): string {
  const trimmed = row.display_label?.trim()
  if (trimmed) return trimmed

  if (row.source_type === "url") {
    try {
      const url = new URL(row.source_ref)
      const pathPart = url.pathname.split("/").filter(Boolean).pop()
      return pathPart || url.hostname
    } catch {
      return row.source_ref
    }
  }

  const fileName = row.source_ref.split("/").pop() ?? row.source_ref
  return decodeURIComponent(fileName.replace(/^\d+-/, ""))
}

/** Chronicle cover title — shared by cover schema identity.name and Nav. */
export function libraryItemChronicleTitle(
  row: Pick<LibraryNavRow, "source_type" | "source_ref" | "display_label">,
): string {
  return deriveLibraryItemName(row)
}

export function librarySourceIconLetter(sourceType: string): string {
  switch (sourceType) {
    case "upload":
      return "U"
    case "url":
      return "L"
    case "github":
      return "G"
    case "gdrive":
      return "D"
    default:
      return "?"
  }
}

export async function fetchDomainLibraryNavRows(domainId: string): Promise<LibraryNavRow[]> {
  const rows = (await apiFetch(
    `/api/library-items?domainId=${encodeURIComponent(domainId)}`,
  )) as LibraryNavRow[]

  if (!Array.isArray(rows)) return []
  return rows
}

export function applyLibraryNavRowPatch(
  rows: LibraryNavRow[],
  patch: LibraryNavRowPatch | null,
): LibraryNavRow[] {
  if (!patch) return rows
  return rows.map((row) =>
    row.id === patch.libraryItemId
      ? {
          ...row,
          ...(patch.display_label !== undefined ? { display_label: patch.display_label } : {}),
        }
      : row,
  )
}
