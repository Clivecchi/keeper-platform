import {
  buildLibraryGlossAnchor,
  parseLibraryPointerRef,
  type ChronicleDocument,
} from "@keeper/shared"
import { libraryItemChronicleTitle } from "../integrationChronicle/libraryNavUtils"
import type { LibraryItemDto } from "../integrationChronicle/feeds/LibraryItemFeed"

export function libraryItemToChronicleDocument(item: LibraryItemDto): ChronicleDocument {
  const title = libraryItemChronicleTitle(item)
  const perspective = item.agent_perspective?.trim()
  const description = item.description?.trim()
  const pointer = parseLibraryPointerRef(item.source_ref ?? "")

  return {
    identity: {
      label: "Library",
      subtitle: pointer ? `Pointer · ${pointer.kind}` : item.source_type,
    },
    title,
    lede: pointer?.label ?? (description || undefined),
    body: {
      text: perspective || "Perspective pending — ingestion may still be running.",
      clampLines: 8,
      expandable: true,
    },
    status: perspective
      ? { label: "Indexed", tone: "active" }
      : { label: "Ingestion pending", tone: "pending" },
    gloss: {
      anchor: buildLibraryGlossAnchor(item.id),
      snapshot: {
        label: title,
        text: perspective ?? description ?? undefined,
      },
    },
  }
}
