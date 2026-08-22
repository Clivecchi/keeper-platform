"use client"

import * as React from "react"
import {
  appendDraftPointToSpec,
  composeAuthoredPoint,
  createDraftPoint,
  removeDraftPointFromSpec,
  updateDraftPointInSpec,
} from "@keeper/shared"
import { KipApi } from "../../../lib/kipApi"

export function splitDraftPointForEdit(point: {
  prelude?: string
  content: string
}): { title: string; body: string } {
  const title =
    point.prelude?.trim()
    || point.content.trim().split(/\n/)[0]?.trim()
    || ""
  const body = point.content.trim()
  if (title && body.startsWith(title)) {
    return { title, body: body.slice(title.length).replace(/^\s*\n+/, "") }
  }
  return { title, body }
}

export function useDraftAuthoring(input: {
  domainId: string | null
  draftId: string | null
  title: string
  spec: unknown
  onRefresh: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const run = React.useCallback(
    async (work: () => Promise<void>) => {
      if (!input.domainId || !input.draftId) return
      setBusy(true)
      setError(null)
      try {
        await work()
        input.onRefresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the Draft.")
      } finally {
        setBusy(false)
      }
    },
    [input],
  )

  return {
    editing,
    busy,
    error,
    toggleEdit: () => setEditing((open) => !open),
    saveTitle: (title: string) =>
      run(async () => {
        if (!input.domainId || !input.draftId) return
        await KipApi.updateDraft(input.domainId, input.draftId, { title })
      }),
    addPoint: (title: string, content: string) =>
      run(async () => {
        if (!input.domainId || !input.draftId) return
        const composed = composeAuthoredPoint(title, content)
        if (!composed.content) return
        const point = createDraftPoint({
          content: composed.content,
          ...(composed.prelude ? { prelude: composed.prelude } : {}),
          proposedBy: "Author",
          status: "accepted",
        })
        const spec = appendDraftPointToSpec(input.spec, point)
        await KipApi.updateDraft(input.domainId, input.draftId, { spec })
      }),
    updatePoint: (pointId: string, title: string, content: string) =>
      run(async () => {
        if (!input.domainId || !input.draftId) return
        const composed = composeAuthoredPoint(title, content)
        if (!composed.content) return
        const { spec } = updateDraftPointInSpec(input.spec, pointId, {
          content: composed.content,
          prelude: composed.prelude,
        })
        await KipApi.updateDraft(input.domainId, input.draftId, { spec })
      }),
    deletePoint: (pointId: string) =>
      run(async () => {
        if (!input.domainId || !input.draftId) return
        const { spec, removed } = removeDraftPointFromSpec(input.spec, pointId)
        if (!removed) return
        await KipApi.updateDraft(input.domainId, input.draftId, { spec })
      }),
  }
}
