"use client"

/**
 * IDEDraftPanel
 *
 * Professional draft document view for the IDE Board right panel.
 *
 * Renders a KipDraft as an interactive document with two-level section editing:
 *   Level 1 — Section title: click the heading text to edit inline as an <input>
 *   Level 2 — Section content: click the body to reveal a markdown <textarea>;
 *             on blur, the content is rendered back as formatted markdown.
 *
 * Toolbar: Save | JSON toggle | unsaved indicator
 */

import * as React from "react"
import { Plus, Code2, Save, X } from "lucide-react"
import type { KipDraft, KipDraftStatus } from "../../../lib/kipApi"
import { KipApi } from "../../../lib/kipApi"

// ─── Types ────────────────────────────────────────────────────────────────────

type DraftSection = { title: string; content: string }

const DRAFT_STATUSES: KipDraftStatus[] = ["draft", "reviewed", "approved", "promoted", "archived"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSpec(spec: unknown): DraftSection[] {
  if (!spec || typeof spec !== "object") return []
  const obj = spec as Record<string, unknown>
  if (!Array.isArray(obj.sections)) return []
  return (obj.sections as unknown[]).map((s) => {
    if (s && typeof s === "object") {
      const sec = s as Record<string, unknown>
      return {
        title: typeof sec.title === "string" ? sec.title : "",
        content: typeof sec.content === "string" ? sec.content : "",
      }
    }
    return { title: "", content: "" }
  })
}

function formatDate(val: string | Date | null | undefined): string {
  if (!val) return ""
  const d = typeof val === "string" ? new Date(val) : val
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

// ─── Inline markdown renderer ─────────────────────────────────────────────────

function renderInline(text: string, prefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0
  let k = 0
  let m: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      parts.push(<strong key={`${prefix}-b${k++}`}>{m[1]}</strong>)
    } else {
      parts.push(<em key={`${prefix}-i${k++}`}>{m[2]}</em>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

interface MarkdownContentProps {
  text: string
  inkColor: string
}

function MarkdownContent({ text, inkColor }: MarkdownContentProps): React.ReactElement {
  const blocks = text.split(/\n\n+/)
  const nodes: React.ReactNode[] = []
  let i = 0
  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) { i++; continue }
    const lines = trimmed.split("\n")
    const isListBlock = lines.every((l) => /^[-*•]\s/.test(l.trim()))
    if (isListBlock) {
      nodes.push(
        <ul key={i} className="list-disc pl-4 space-y-0.5" style={{ color: inkColor }}>
          {lines.map((line, li) => (
            <li key={li} className="text-[12px] leading-relaxed">
              {renderInline(line.replace(/^[-*•]\s/, ""), `${i}-${li}`)}
            </li>
          ))}
        </ul>,
      )
    } else {
      nodes.push(
        <p key={i} className="text-[12px] leading-relaxed" style={{ color: inkColor }}>
          {renderInline(trimmed, String(i))}
        </p>,
      )
    }
    i++
  }
  return <div className="space-y-2">{nodes}</div>
}

// ─── SectionBlock ─────────────────────────────────────────────────────────────

interface SectionBlockProps {
  idx: number
  section: DraftSection
  editingTitle: boolean
  editingContent: boolean
  onClickTitle: () => void
  onBlurTitle: () => void
  onClickContent: () => void
  onBlurContent: () => void
  onTitleChange: (v: string) => void
  onContentChange: (v: string) => void
  onDelete: () => void
  tokens: SurfaceTokens
}

interface SurfaceTokens {
  border: string
  inkPrimary: string
  inkSecondary: string
  inkTertiary: string
  elevated: string
  paper: string
}

function SectionBlock({
  idx,
  section,
  editingTitle,
  editingContent,
  onClickTitle,
  onBlurTitle,
  onClickContent,
  onBlurContent,
  onTitleChange,
  onContentChange,
  onDelete,
  tokens: T,
}: SectionBlockProps) {
  return (
    <div
      className="rounded-xl border overflow-hidden group/card"
      style={{ borderColor: T.border, background: T.paper }}
    >
      {/* ── Level 1: Section title ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: T.border }}
      >
        <span
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold"
          style={{ background: T.elevated, color: T.inkTertiary, border: `1px solid ${T.border}` }}
        >
          {idx + 1}
        </span>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              type="text"
              value={section.title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onBlurTitle}
              placeholder="Section title"
              className="w-full bg-transparent text-[13px] font-semibold leading-snug focus:outline-none"
              style={{ color: T.inkPrimary }}
            />
          ) : (
            <p
              className="text-[13px] font-semibold leading-snug cursor-text hover:opacity-75 transition-opacity"
              style={{ color: T.inkPrimary }}
              onClick={onClickTitle}
              title="Click to edit title"
            >
              {section.title || (
                <span style={{ color: T.inkTertiary, fontWeight: 400 }}>Section title…</span>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="flex-shrink-0 p-1 rounded opacity-0 group-hover/card:opacity-50 hover:!opacity-100 transition-opacity"
          style={{ color: T.inkTertiary }}
          aria-label="Delete section"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* ── Level 2: Section content (markdown rendered / textarea) ──────── */}
      <div className="px-4 py-3 min-h-[2.5rem]">
        {editingContent ? (
          <textarea
            autoFocus
            value={section.content}
            onChange={(e) => onContentChange(e.target.value)}
            onBlur={onBlurContent}
            placeholder={"Write section content…\n\nSupports **bold**, *italic*, and\n- bullet lists"}
            rows={6}
            className="w-full bg-transparent text-[12px] leading-relaxed resize-y focus:outline-none"
            style={{ color: T.inkSecondary }}
          />
        ) : section.content.trim() ? (
          <div
            className="cursor-text hover:opacity-80 transition-opacity"
            onClick={onClickContent}
            title="Click to edit content"
          >
            <MarkdownContent text={section.content} inkColor={T.inkSecondary} />
          </div>
        ) : (
          <p
            className="text-[12px] cursor-text"
            style={{ color: T.inkTertiary, opacity: 0.5 }}
            onClick={onClickContent}
          >
            Click to add content…
          </p>
        )}
      </div>
    </div>
  )
}

// ─── IDEDraftPanel ────────────────────────────────────────────────────────────

export interface IDEDraftPanelProps {
  draft: KipDraft
  /** Required for save; when null the panel is read-only. */
  domainId: string | null
  onSaved?: (updated: KipDraft) => void
}

export function IDEDraftPanel({ draft, domainId, onSaved }: IDEDraftPanelProps) {
  const [title, setTitle] = React.useState(draft.title)
  const [summary, setSummary] = React.useState(draft.summary ?? "")
  const [status, setStatus] = React.useState<KipDraftStatus>(draft.status || "draft")
  const [sections, setSections] = React.useState<DraftSection[]>(() => normalizeSpec(draft.spec))
  const [viewMode, setViewMode] = React.useState<"document" | "json">("document")
  const [isDirty, setIsDirty] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [editingTitleIdx, setEditingTitleIdx] = React.useState<number | null>(null)
  const [editingContentIdx, setEditingContentIdx] = React.useState<number | null>(null)
  const [editingHeader, setEditingHeader] = React.useState(false)

  // Sync when draft prop changes (new selection, or after save from parent)
  React.useEffect(() => {
    setTitle(draft.title)
    setSummary(draft.summary ?? "")
    setStatus(draft.status || "draft")
    setSections(normalizeSpec(draft.spec))
    setIsDirty(false)
    setEditingTitleIdx(null)
    setEditingContentIdx(null)
    setEditingHeader(false)
  }, [draft.id, draft.title, draft.summary, draft.status, draft.spec])

  const markDirty = () => setIsDirty(true)

  const updateSectionTitle = (i: number, v: string) => {
    setSections((p) => { const n = [...p]; n[i] = { ...n[i], title: v }; return n })
    markDirty()
  }

  const updateSectionContent = (i: number, v: string) => {
    setSections((p) => { const n = [...p]; n[i] = { ...n[i], content: v }; return n })
    markDirty()
  }

  const addSection = () => {
    const newIdx = sections.length
    setSections((p) => [...p, { title: "", content: "" }])
    setEditingTitleIdx(newIdx)
    setEditingContentIdx(null)
    markDirty()
  }

  const deleteSection = (i: number) => {
    setSections((p) => p.filter((_, j) => j !== i))
    if (editingTitleIdx === i) setEditingTitleIdx(null)
    if (editingContentIdx === i) setEditingContentIdx(null)
    markDirty()
  }

  const handleSave = async () => {
    if (!domainId) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const updated = await KipApi.updateDraft(domainId, draft.id, {
        title,
        summary: summary.trim() || null,
        status,
        spec: { sections },
      })
      setIsDirty(false)
      onSaved?.(updated)
    } catch {
      setSaveError("Couldn't save.")
    } finally {
      setIsSaving(false)
    }
  }

  // CSS-variable surface tokens
  const T: SurfaceTokens = {
    border: "hsl(var(--theme-line-hairline))",
    inkPrimary: "hsl(var(--theme-ink-primary))",
    inkSecondary: "hsl(var(--theme-ink-secondary))",
    inkTertiary: "hsl(var(--theme-ink-tertiary))",
    elevated: "hsl(var(--theme-surface-elevated))",
    paper: "hsl(var(--theme-surface-paper) / 0.5)",
  }

  const specJson = JSON.stringify({ sections }, null, 2)
  const dateStr = formatDate(draft.updatedAt)

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ color: T.inkPrimary }}
    >
      {/* ─── Document Header ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-5 pt-5 pb-4 border-b"
        style={{ borderColor: T.border }}
      >
        {/* Label + status */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: T.inkTertiary }}
          >
            Draft
          </span>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as KipDraftStatus); markDirty() }}
            className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize appearance-none cursor-pointer"
            style={{ borderColor: T.border, background: T.elevated, color: T.inkTertiary }}
          >
            {DRAFT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Title — click to edit */}
        {editingHeader ? (
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty() }}
            onBlur={() => setEditingHeader(false)}
            placeholder="Untitled Draft"
            className="w-full bg-transparent text-[16px] font-serif font-semibold leading-snug focus:outline-none border-b pb-0.5 mb-2"
            style={{ color: T.inkPrimary, borderColor: T.border }}
          />
        ) : (
          <h2
            className="text-[16px] font-serif font-semibold leading-snug mb-2 cursor-text hover:opacity-70 transition-opacity"
            style={{ color: T.inkPrimary }}
            onClick={() => setEditingHeader(true)}
            title="Click to edit title"
          >
            {title || "Untitled Draft"}
          </h2>
        )}

        {/* Summary */}
        <textarea
          value={summary}
          onChange={(e) => { setSummary(e.target.value); markDirty() }}
          placeholder="Add a description…"
          rows={2}
          className="w-full bg-transparent text-[12px] leading-relaxed resize-none focus:outline-none"
          style={{ color: T.inkSecondary }}
        />

        {/* Updated date */}
        {dateStr && (
          <p className="text-[10px] mt-1" style={{ color: T.inkTertiary }}>
            Updated {dateStr}
          </p>
        )}
      </div>

      {/* ─── Sections / JSON ─────────────────────────────────────────────── */}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
        {viewMode === "json" ? (
          <pre
            className="text-[11px] font-mono whitespace-pre-wrap rounded-xl p-3"
            style={{
              color: T.inkSecondary,
              background: T.paper,
              border: `1px solid ${T.border}`,
            }}
          >
            {specJson}
          </pre>
        ) : (
          <>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: T.inkTertiary }}
            >
              Sections
            </p>

            {sections.length === 0 && (
              <p className="text-[12px]" style={{ color: T.inkTertiary }}>
                No sections yet. Add one below.
              </p>
            )}

            {sections.map((sec, i) => (
              <SectionBlock
                key={i}
                idx={i}
                section={sec}
                editingTitle={editingTitleIdx === i}
                editingContent={editingContentIdx === i}
                onClickTitle={() => { setEditingTitleIdx(i); setEditingContentIdx(null) }}
                onBlurTitle={() => setEditingTitleIdx((p) => (p === i ? null : p))}
                onClickContent={() => { setEditingContentIdx(i); setEditingTitleIdx(null) }}
                onBlurContent={() => setEditingContentIdx((p) => (p === i ? null : p))}
                onTitleChange={(v) => updateSectionTitle(i, v)}
                onContentChange={(v) => updateSectionContent(i, v)}
                onDelete={() => deleteSection(i)}
                tokens={T}
              />
            ))}

            <button
              type="button"
              onClick={addSection}
              className="w-full rounded-xl border-dashed border px-4 py-2.5 text-[12px] font-medium flex items-center justify-center gap-2 hover:opacity-70 transition-opacity"
              style={{ borderColor: T.border, color: T.inkTertiary }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add section
            </button>
          </>
        )}
      </div>

      {/* ─── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 py-3 border-t"
        style={{ borderColor: T.border, background: T.elevated }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty || !domainId}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-opacity disabled:opacity-40"
          style={{
            background: T.inkPrimary,
            color: "hsl(var(--theme-surface-page))",
          }}
        >
          <Save className="w-3 h-3" />
          {isSaving ? "Saving…" : "Save"}
        </button>

        <div className="flex-1 min-w-0">
          {saveError && (
            <span className="text-[11px] text-red-500">{saveError}</span>
          )}
          {isDirty && !saveError && (
            <span className="text-[10px]" style={{ color: T.inkTertiary }}>
              Unsaved
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setViewMode((m) => (m === "document" ? "json" : "document"))}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium hover:opacity-70 transition-opacity"
          style={{ color: T.inkTertiary }}
        >
          <Code2 className="w-3.5 h-3.5" />
          {viewMode === "document" ? "JSON" : "Edit"}
        </button>
      </div>
    </div>
  )
}
