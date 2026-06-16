import { apiFetch } from "../../../lib/apiFetch"
import { getBlobProxyUrl } from "../../../lib/blobProxy"

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

const IMAGE_UPLOAD_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i

function decodeFilenameSegment(segment: string): string {
  const decoded = decodeURIComponent(segment).trim()
  if (!decoded) return ""
  // Upload keys use `{timestamp}-{originalName}` — strip the timestamp prefix only.
  const withoutTimestamp = decoded.replace(/^\d{10,}-/, "")
  return withoutTimestamp.trim() || decoded
}

/** Last path segment of a blob URL or path — query/hash stripped, decoded. */
export function extractUploadFileName(sourceRef: string): string {
  const trimmed = sourceRef.trim()
  if (!trimmed) return "Untitled upload"

  try {
    const pathname = new URL(trimmed).pathname
    const segment = pathname.split("/").filter(Boolean).pop() ?? trimmed
    const name = decodeFilenameSegment(segment)
    return name || "Untitled upload"
  } catch {
    const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? trimmed
    const segment = pathOnly.split("/").filter(Boolean).pop() ?? pathOnly
    const name = decodeFilenameSegment(segment)
    return name || "Untitled upload"
  }
}

function isPlaceholderDisplayLabel(
  displayLabel: string | null | undefined,
  sourceType: string,
): boolean {
  const trimmed = displayLabel?.trim()
  if (!trimmed) return true
  // Recover rows that accidentally stored the source-type icon letter as display_label.
  if (trimmed.length === 1 && trimmed === librarySourceIconLetter(sourceType)) return true
  return false
}

/** Derive a human label from source_ref when display_label is empty. */
export function deriveLibraryItemName(
  row: Pick<LibraryNavRow, "source_type" | "source_ref" | "display_label">,
): string {
  const trimmed = row.display_label?.trim()
  if (trimmed && !isPlaceholderDisplayLabel(trimmed, row.source_type)) {
    return trimmed
  }

  if (row.source_type === "url") {
    try {
      const url = new URL(row.source_ref)
      const pathPart = url.pathname.split("/").filter(Boolean).pop()
      return pathPart ? decodeFilenameSegment(pathPart) : url.hostname
    } catch {
      return row.source_ref
    }
  }

  return extractUploadFileName(row.source_ref)
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

export function isLibraryImageUpload(
  row: Pick<LibraryNavRow, "source_type" | "source_ref">,
): boolean {
  if (row.source_type !== "upload") return false
  const ref = row.source_ref.split("?")[0]?.split("#")[0] ?? row.source_ref
  return IMAGE_UPLOAD_PATTERN.test(ref)
}

/** Cover hero avatar — image URL for image uploads, letter fallback otherwise. */
export function resolveLibraryHeroAvatar(
  row: Pick<LibraryNavRow, "source_type" | "source_ref">,
): string {
  if (isLibraryImageUpload(row)) {
    return getBlobProxyUrl(row.source_ref)
  }
  return librarySourceIconLetter(row.source_type)
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
