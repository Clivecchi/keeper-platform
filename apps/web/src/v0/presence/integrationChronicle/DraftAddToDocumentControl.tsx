"use client"

/**
 * Draft-first Document containment — pick a Dialog, register this draft on
 * Dialog.document_components. Selection model is replace-only (draft XOR dialog),
 * so this control lives on the draft Chronicle surface, not DocumentShell.
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
        const open = (rows ?? []).filter((row) => row?.id && !row.is_archived)
        setDialogs(open)
        const preferred =
          (linkedDialogId && open.some((row) => row.id === linkedDialogId)
            ? linkedDialogId
            : open[0]?.id) ?? ""
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
      className="mx-4 mb-3 rounded-xl border px-3 py-3"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.55)",
        background: "hsl(var(--theme-surface-elevated) / 0.4)",
      }}
      aria-label="Add draft to Document"
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Document
      </p>
      <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Promote this draft into a Dialog Document (separate from Nav nesting).
      </p>
      <label className="mt-3 block">
        <span className="sr-only">Target Dialog</span>
        <select
          value={targetDialogId}
          onChange={(e) => {
            setTargetDialogId(e.target.value)
            setSuccessDialogId(null)
            setError(null)
          }}
          disabled={loadingDialogs || dialogs.length === 0 || adding}
          className="w-full rounded-md border px-3 py-2 text-[13px] bg-transparent outline-none"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            color: "hsl(var(--theme-ink-primary))",
          }}
        >
          {dialogs.length === 0 ? (
            <option value="">
              {loadingDialogs ? "Loading Dialogs…" : "No Dialogs available"}
            </option>
          ) : (
            dialogs.map((row) => (
              <option key={row.id} value={row.id}>
                {dialogLabel(row)}
              </option>
            ))
          )}
        </select>
      </label>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!targetDialogId || adding || loadingDialogs}
          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
        >
          {adding ? "Adding…" : successDialogId ? "Added" : "Add to Document"}
        </button>
        {successDialogId && onOpenDocument ? (
          <button
            type="button"
            onClick={() => onOpenDocument(successDialogId)}
            className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
            style={{
              borderColor: "hsl(var(--theme-border-soft))",
              color: "hsl(var(--theme-ink-primary))",
              background: "hsl(var(--theme-surface-paper))",
            }}
          >
            Open Document →
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
