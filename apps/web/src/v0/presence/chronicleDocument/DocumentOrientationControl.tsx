"use client"

import * as React from "react"
import { Compass } from "lucide-react"
import {
  deriveOrientationLandmarks,
  DOCUMENT_ORIENTATION_MAX_CHARS,
  type DocumentOrientation,
  type OrientationLandmark,
} from "@keeper/shared"

export interface DocumentOrientationControlProps {
  orientation?: DocumentOrientation | null
  sections: Array<{ id: string; title: string }>
  points: Array<{ number: number; title?: string }>
  busy?: boolean
  onSave: (body: string) => void
}

function formatUpdatedAt(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Document-level operational context. Closed by default.
 * The Cast still receives Orientation in agent context when this panel is shut.
 */
export function DocumentOrientationControl({
  orientation,
  sections,
  points,
  busy = false,
  onSave,
}: DocumentOrientationControlProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(orientation?.body ?? "")
  const [box, setBox] = React.useState<{ top: number; right: number } | null>(null)

  React.useEffect(() => {
    setDraft(orientation?.body ?? "")
  }, [orientation?.body])

  const place = React.useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setBox({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) })
  }, [])

  React.useEffect(() => {
    if (!open) return
    place()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onPointer)
    window.addEventListener("resize", place)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onPointer)
      window.removeEventListener("resize", place)
    }
  }, [open, place])

  const landmarks: OrientationLandmark[] = React.useMemo(
    () =>
      deriveOrientationLandmarks({
        body: orientation?.body ?? "",
        sections,
        points,
      }),
    [orientation?.body, sections, points],
  )

  const dirty = draft.trim() !== (orientation?.body ?? "").trim()
  const updated = formatUpdatedAt(orientation?.updatedAt)
  const hasMap = Boolean(orientation?.body?.trim())

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{
          color: open || hasMap
            ? "hsl(var(--theme-accent-primary))"
            : "hsl(var(--theme-ink-tertiary))",
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={hasMap ? "Document Orientation, set" : "Document Orientation"}
        title="Orientation"
        onClick={() => {
          setOpen((current) => {
            const next = !current
            if (next) place()
            return next
          })
        }}
      >
        <Compass className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && box ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Document Orientation"
          className="fixed z-40 w-[min(20rem,calc(100vw-1rem))] rounded-md border p-3 shadow-lg"
          style={{
            top: box.top,
            right: box.right,
            background: "hsl(var(--theme-surface-elevated, 0 0% 100%))",
            borderColor: "hsl(var(--theme-border-soft))",
            color: "hsl(var(--theme-ink-primary))",
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Orientation
          </p>
          <p className="mt-2 text-[13px] leading-snug">
            {hasMap
              ? orientation?.body
              : "No Orientation yet. The Lead sets this when the shared reading of the Document changes."}
          </p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Landmarks
          </p>
          {landmarks.length > 0 ? (
            <ul className="mt-1 space-y-1 text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              {landmarks.map((landmark) => (
                <li key={`${landmark.kind}:${landmark.ref}`}>{landmark.label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              {hasMap
                ? "No Section or Point cited yet."
                : "Cite a Section title or Point number in the map."}
            </p>
          )}
          <p className="mt-3 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            {updated
              ? `${hasMap ? "Updated" : "Last change"} ${updated}${
                  orientation?.updatedBy ? ` · ${orientation.updatedBy}` : ""
                }`
              : "Not set yet."}
          </p>
          <label className="mt-3 block text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Revise
            <textarea
              value={draft}
              maxLength={DOCUMENT_ORIENTATION_MAX_CHARS}
              rows={4}
              disabled={busy}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-1 w-full resize-y rounded-md border bg-transparent px-2 py-1.5 text-[13px] outline-none"
              style={{
                borderColor: "hsl(var(--theme-border-soft))",
                color: "hsl(var(--theme-ink-primary))",
              }}
              aria-label="Revise Orientation"
            />
          </label>
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => onSave(draft.trim())}
              className="text-[13px] font-semibold disabled:opacity-40"
              style={{ color: "hsl(var(--theme-accent-primary))" }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
            {hasMap ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onSave("")}
                className="text-[13px] disabled:opacity-40"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
