"use client"

/**
 * DesignBoardCanvas (was DesignerFramePreview) — Right panel of the Design Board.
 *
 * Renders the active V0 Frame using the same CORE_FRAME_MAP registry.
 * The frame component receives a V0ShellProvider override so it reads
 * draft JSON (when a draft is active) or live JSON as its domainFrame.
 *
 * Controls:
 *   • Audience switcher — Guest · Keeper · Admin
 *   • JSON toggle — switches between rendered frame and raw JSON view
 *   • "Draft preview" badge appears when draftSpecJson is set
 *   • Click any text in the preview to edit it inline (direct-edit mode)
 */

import * as React from "react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import type { DesignerAudience } from "./DesignBoardFrameDetail"
import { CORE_FRAME_MAP, FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { V0ShellProvider, useV0Shell } from "../../shell/V0ShellContext"
import { FrameContextProvider } from "../../shell/FrameContext"

/** True when Design Board debug logging is enabled (VITE_DESIGNER_DEBUG=1 or window.__keeperDebug.designer) */
function isDesignerDebug(): boolean {
  if (typeof window === "undefined") return false
  const env = (import.meta as any)?.env?.VITE_DESIGNER_DEBUG
  if (env === "1" || env === "true") return true
  return Boolean((window as any).__keeperDebug?.designer)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

// ─── String-leaf utilities for direct editing ─────────────────────────────────

type StringLeaf = { path: string[]; value: string }

/** Extract every string leaf from a JSON block with its dot-path */
function extractStringLeaves(obj: unknown, path: string[] = []): StringLeaf[] {
  if (typeof obj === "string" && obj.trim()) return [{ path, value: obj }]
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return []
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    extractStringLeaves(v, [...path, k]),
  )
}

/** Set a deeply-nested value by path, returning a new object */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string[],
  value: string,
): Record<string, unknown> {
  if (path.length === 0) return obj
  const [head, ...rest] = path
  if (rest.length === 0) return { ...obj, [head]: value }
  return {
    ...obj,
    [head]: setNestedValue((obj[head] as Record<string, unknown>) ?? {}, rest, value),
  }
}

// ─── Inline edit popup ────────────────────────────────────────────────────────

interface EditPopupState {
  x: number
  y: number
  path: string[]
  value: string
}

function EditPopup({
  popup,
  onSave,
  onClose,
}: {
  popup: EditPopupState
  onSave: (path: string[], newValue: string) => void
  onClose: () => void
}) {
  const [value, setValue] = React.useState(popup.value)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-edit-popup]")) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); onSave(popup.path, value) }
    if (e.key === "Escape") onClose()
  }

  const label = popup.path.join(" › ")

  return (
    <div
      data-edit-popup
      style={{
        position: "fixed",
        left: Math.min(popup.x, window.innerWidth - 300),
        top: popup.y + 8,
        zIndex: 9999,
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: 8,
        padding: "10px 12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
        minWidth: 260,
        maxWidth: 340,
      }}
    >
      <p
        style={{
          fontSize: 10,
          color: "#6b7280",
          marginBottom: 6,
          fontFamily: "ui-monospace, monospace",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 13,
            color: "#111827",
            outline: "none",
            background: "#f9fafb",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#6b7280" }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db" }}
        />
        <button
          type="button"
          onClick={() => onSave(popup.path, value)}
          style={{
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "5px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            color: "#6b7280",
            border: "1px solid #e5e7eb",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 5 }}>
        Enter to save · Esc to cancel
      </p>
    </div>
  )
}

// ─── Preview wrapper that overrides V0ShellContext for the inner frame ─────────

function FramePreviewShell({
  domainSlug,
  frameKey,
  domainFrame,
  audience,
  children,
}: {
  domainSlug: string
  frameKey: string
  domainFrame: DomainFrameJson | null
  audience: DesignerAudience
  children: React.ReactNode
}) {
  const parentShell = useV0Shell()

  const previewValue = React.useMemo(() => ({
    ...parentShell,
    frame: frameKey as any,
    domainSlug,
    domainFrame,
    resolvedAudience: audience,
    // Navigation stubs — preview is display-only
    navigateToFrame: () => {},
    closeToBoard: () => {},
    buildFrameUrl: () => "#",
    draftId: null,
  }), [parentShell, frameKey, domainSlug, domainFrame, audience])

  return (
    <V0ShellProvider value={previewValue}>
      <FrameContextProvider
        domainSlug={domainSlug}
        frame={frameKey as any}
        experienceMode={parentShell.experienceMode}
        themeSlug={parentShell.themeSlug}
        draftId={null}
      >
        {children}
      </FrameContextProvider>
    </V0ShellProvider>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DesignerFramePreviewProps {
  domainSlug: string
  activeFrameKey: string | null
  liveDomainFrame: DomainFrameJson | null
  draftSpecJson: DomainFrameJson | null
  audience: DesignerAudience
  setAudience: (a: DesignerAudience) => void
  showRawJson: boolean
  setShowRawJson: (v: boolean) => void
  onDirectEdit: (updatedFrame: DomainFrameJson) => void
}

const AUDIENCE_OPTIONS: { key: DesignerAudience; label: string }[] = [
  { key: "guest", label: "Guest" },
  { key: "keeper", label: "Keeper" },
  { key: "admin", label: "Admin" },
]

export function DesignerFramePreview({
  domainSlug,
  activeFrameKey,
  liveDomainFrame,
  draftSpecJson,
  audience,
  setAudience,
  showRawJson,
  setShowRawJson,
  onDirectEdit,
}: DesignerFramePreviewProps) {
  // The domain frame shown in the preview: draft takes priority over live.
  // draftSpecJson is the FULL DomainFrameJson (live frame with one block replaced).
  const previewDomainFrame = React.useMemo<DomainFrameJson | null>(() => {
    if (draftSpecJson) return { ...liveDomainFrame, ...draftSpecJson } as DomainFrameJson
    return liveDomainFrame
  }, [draftSpecJson, liveDomainFrame])

  React.useEffect(() => {
    if (!isDesignerDebug()) return
    const jsonKey = activeFrameKey ? (FRAME_TO_JSON_KEY[activeFrameKey] ?? null) : null
    const block = previewDomainFrame && jsonKey ? (previewDomainFrame as Record<string, unknown>)[jsonKey] : null
    console.log("[DesignBoard:debug] previewDomainFrame updated", {
      activeFrameKey,
      hasDraftSpec: Boolean(draftSpecJson),
      hasLiveFrame: Boolean(liveDomainFrame),
      blockKeys: block && typeof block === "object" ? Object.keys(block) : null,
    })
  }, [previewDomainFrame, activeFrameKey, draftSpecJson, liveDomainFrame])

  // ── Direct-edit state ──
  const [editPopup, setEditPopup] = React.useState<EditPopupState | null>(null)

  // String leaves extracted from the current frame's JSON block (for click-matching)
  const stringLeaves = React.useMemo<StringLeaf[]>(() => {
    const jsonKey = activeFrameKey ? (FRAME_TO_JSON_KEY[activeFrameKey] ?? null) : null
    if (!jsonKey || !previewDomainFrame) return []
    const block = (previewDomainFrame as Record<string, unknown>)[jsonKey]
    return extractStringLeaves(block)
  }, [activeFrameKey, previewDomainFrame])

  // Click-capture overlay handler — uses poke-through to identify the underlying element
  const handleOverlayClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!activeFrameKey || showRawJson) return
      const jsonKey = activeFrameKey ? (FRAME_TO_JSON_KEY[activeFrameKey] ?? null) : null
      if (!jsonKey) return // non-governed frame — nothing to edit

      const overlay = e.currentTarget
      // Temporarily disable pointer events on the overlay so elementFromPoint
      // returns the underlying rendered element
      overlay.style.pointerEvents = "none"
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      overlay.style.pointerEvents = ""

      if (!target) return
      const clickedText = target.textContent?.trim() ?? ""
      if (!clickedText) return

      // Find a string leaf whose value matches the clicked text
      const leaf = stringLeaves.find((l) => l.value === clickedText)
      if (!leaf) return

      setEditPopup({ x: e.clientX, y: e.clientY, path: leaf.path, value: leaf.value })
    },
    [activeFrameKey, showRawJson, stringLeaves],
  )

  const handleEditSave = React.useCallback(
    (path: string[], newValue: string) => {
      if (!activeFrameKey || !previewDomainFrame) return
      const jsonKey = FRAME_TO_JSON_KEY[activeFrameKey] ?? null
      if (!jsonKey) return

      const currentBlock = (previewDomainFrame as Record<string, unknown>)[jsonKey] as Record<string, unknown> ?? {}
      const updatedBlock = setNestedValue(currentBlock, path, newValue)
      const updatedFrame = { ...previewDomainFrame, [jsonKey]: updatedBlock } as DomainFrameJson
      onDirectEdit(updatedFrame)
      setEditPopup(null)
    },
    [activeFrameKey, previewDomainFrame, onDirectEdit],
  )

  const isDraftPreview = Boolean(draftSpecJson)

  // Determine the JSON block shown when JSON toggle is on
  const jsonKey = activeFrameKey ? (FRAME_TO_JSON_KEY[activeFrameKey] ?? null) : null
  const jsonBlockValue = jsonKey && previewDomainFrame
    ? (previewDomainFrame as any)[jsonKey]
    : previewDomainFrame

  const FrameComponent = activeFrameKey ? CORE_FRAME_MAP[activeFrameKey] ?? null : null
  const frameDisplayName = activeFrameKey ? (FRAME_DISPLAY_NAMES[activeFrameKey] ?? activeFrameKey) : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b"
        style={{
          background: "#ffffff",
          borderColor: "#e5e7eb",
        }}
      >
        {/* Left: title + draft badge */}
        <div className="flex items-center gap-2 min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-widest shrink-0"
            style={{ color: "#4b5563" }}
          >
            {frameDisplayName ?? "Live Preview"}
          </p>
          {isDraftPreview && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "hsl(43 100% 93%)",
                color: "hsl(43 90% 35%)",
                border: "1px solid hsl(43 80% 75%)",
              }}
            >
              Draft preview
            </span>
          )}
        </div>

        {/* Right: audience switcher + JSON toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Audience switcher */}
          <div
            className="flex rounded-md overflow-hidden border text-[11px]"
            style={{ borderColor: "#e5e7eb" }}
          >
            {AUDIENCE_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setAudience(key)}
                className="px-2 py-1 transition-colors"
                style={{
                  background: audience === key ? "#111827" : "transparent",
                  color: audience === key ? "#ffffff" : "#4b5563",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* JSON toggle */}
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="rounded px-2 py-1 text-[11px] transition-colors border"
            style={{
              background: showRawJson ? "#111827" : "transparent",
              color: showRawJson ? "#ffffff" : "#4b5563",
              borderColor: "#e5e7eb",
            }}
          >
            {"{ }"}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto">
        {!activeFrameKey ? (
          <div className="flex h-full items-center justify-center">
            <p
              className="text-[13px] text-center"
              style={{ color: "#6b7280" }}
            >
              Select a frame to preview
            </p>
          </div>
        ) : showRawJson ? (
          /* Raw JSON view */
          jsonKey ? (
            <pre
              className="p-4 text-[11px] leading-relaxed overflow-auto h-full"
              style={{
                fontFamily: "ui-monospace, 'Cascadia Code', monospace",
                color: "#111827",
                background: "#f9fafb",
              }}
            >
              {formatJson(jsonBlockValue)}
            </pre>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <div
                className="rounded-full flex items-center justify-center"
                style={{ width: 36, height: 36, background: "#f3f4f6" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 5v3M8 10.5v.5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="8" cy="8" r="6.25" stroke="#9ca3af" strokeWidth="1.5"/>
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-medium" style={{ color: "#374151" }}>
                  No JSON block for this frame
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "#9ca3af" }}>
                  This frame renders live data — its content is not governed by frame JSON.
                </p>
              </div>
            </div>
          )
        ) : FrameComponent ? (
          /* Rendered frame preview — frame has pointer-events disabled to prevent
             accidental navigation; a transparent overlay captures clicks for direct editing */
          <div className="relative h-full overflow-auto">
            <div style={{ pointerEvents: "none" }}>
              <FramePreviewShell
                domainSlug={domainSlug}
                frameKey={activeFrameKey}
                domainFrame={previewDomainFrame}
                audience={audience}
              >
                <FrameComponent
                  styleId="neutral"
                  themeSlug={null}
                  domainSlug={domainSlug}
                />
              </FramePreviewShell>
            </div>
            {/* Click-capture overlay — only on JSON-governed frames */}
            {FRAME_TO_JSON_KEY[activeFrameKey] && (
              <div
                className="absolute inset-0"
                style={{ cursor: "text", zIndex: 10 }}
                onClick={handleOverlayClick}
                title="Click any text to edit it"
              />
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p
              className="text-[13px]"
              style={{ color: "#6b7280" }}
            >
              No preview available for this frame
            </p>
          </div>
        )}
      </div>

      {/* Direct-edit hint footer — only shown for JSON-governed frames in preview mode */}
      {!showRawJson && activeFrameKey && FRAME_TO_JSON_KEY[activeFrameKey] && (
        <div
          className="shrink-0 px-4 py-1.5 border-t"
          style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}
        >
          <p style={{ fontSize: 10, color: "#9ca3af" }}>
            Click any text in the preview to edit it directly
          </p>
        </div>
      )}

      {/* Inline edit popup */}
      {editPopup && (
        <EditPopup
          popup={editPopup}
          onSave={handleEditSave}
          onClose={() => setEditPopup(null)}
        />
      )}
    </div>
  )
}
