"use client"

import * as React from "react"
import { ChronicleDocumentView } from "./ChronicleDocumentView"
import { buildLibraryRoadmapDocument } from "./libraryRoadmapDocument"

/** Synthetic Chronicle pilot — roadmap status with no database backing. */
export function LibrarySharedContextRoadmapPanel() {
  const doc = React.useMemo(() => buildLibraryRoadmapDocument(), [])
  return (
    <div className="px-4 py-5">
      <ChronicleDocumentView document={doc} />
    </div>
  )
}
