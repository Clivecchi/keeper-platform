"use client"

/**
 * Draft-first Document containment — pick a Dialog, register this draft on
 * Dialog.document_components. Quiet inline control on draft Chronicle.
 */

import * as React from "react"
import { KipApi } from "../../../lib/kipApi"
import { fetchBoardNavSlice, loadDialogs } from "../../boards/boardNavDataCache"
import { DOCUMENT_MANUSCRIPT_KIND } from "../../realm/realmNavGrowth"

type DialogNavRow = {
  id: string
  title?: string | null
  forward_title?: string | null
  forwardTitle?: string | null
  title_source?: string | null
  is_archived?: boolean
}

function dialogLabel(row: DialogNavRow): string {
  return (
    row.title?.trim()
    || row.forward_title?.trim()
    || row.forwardTitle?.trim()
    || "Untitled Dialog"
  )
}

function isNamedDialog(row: DialogNavRow): boolean {
  // Mirror UniversalNavPanel isChatterDialog (inverted).
  const source = row.title_source?.trim()
  if (source === "auto_generated") return false
  if (source === "user_set" || source === "system_promoted") return true
  const title = dialogLabel(row)
  return !/^[A-Za-z][\w\s]* · .+ · (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}$/.test(
    title,
  )
}

function sortDialogsForPicker(rows: DialogNavRow[], linkedDialogId?: string | null): DialogNavRow[] {
  return [...rows].sort((a, b) => {
    const aLinked = a.id === linkedDialogId ? 1 : 0
    const bLinked = b.id === linkedDialogId ? 1 : 0
    if (aLinked !== bLinked) return bLinked - aLinked
    const aNamed = isNamedDialog(a) ? 1 : 0
    const bNamed = isNamedDialog(b) ? 1 : 0
    if (aNamed !== bNamed) return bNamed - aNamed
    return dialogLabel(a).localeCompare(dialogLabel(b))
  })
}

export function DraftAddToDocumentControl({
  domainId,
  draftId,
  draftKind,
  linkedDialogId,
  onOpenDocument,
}: {
  domainId: string
  draftId: string
  draftKind?: string | null
  /** Nav association — preferred default target, not Document membership. */
  linkedDialogId?: string | null
  onOpenDocument?: (dialogId: string) => void
}) {
  const kind = draftKind?.trim() || ""
  const isManuscript = kind === DOCUMENT_MANUSCRIPT_KIND

  const [dialogs, setDialogs] = React.useState<DialogNavRow[]>([])
  const [targetDialogId, setTargetDialogId] = React.useState("")
  const [loadingDialogs, setLoadingDialogs] = React.useState(false)
  const [adding, setAdding] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successDialogId, setSuccessDialogId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isManuscript || !domainId) return
    let cancelled = false
    setLoadingDialogs(true)
    void fetchBoardNavSlice<DialogNavRow[]>(domainId, "dialogs", () =>
      loadDialogs(domainId) as Promise<DialogNavRow[]>,
    )
      .then((rows) => {
        if (cancelled) return
        const open = sortDialogsForPicker(
          (rows ?? []).filter((row) => row?.id && !row.is_archived),
          linkedDialogId,
        )
        setDialogs(open)
        const preferred =
          (linkedDialogId && open.some((row) => row.id === linkedDialogId)
            ? linkedDialogId
            : open.find(isNamedDialog)?.id)
          ?? open[0]?.id
          ?? ""
        setTargetDialogId(preferred)
      })
      .catch(() => {
        if (!cancelled) {
          setDialogs([])
          setTargetDialogId("")
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDialogs(false)
      })
    return () => {
      cancelled = true
    }
  }, [domainId, linkedDialogId, isManuscript, draftId])

  if (isManuscript) return null

  const handleAdd = async () => {
    if (!targetDialogId || adding) return
    setAdding(true)
    setError(null)
    setSuccessDialogId(null)
    try {
      await KipApi.registerDialogDocumentComponent(domainId, targetDialogId, draftId)
      setSuccessDialogId(targetDialogId)
    } catch (err) {
      setError(
        err instanceof Error && err.message.trim()
          ? err.message
          : "Could not add this draft to the Document.",
      )
    } finally {
      setAdding(false)
    }
  }

  return (
    <section
      className="mx-4 mb-4 border-b pb-3"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.35)" }}
      aria-label="Add draft to Document"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[10rem] flex-1">
          <span
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Add to Document
          </span>
          <select
            value={targetDialogId}
            onChange={(e) => {
              setTargetDialogId(e.target.value)
              setSuccessDialogId(null)
              setError(null)
            }}
            disabled={loadingDialogs || dialogs.length === 0 || adding}
            className="w-full rounded-md border px-2.5 py-1.5 text-[12px] outline-none"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.45)",
              background: "hsl(var(--theme-surface-paper) / 0.55)",
              color: "hsl(var(--theme-ink-primary))",
            }}
          >
            {dialogs.length === 0 ? (
              <option value="">
                {loadingDialogs ? "Loading…" : "No Dialogs"}
              </option>
            ) : (
              dialogs.map((row) => (
                <option key={row.id} value={row.id}>
                  {dialogLabel(row)}
                  {!isNamedDialog(row) ? " · Chatter" : ""}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!targetDialogId || adding || loadingDialogs}
          className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-45"
          style={{
            backgroundColor: successDialogId
              ? "transparent"
              : "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))",
            color: successDialogId
              ? "hsl(var(--theme-ink-secondary))"
              : "white",
            border: successDialogId
              ? "1px solid hsl(var(--theme-border-soft) / 0.5)"
              : "1px solid transparent",
          }}
        >
          {adding ? "Adding…" : successDialogId ? "Added" : "Add"}
        </button>
        {successDialogId && onOpenDocument ? (
          <button
            type="button"
            onClick={() => onOpenDocument(successDialogId)}
            className="rounded-md px-2 py-1.5 text-[11px] font-medium underline-offset-2 hover:underline"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Open Document
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1.5 text-[11px]" style={{ color: "hsl(0 60% 45%)" }}>
          {error}
        </p>
      ) : null}
    </section>
  )
}
