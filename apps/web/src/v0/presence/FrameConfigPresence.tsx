"use client"

/**
 * FrameConfigPresence
 * ===================
 * KeeperPresence config layout for frame objects.
 * Preview, props catalog, and quiet JSON — still on the board surface.
 */

import * as React from "react"
import type { DomainFrameJson } from "../data/domain-frame.types"
import { useDesignerDraftOptional } from "../boards/DesignerDraftContext"
import { CORE_FRAME_MAP, FRAME_TO_JSON_KEY } from "../shell/frameRegistryMap"
import { V0ShellProvider, useV0Shell } from "../shell/V0ShellContext"
import { FrameContextProvider } from "../shell/FrameContext"
import { PropRenderer } from "../../components/domain/PropRenderer"
import { PROPS_CATALOG_SECTIONS } from "./propsCatalog"
import {
  createFrameProp,
  normalizeFrameProps,
  saveFrameProps,
  type PresenceFrameProp,
} from "./frameProps"

export interface FrameConfigPresenceProps {
  frameKey: string
  frameName: string
  domainId: string
  domainSlug?: string
  frameInstanceId: string | null
  pattern?: string
  visibility?: string
  description?: string
  props: PresenceFrameProp[]
  frameJson?: string
  domainSnapshot?: Record<string, unknown>
  onPropsSaved?: () => void
  onLabelResolved?: (label: string) => void
}

type DesignerAudience = "guest" | "keeper" | "admin"

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

  const previewValue = React.useMemo(
    () => ({
      ...parentShell,
      frame: frameKey as never,
      domainSlug,
      domainFrame,
      resolvedAudience: audience,
      navigateToFrame: () => {},
      closeToBoard: () => {},
      buildFrameUrl: () => "#",
      draftId: null,
    }),
    [parentShell, frameKey, domainSlug, domainFrame, audience],
  )

  return (
    <V0ShellProvider value={previewValue}>
      <FrameContextProvider
        domainSlug={domainSlug}
        frame={frameKey as never}
        placementMode={parentShell.placementMode}
        themeSlug={parentShell.themeSlug}
        draftId={null}
      >
        {children}
      </FrameContextProvider>
    </V0ShellProvider>
  )
}

function PresenceSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

export function FrameConfigPresence({
  frameKey,
  frameName,
  domainId,
  domainSlug = "default",
  frameInstanceId,
  pattern,
  visibility,
  description,
  props: initialProps,
  frameJson,
  domainSnapshot,
  onPropsSaved,
  onLabelResolved,
}: FrameConfigPresenceProps) {
  const draftCtx = useDesignerDraftOptional()
  const [props, setProps] = React.useState<PresenceFrameProp[]>(initialProps)
  const [adding, setAdding] = React.useState<string | null>(null)
  const [showJson, setShowJson] = React.useState(false)
  const hairline = "hsl(var(--theme-border-soft) / 0.35)"

  React.useEffect(() => {
    setProps(initialProps)
  }, [initialProps])

  React.useEffect(() => {
    if (frameName && onLabelResolved) onLabelResolved(frameName)
  }, [frameName, onLabelResolved])

  const previewDomainFrame = React.useMemo<DomainFrameJson | null>(() => {
    const live = draftCtx?.liveDomainFrame ?? null
    const draft = draftCtx?.draftSpecJson
    if (draft) return { ...live, ...draft } as DomainFrameJson
    return live
  }, [draftCtx?.draftSpecJson, draftCtx?.liveDomainFrame])

  const FrameComponent = CORE_FRAME_MAP[frameKey] ?? null
  const metaParts = [
    pattern ? `${pattern} pattern` : null,
    visibility ? visibility : null,
    props.length > 0 ? `${props.length} prop${props.length === 1 ? "" : "s"}` : null,
  ].filter(Boolean)

  const handleAddProp = async (propType: string, propConfig: Record<string, unknown>) => {
    if (!frameInstanceId || adding) return
    setAdding(propType)
    const newProp = createFrameProp(propType, propConfig, props.length)
    const updated = [...props, newProp]
    setProps(updated)
    const ok = await saveFrameProps(domainId, frameInstanceId, updated)
    if (!ok) {
      setProps(props)
    } else {
      onPropsSaved?.()
    }
    setAdding(null)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Configuring
        </p>
        <p
          className="text-[12px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Frame
        </p>
        <h2
          className="text-[17px] font-semibold leading-snug mt-1"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {frameName}
        </h2>
        {description && (
          <p
            className="text-[14px] leading-relaxed mt-2"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {description}
          </p>
        )}
        {metaParts.length > 0 && (
          <p
            className="text-[12px] mt-2 leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {metaParts.join(" · ")}
          </p>
        )}
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4">
        <PresenceSection title="Preview">
          <div
            className="rounded-md overflow-hidden border"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.5)",
              background: "hsl(var(--theme-surface-paper) / 0.72)",
              maxHeight: 220,
            }}
          >
            {FrameComponent ? (
              <div className="overflow-auto" style={{ maxHeight: 220, transform: "scale(0.92)", transformOrigin: "top center" }}>
                <FramePreviewShell
                  domainSlug={domainSlug}
                  frameKey={frameKey}
                  domainFrame={previewDomainFrame}
                  audience="keeper"
                >
                  <FrameComponent styleId="neutral" themeSlug={null} domainSlug={domainSlug} />
                </FramePreviewShell>
              </div>
            ) : props.length > 0 ? (
              <div className="p-3 space-y-2">
                {props.map((prop) => (
                  <PropRenderer
                    key={prop.id}
                    prop={{
                      id: prop.id,
                      type: prop.type,
                      config: prop.config,
                      value: prop.value,
                      orderIndex: prop.orderIndex ?? 0,
                    }}
                    domain={domainSnapshot}
                  />
                ))}
              </div>
            ) : (
              <p
                className="p-4 text-[14px] text-center"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                Add props below to shape this frame.
              </p>
            )}
          </div>
        </PresenceSection>

        <PresenceSection title="Props">
          {!frameInstanceId ? (
            <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              Connecting to frame instance…
            </p>
          ) : (
            <>
              {props.length > 0 && (
                <div className="space-y-1 mb-4">
                  {props.map((prop) => {
                    const displayName =
                      (typeof prop.config.name === "string" ? prop.config.name : null) ||
                      prop.type
                    return (
                      <div
                        key={prop.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5"
                        style={{ background: "hsl(var(--theme-surface-elevated) / 0.55)" }}
                      >
                        <span
                          className="flex-1 text-[14px] font-medium truncate"
                          style={{ color: "hsl(var(--theme-ink-primary))" }}
                        >
                          {displayName}
                        </span>
                        <span
                          className="shrink-0 font-mono text-[12px]"
                          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                        >
                          {prop.type}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {PROPS_CATALOG_SECTIONS.map((section) => (
                <div key={section.label} className="mb-3">
                  <p
                    className="text-[12px] font-medium mb-1.5"
                    style={{ color: `hsl(var(${section.colorVar}))` }}
                  >
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        disabled={Boolean(adding)}
                        onClick={() => void handleAddProp(item.propType, item.propConfig)}
                        className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ background: "hsl(var(--theme-surface-elevated) / 0.4)" }}
                      >
                        <span>
                          <span
                            className="block text-[14px] font-medium"
                            style={{ color: "hsl(var(--theme-ink-primary))" }}
                          >
                            {item.name}
                          </span>
                          <span
                            className="block text-[12px]"
                            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                          >
                            {item.description}
                          </span>
                        </span>
                        <span
                          className="shrink-0 text-[14px] font-light"
                          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                        >
                          {adding === item.propType ? "…" : "+"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </PresenceSection>

        {frameJson && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowJson((v) => !v)}
              className="text-[12px] transition-opacity hover:opacity-80"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {showJson ? "Hide" : "Show"} frame JSON
            </button>
            {showJson && (
              <pre
                className="mt-2 p-3 rounded-md text-[12px] leading-relaxed overflow-auto max-h-40"
                style={{
                  fontFamily: "ui-monospace, monospace",
                  color: "hsl(var(--theme-ink-tertiary))",
                  background: "hsl(var(--theme-surface-elevated) / 0.2)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {frameJson}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Parse frame props array from enriched record. */
export function parseFramePropsFromRecord(
  record: Record<string, unknown>,
): PresenceFrameProp[] {
  return normalizeFrameProps(record.frameProps)
}
