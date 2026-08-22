"use client"

import * as React from "react"
import {
  createDocumentSection,
  cycleDocumentLifecycleStatus,
  DOCUMENT_OPEN_SECTION,
  moveDocumentSection,
  moveIdInOrder,
  removeDocumentSection,
  renameDocumentSection,
  type DocumentPathDeclaration,
} from "@keeper/shared"
import { KipApi } from "../../../lib/kipApi"

export type DocumentAuthoringPaths = DocumentPathDeclaration[]

export function useDocumentAuthoring(input: {
  domainId: string | null
  dialogId: string | null
  title: string
  status?: string | null
  forwardTitle: string
  forwardDescription: string
  paths: DocumentAuthoringPaths
  pointIds: string[]
  onRefresh: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const run = React.useCallback(
    async (work: () => Promise<void>) => {
      if (!input.domainId || !input.dialogId) return
      setBusy(true)
      setError(null)
      try {
        await work()
        input.onRefresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the Document.")
      } finally {
        setBusy(false)
      }
    },
    [input],
  )

  const patchDocument = React.useCallback(
    (payload: Parameters<typeof KipApi.updateDialogDocument>[2]) => {
      if (!input.domainId || !input.dialogId) return Promise.resolve()
      return KipApi.updateDialogDocument(input.domainId, input.dialogId, payload)
    },
    [input.domainId, input.dialogId],
  )

  return {
    editing,
    busy,
    error,
    toggleEdit: () => setEditing((open) => !open),
    saveTitle: (title: string) =>
      run(() => patchDocument({ title })),
    cycleStatus: () =>
      run(() =>
        patchDocument({
          document_status: cycleDocumentLifecycleStatus(input.status),
        }),
      ),
    saveForward: (title: string, description: string) => {
      const nextTitle = title.trim()
      const nextDescription = description.trim()
      if (
        nextTitle === input.forwardTitle.trim()
        && nextDescription === input.forwardDescription.trim()
      ) {
        return Promise.resolve()
      }
      return run(() =>
        patchDocument({
          forward_title: nextTitle || null,
          forward_description: nextDescription || null,
        }),
      )
    },
    addSection: (title: string) =>
      run(async () => {
        const { paths } = createDocumentSection(input.paths, title)
        await patchDocument({ document_paths: paths })
      }),
    renameSection: (sectionId: string, title: string) =>
      run(async () => {
        await patchDocument({
          document_paths: renameDocumentSection(input.paths, sectionId, title),
        })
      }),
    deleteSection: (sectionId: string) =>
      run(async () => {
        await patchDocument({
          document_paths: removeDocumentSection(input.paths, sectionId),
        })
      }),
    moveSection: (sectionId: string, direction: "up" | "down") =>
      run(async () => {
        await patchDocument({
          document_paths: moveDocumentSection(input.paths, sectionId, direction),
        })
      }),
    addPoint: (sectionId: string | null, title: string, content: string) =>
      run(async () => {
        if (!input.domainId || !input.dialogId) return
        await KipApi.createDocumentPoint(input.domainId, input.dialogId, {
          title,
          content,
          sectionId,
        })
      }),
    updatePoint: (
      pointId: string,
      patch: { title?: string; content?: string; sectionId?: string | null },
    ) =>
      run(async () => {
        if (!input.domainId || !input.dialogId) return
        await KipApi.updateDocumentPoint(input.domainId, input.dialogId, pointId, patch)
      }),
    deletePoint: (pointId: string) =>
      run(async () => {
        if (!input.domainId || !input.dialogId) return
        await KipApi.deleteDocumentPoint(input.domainId, input.dialogId, pointId)
      }),
    movePoint: (sectionPointIds: string[], pointId: string, direction: "up" | "down") =>
      run(async () => {
        if (!input.domainId || !input.dialogId) return
        const nextSection = moveIdInOrder(sectionPointIds, pointId, direction)
        const sectionSet = new Set(sectionPointIds)
        let cursor = 0
        const next = input.pointIds.map((id) =>
          sectionSet.has(id) ? nextSection[cursor++] ?? id : id,
        )
        await KipApi.reorderDocumentPoints(input.domainId, input.dialogId, next)
      }),
    openSectionId: DOCUMENT_OPEN_SECTION.id,
  }
}
