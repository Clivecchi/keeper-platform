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
 */

import * as React from "react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import type { DesignerAudience } from "./DesignBoard"
import { CORE_FRAME_MAP, FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { V0ShellProvider, useV0Shell } from "../../shell/V0ShellContext"
import { FrameContextProvider } from "../../shell/FrameContext"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
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
  draftSpecJson: unknown | null
  audience: DesignerAudience
  setAudience: (a: DesignerAudience) => void
  showRawJson: boolean
  setShowRawJson: (v: boolean) => void
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
}: DesignerFramePreviewProps) {
  // The domain frame shown in the preview: draft takes priority over live.
  // draftSpecJson is the FULL DomainFrameJson built by DesignBoardKip (live frame
  // with the proposed frame block merged in at the correct JSON key). Spreading it
  // over liveDomainFrame is safe — unchanged keys pass through, the edited key wins.
  const previewDomainFrame = React.useMemo<DomainFrameJson | null>(() => {
    if (draftSpecJson && liveDomainFrame && typeof draftSpecJson === "object" && !Array.isArray(draftSpecJson)) {
      return { ...liveDomainFrame, ...(draftSpecJson as Partial<DomainFrameJson>) }
    }
    return liveDomainFrame
  }, [draftSpecJson, liveDomainFrame])

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
          /* Rendered frame preview — wrapped in a context override */
          <div className="h-full overflow-auto" style={{ pointerEvents: "none" }}>
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
    </div>
  )
}
