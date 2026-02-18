"use client"

/**
 * DraftCard
 *
 * Single cohesive card for editing drafts with inline editing.
 * Card head: editable title (large, serif), editable summary, status pill.
 * Sections: numbered blocks with editable title + content, delete button, + Add section.
 * JSON view: toggle replaces sections with read-only JSON.
 * Bottom toolbar: Save | JSON/Edit toggle | ← Dialogue
 */

import * as React from "react"
import { XMarkIcon, ArrowUpIcon, PencilSquareIcon } from "@heroicons/react/24/outline"
import type { KipDraft, KipDraftStatus } from "../../lib/kipApi"

// =============================================================================
// Types
// =============================================================================

export type DraftSection = { title: string; content: string }

export type DraftSpec = { sections?: DraftSection[] }

const DRAFT_STATUSES: KipDraftStatus[] = [
  "draft",
  "reviewed",
  "approved",
  "promoted",
  "archived",
]

// =============================================================================
// Helpers
// =============================================================================

function normalizeDraftSpec(spec: unknown): DraftSpec {
  if (!spec || typeof spec !== "object") return { sections: [] }
  const obj = spec as Record<string, unknown>
  const sections = Array.isArray(obj.sections)
    ? (obj.sections as unknown[]).map((s) => {
        if (s && typeof s === "object") {
          const sec = s as Record<string, unknown>
          return {
            title: typeof sec.title === "string" ? sec.title : "",
            content: typeof sec.content === "string" ? sec.content : "",
          }
        }
        return { title: "", content: "" }
      })
    : []
  return { sections }
}

function specToSections(spec: unknown): DraftSection[] {
  return normalizeDraftSpec(spec).sections ?? []
}

// =============================================================================
// Inline editable field styles
// =============================================================================

const INPUT_BASE =
  "w-full bg-transparent rounded-md px-1 py-0.5 -mx-1 -my-0.5 border border-transparent transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-soft)] focus:border-[var(--theme-border-soft)]"

const SURFACE = {
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
  border: "var(--theme-border-soft)",
  paper: "hsl(var(--theme-surface-paper) / 0.9)",
}

// =============================================================================
// Component
// =============================================================================

export interface DraftCardProps {
  draft: KipDraft
  isSaving?: boolean
  error?: string | null
  onSave: (payload: {
    title: string
    summary: string | null
    status: KipDraftStatus
    spec: DraftSpec
  }) => void
  onBackToDialogue: () => void
}

export const DraftCard: React.FC<DraftCardProps> = ({
  draft,
  isSaving = false,
  error = null,
  onSave,
  onBackToDialogue,
}) => {
  const [title, setTitle] = React.useState(draft.title)
  const [summary, setSummary] = React.useState(draft.summary ?? "")
  const [status, setStatus] = React.useState<KipDraftStatus>(
    (draft.status as KipDraftStatus) || "draft"
  )
  const [sections, setSections] = React.useState<DraftSection[]>(() =>
    specToSections(draft.spec)
  )
  const [viewMode, setViewMode] = React.useState<"edit" | "json">("edit")

  // Sync from draft when it changes (e.g. after save from parent)
  React.useEffect(() => {
    setTitle(draft.title)
    setSummary(draft.summary ?? "")
    setStatus((draft.status as KipDraftStatus) || "draft")
    setSections(specToSections(draft.spec))
  }, [draft.id, draft.title, draft.summary, draft.status, draft.spec])

  const handleSave = () => {
    onSave({
      title,
      summary: summary.trim() || null,
      status,
      spec: { sections },
    })
  }

  const handleAddSection = () => {
    setSections((prev) => [...prev, { title: "", content: "" }])
  }

  const handleDeleteSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSectionChange = (index: number, field: "title" | "content", value: string) => {
    setSections((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const specJson = JSON.stringify({ sections }, null, 2)

  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden"
      style={{
        borderColor: SURFACE.border,
        backgroundColor: SURFACE.paper,
      }}
    >
      {/* Card head */}
      <div className="relative px-6 pt-6 pb-4">
        <div className="absolute top-6 right-6">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as KipDraftStatus)}
            className="rounded-full border px-3 py-1.5 text-xs font-medium capitalize appearance-none pr-8 bg-[hsl(var(--theme-surface-paper)/0.8)]"
            style={{
              borderColor: SURFACE.border,
              color: SURFACE.inkPrimary,
            }}
          >
            {DRAFT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {}}
          placeholder="Untitled Draft"
          className={`${INPUT_BASE} text-2xl font-serif font-semibold pr-32`}
          style={{ color: SURFACE.inkPrimary }}
        />
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => {}}
          placeholder="Add a summary…"
          rows={2}
          className={`${INPUT_BASE} mt-2 text-sm leading-relaxed resize-none`}
          style={{ color: SURFACE.inkSecondary }}
        />
      </div>

      {/* Divider */}
      <div className="h-px w-full" style={{ backgroundColor: SURFACE.border }} />

      {/* Sections or JSON view */}
      <div className="flex-1 min-h-0 px-6 py-4 overflow-auto">
        {viewMode === "edit" ? (
          <div className="space-y-4">
            <p
              className="text-[11px] uppercase tracking-[0.25em]"
              style={{ color: SURFACE.inkSecondary }}
            >
              Sections
            </p>
            <div className="space-y-4">
              {sections.map((sec, i) => (
                <div
                  key={i}
                  className="rounded-xl border px-4 py-3 relative"
                  style={{
                    borderColor: SURFACE.border,
                    backgroundColor: "hsl(var(--theme-surface-paper) / 0.5)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(i)}
                    className="absolute top-3 right-3 p-1 rounded hover:opacity-70 transition-opacity"
                    style={{ color: SURFACE.inkSecondary }}
                    aria-label="Delete section"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                  <div className="flex gap-3">
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{
                        backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                        color: SURFACE.inkSecondary,
                        border: `1px solid ${SURFACE.border}`,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-2 pr-8">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => handleSectionChange(i, "title", e.target.value)}
                        placeholder="Section title"
                        className={`${INPUT_BASE} font-semibold text-sm`}
                        style={{ color: SURFACE.inkPrimary }}
                      />
                      <textarea
                        value={sec.content}
                        onChange={(e) => handleSectionChange(i, "content", e.target.value)}
                        placeholder="Section content…"
                        rows={3}
                        className={`${INPUT_BASE} text-sm leading-relaxed resize-none`}
                        style={{ color: SURFACE.inkSecondary }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddSection}
              className="w-full rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors hover:opacity-80"
              style={{
                borderColor: SURFACE.border,
                color: SURFACE.inkSecondary,
              }}
            >
              + Add section
            </button>
          </div>
        ) : (
          <pre
            className="text-sm font-mono overflow-auto rounded-lg p-4"
            style={{
              color: SURFACE.inkPrimary,
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.5)",
              border: `1px solid ${SURFACE.border}`,
            }}
          >
            {specJson}
          </pre>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Bottom toolbar */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-3 border-t"
        style={{
          borderColor: SURFACE.border,
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.95)",
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: "var(--theme-ink-primary)",
            color: "var(--theme-surface-page)",
          }}
        >
          <ArrowUpIcon className="w-4 h-4" />
          {isSaving ? "Saving…" : "Save"}
        </button>

        <button
          type="button"
          onClick={() => setViewMode((m) => (m === "edit" ? "json" : "edit"))}
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: SURFACE.inkSecondary }}
        >
          {viewMode === "edit" ? (
            <>
              <span className="font-mono">{"{ }"}</span> JSON
            </>
          ) : (
            <>
              <PencilSquareIcon className="w-4 h-4" />
              Edit
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBackToDialogue}
          className="text-sm font-medium underline underline-offset-2"
          style={{ color: SURFACE.inkSecondary }}
        >
          ← Dialogue
        </button>
      </div>
    </div>
  )
}

export default DraftCard
