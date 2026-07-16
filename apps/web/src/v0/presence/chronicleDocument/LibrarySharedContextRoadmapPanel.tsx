"use client"

import * as React from "react"
import { ChronicleDocumentView } from "./ChronicleDocumentView"
import { buildLibraryRoadmapDocument } from "./libraryRoadmapDocument"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"

/** Synthetic Chronicle pilot — roadmap status with no database backing. */
export function LibrarySharedContextRoadmapPanel() {
  const boardCtx = useUniversalBoardOptional()
  const doc = React.useMemo(() => buildLibraryRoadmapDocument(), [])

  const handleDiscuss = React.useCallback(() => {
    if (!doc.gloss?.anchor) return
    boardCtx?.actions.requestDiscussDraftPoint(doc.gloss.anchor, {
      glossContent: doc.gloss.snapshot,
    })
    boardCtx?.actions.setDraftComposeHint(
      "Ask about the Library shared context roadmap status:",
    )
  }, [boardCtx, doc.gloss?.anchor, doc.gloss?.snapshot])

  return (
    <div className="px-4 py-5">
      <ChronicleDocumentView document={doc} onGloss={handleDiscuss} />
    </div>
  )
}
