"use client"

import * as React from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Check, Eye } from "lucide-react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import type { DesignerAudience } from "./DesignBoard"

/** A single component added to a FrameInstance via the Props tab. */
export type FrameProp = {
  id: string
  type: string
  config: Record<string, unknown>
}
import type { FrameItem } from "./DesignBoardFrameList"
import { CORE_FRAME_MAP, FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { V0ShellProvider, useV0Shell } from "../../shell/V0ShellContext"
import { FrameContextProvider } from "../../shell/FrameContext"
import { DomainBrief } from "../../components/DomainBrief"

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "preview" | "config" | "props" | "json" | "brief" | "code"

const TABS: { key: TabKey; label: string }[] = [
  { key: "preview", label: "Preview" },
  { key: "config", label: "Config" },
  { key: "props", label: "Props" },
  { key: "json", label: "JSON" },
  { key: "brief", label: "Brief" },
  { key: "code", label: "Code" },
]

// ─── Helpers (preserved from DesignBoardCanvas.tsx) ───────────────────────────

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

type StringLeaf = { path: string[]; value: string; blockKey?: string }

function extractStringLeaves(obj: unknown, path: string[] = []): StringLeaf[] {
  if (typeof obj === "string" && obj.trim()) return [{ path, value: obj }]
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return []
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    extractStringLeaves(v, [...path, k]),
  )
}

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

function extractFrameLabels(frameBlock: unknown): { title: string; emptyState: string; action: string } {
  if (!frameBlock || typeof frameBlock !== "object") {
    return { title: "\u2014", emptyState: "\u2014", action: "\u2014" }
  }
  const obj = frameBlock as Record<string, any>
  const title =
    obj.frame_title ?? obj.labels?.frame_title ?? obj.labels?.frameTitle ?? "\u2014"
  const emptyState =
    obj.coming_soon_heading ??
    obj.messaging?.empty_states?.no_journeys_heading ??
    obj.messaging?.empty ??
    "\u2014"
  const action =
    obj.cta_back_to_commons ?? obj.labels?.actions?.back_to_commons ?? "\u2014"
  return { title, emptyState, action }
}

// ─── Inline edit popup (preserved from DesignBoardCanvas.tsx) ─────────────────

interface EditPopupState {
  x: number
  y: number
  path: string[]
  value: string
  /** Top-level `DomainFrameJson` key to patch when different from the frame block (e.g. `theme` on cover). */
  blockKey?: string
}

function EditPopup({
  popup,
  onSave,
  onClose,
}: {
  popup: EditPopupState
  onSave: (path: string[], newValue: string, blockKey?: string) => void
  onClose: () => void
}) {
  const [value, setValue] = React.useState(popup.value)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-edit-popup]")) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onSave(popup.path, value, popup.blockKey)
    }
    if (e.key === "Escape") onClose()
  }

  const label = [popup.blockKey, ...popup.path].filter(Boolean).join(" \u203A ")

  return (
    <div
      data-edit-popup
      style={{
        position: "fixed",
        left: Math.min(popup.x, window.innerWidth - 300),
        top: popup.y + 8,
        zIndex: 9999,
        background: "hsl(var(--theme-surface-paper))",
        border: "1px solid hsl(var(--theme-border-soft))",
        borderRadius: 8,
        padding: "10px 12px",
        boxShadow: "0 4px 16px hsl(var(--theme-ink-primary) / 0.12)",
        minWidth: 260,
        maxWidth: 340,
      }}
    >
      <p
        style={{
          fontSize: 10,
          color: "hsl(var(--theme-ink-secondary))",
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
            border: "1px solid hsl(var(--theme-border-soft))",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 13,
            color: "hsl(var(--theme-ink-primary))",
            outline: "none",
            background: "hsl(var(--theme-surface-elevated) / 0.4)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "hsl(var(--theme-ink-secondary))"
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "hsl(var(--theme-border-soft))"
          }}
        />
        <button
          type="button"
          onClick={() => onSave(popup.path, value, popup.blockKey)}
          style={{
            background: "hsl(var(--theme-ink-primary))",
            color: "hsl(var(--theme-surface-paper))",
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
            color: "hsl(var(--theme-ink-secondary))",
            border: "1px solid hsl(var(--theme-border-soft))",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: 10, color: "hsl(var(--theme-ink-tertiary))", marginTop: 5 }}>
        Enter to save · Esc to cancel
      </p>
    </div>
  )
}

// ─── FramePreviewShell (preserved from DesignBoardCanvas.tsx) ─────────────────

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
      frame: frameKey as any,
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

// ─── Audience switcher ────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS: { key: DesignerAudience; label: string }[] = [
  { key: "guest", label: "Guest" },
  { key: "keeper", label: "Keeper" },
  { key: "admin", label: "Admin" },
]

// ─── Config tab ───────────────────────────────────────────────────────────────

function ConfigTabContent({
  frameBlock,
}: {
  frameBlock: unknown
}) {
  const labels = extractFrameLabels(frameBlock)

  const frameProps = [
    { label: "Mode", value: "use" },
    { label: "Scope", value: "own" },
    { label: "Role", value: "keeper" },
    { label: "Data scope", value: "domain" },
  ]

  const labelEntries = [
    { label: "Title", value: labels.title },
    { label: "Empty state", value: labels.emptyState },
    { label: "Action", value: labels.action },
  ]

  return (
    <div className="p-4 space-y-5">
      <div>
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Frame Props
        </p>
        <div className="space-y-2">
          {frameProps.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                {item.label}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border"
                style={{
                  background: "hsl(var(--theme-surface-elevated) / 0.4)",
                  color: "hsl(var(--theme-ink-primary))",
                  borderColor: "hsl(var(--theme-border-soft))",
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid hsl(var(--theme-border-soft))" }} />

      <div>
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Labels
        </p>
        <div className="space-y-2">
          {labelEntries.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2">
              <span className="text-[12px] shrink-0" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                {item.label}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border truncate max-w-[60%]"
                style={{
                  background: "hsl(var(--theme-surface-elevated) / 0.4)",
                  color: "hsl(var(--theme-ink-primary))",
                  borderColor: "hsl(var(--theme-border-soft))",
                }}
                title={item.value}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Brief tab — domain brief, domain-wide view ───────────────────────────────

function BriefTabContent({ liveDomainFrame }: { liveDomainFrame: DomainFrameJson | null }) {
  if (!liveDomainFrame) {
    return (
      <div className="flex h-full items-center justify-center">
        <p
          className="text-[13px]"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Loading domain brief…
        </p>
      </div>
    )
  }
  return (
    <div className="overflow-y-auto h-full keeper-panel-scroll">
      <DomainBrief domainFrame={liveDomainFrame} />
    </div>
  )
}

// ─── Code tab — full domain JSON, domain-wide view ────────────────────────────

function CodeTabContent({ domainFrame }: { domainFrame: DomainFrameJson | null }) {
  const json = domainFrame
    ? formatJson(domainFrame)
    : "// Domain frame not loaded yet"

  const highlighted = domainFrame
    ? json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let color = "hsl(var(--theme-accent-secondary))"
          if (/^"/.test(match)) {
            color = /:$/.test(match)
              ? "hsl(var(--theme-ink-primary))"
              : "hsl(var(--theme-accent-primary) / 0.8)"
          } else if (/true|false/.test(match)) {
            color = "hsl(var(--theme-accent-tertiary, var(--theme-accent-primary)))"
          } else if (/null/.test(match)) {
            color = "hsl(var(--theme-ink-tertiary))"
          }
          return `<span style="color:${color}">${match}</span>`
        },
      )
    : json

  return (
    <pre
      className="p-4 text-[11px] leading-relaxed overflow-auto h-full"
      style={{
        fontFamily: "ui-monospace, 'Cascadia Code', monospace",
        color: "hsl(var(--theme-ink-secondary))",
        background: "hsl(var(--theme-surface-paper) / 0.6)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-words",
      }}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  )
}

// ─── Props tab ────────────────────────────────────────────────────────────────

interface CatalogItem {
  name: string
  description: string
  /** FrameInstance prop type key — matches board-studio API. */
  propType: string
  /** Default config payload sent to PATCH endpoint. */
  propConfig: Record<string, unknown>
}

interface PropSection {
  label: string
  /** CSS custom property name (without --) that resolves to an HSL channel triple. */
  colorVar: string
  items: CatalogItem[]
}

const PROP_SECTIONS: PropSection[] = [
  {
    label: "Media",
    colorVar: "--theme-accent-secondary",
    items: [
      { name: "Hero Image",    description: "Full-width hero image banner",  propType: "image",    propConfig: { url: "", alt: "Hero image", size: "large", name: "Hero Image" } },
      { name: "Video Player",  description: "Embedded video playback",       propType: "media",    propConfig: { url: "", type: "video", autoplay: false, name: "Video Player" } },
      { name: "Image Gallery", description: "Multi-image grid layout",       propType: "gallery",  propConfig: { images: [], layout: "grid", columns: 3, name: "Image Gallery" } },
    ],
  },
  {
    label: "Content",
    colorVar: "--theme-accent-primary",
    items: [
      { name: "Heading",    description: "Section heading text",         propType: "heading", propConfig: { content: "Enter heading text...", level: 2, alignment: "left", name: "Heading" } },
      { name: "Text Block", description: "Rich text paragraph content",  propType: "text",    propConfig: { content: "Enter your text here...", fontSize: "medium", bold: false, name: "Text Block" } },
      { name: "Quote",      description: "Styled quote or callout",      propType: "quote",   propConfig: { content: "Enter quote text...", author: "", style: "default", name: "Quote" } },
    ],
  },
  {
    label: "Interactive",
    colorVar: "--theme-accent-secondary",
    items: [
      { name: "Action Button", description: "Primary CTA button",          propType: "button", propConfig: { label: "Click me", action: "", variant: "primary", name: "Action Button" } },
      { name: "Form",          description: "Input form with fields",      propType: "form",   propConfig: { fields: [], submitLabel: "Submit", action: "", name: "Form" } },
    ],
  },
  {
    label: "AI",
    colorVar: "--theme-accent-tertiary",
    items: [
      { name: "AI Token",          description: "Dynamic AI-generated token",    propType: "ai-assistant", propConfig: { displayName: "AI Assistant", avatarUrl: "/placeholder.svg", personaNote: "Helpful AI assistant", name: "AI Token" } },
      { name: "AI Assistant",      description: "Embedded Kip assistant",        propType: "ai-assistant", propConfig: { greeting: "Hello! How can I help you?", capabilities: [], name: "AI Assistant" } },
      { name: "Smart Suggestions", description: "Context-aware suggestions",     propType: "ai-assistant", propConfig: { type: "suggestions", title: "Smart Suggestions", suggestions: [], name: "Smart Suggestions" } },
    ],
  },
]

function PropsTabContent({
  frameInstanceProps,
  onAddProp,
}: {
  frameInstanceProps: FrameProp[]
  onAddProp: ((type: string, config: Record<string, unknown>) => Promise<void>) | null
}) {
  const [adding, setAdding] = React.useState<string | null>(null)

  const handleAdd = async (item: CatalogItem) => {
    if (!onAddProp || adding) return
    setAdding(item.name)
    try {
      await onAddProp(item.propType, item.propConfig)
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="overflow-y-auto h-full keeper-panel-scroll">

      {/* Current frame components */}
      {frameInstanceProps.length > 0 && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "hsl(var(--theme-border-soft))" }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Added ({frameInstanceProps.length})
          </p>
          <div className="space-y-1">
            {frameInstanceProps.map((prop) => {
              const displayName = (prop.config.name as string | undefined) || prop.type
              return (
                <div
                  key={prop.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5"
                  style={{ background: "hsl(var(--theme-surface-elevated) / 0.4)" }}
                >
                  <span
                    className="flex-1 text-[12px] font-medium truncate"
                    style={{ color: "hsl(var(--theme-ink-primary))" }}
                  >
                    {displayName}
                  </span>
                  <span
                    className="shrink-0 font-mono text-[10px]"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  >
                    {prop.type}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Catalog */}
      <div className="p-4 space-y-5">
        {!onAddProp && (
          <p
            className="text-[12px] text-center py-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Connecting to frame…
          </p>
        )}
        {PROP_SECTIONS.map((section) => (
          <div key={section.label}>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isAdding = adding === item.name
                const disabled = !onAddProp || !!adding
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleAdd(item)}
                    disabled={disabled}
                    className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-md text-left transition-colors"
                    style={{ opacity: disabled && !isAdding ? 0.5 : 1 }}
                    onMouseEnter={(e) => {
                      if (!disabled) e.currentTarget.style.background = `hsl(var(${section.colorVar}) / 0.06)`
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "" }}
                  >
                    <div
                      className="shrink-0 rounded-sm flex items-center justify-center"
                      style={{ width: 18, height: 18, background: `hsl(var(${section.colorVar}) / 0.08)` }}
                    >
                      <div
                        className="rounded-sm"
                        style={{ width: 8, height: 8, background: `hsl(var(${section.colorVar}))`, opacity: 0.6 }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[12px] font-medium leading-tight"
                        style={{ color: "hsl(var(--theme-ink-primary))" }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-[10px] leading-tight"
                        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                      >
                        {item.description}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-[13px] font-medium w-4 text-right"
                      style={{ color: `hsl(var(${section.colorVar}))` }}
                    >
                      {isAdding ? "…" : "+"}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── JSON tab with syntax highlighting ────────────────────────────────────────

function JsonTabContent({ value }: { value: unknown }) {
  const json = formatJson(value)

  const highlighted = json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let color = "hsl(var(--theme-accent-secondary))"
      if (/^"/.test(match)) {
        color = /:$/.test(match)
          ? "hsl(var(--theme-ink-primary))"
          : "hsl(var(--theme-accent-primary) / 0.8)"
      } else if (/true|false/.test(match)) {
        color = "hsl(var(--theme-accent-tertiary, var(--theme-accent-primary)))"
      } else if (/null/.test(match)) {
        color = "hsl(var(--theme-ink-tertiary))"
      }
      return `<span style="color:${color}">${match}</span>`
    },
  )

  return (
    <pre
      className="p-4 text-[11px] leading-relaxed overflow-auto h-full"
      style={{
        fontFamily: "ui-monospace, 'Cascadia Code', monospace",
        color: "hsl(var(--theme-ink-secondary))",
        background: "hsl(var(--theme-surface-elevated) / 0.3)",
      }}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DesignBoardFrameDetailProps {
  domainSlug: string
  activeFrameKey: string | null
  activeFrameInfo: FrameItem | null
  liveDomainFrame: DomainFrameJson | null
  draftSpecJson: DomainFrameJson | null
  audience: DesignerAudience
  setAudience: (a: DesignerAudience) => void
  onDirectEdit: (updatedFrame: DomainFrameJson) => void
  /** Current FrameInstance props for this frame (from board-data). */
  frameInstanceProps: FrameProp[]
  /** Async callback to add a prop — null when frame is not yet connected to board-data. */
  onAddProp: ((type: string, config: Record<string, unknown>) => Promise<void>) | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignBoardFrameDetail({
  domainSlug,
  activeFrameKey,
  activeFrameInfo,
  liveDomainFrame,
  draftSpecJson,
  audience,
  setAudience,
  onDirectEdit,
  frameInstanceProps,
  onAddProp,
}: DesignBoardFrameDetailProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>("preview")
  const [editPopup, setEditPopup] = React.useState<EditPopupState | null>(null)

  // Reset tab when frame changes
  React.useEffect(() => {
    setActiveTab("preview")
    setEditPopup(null)
  }, [activeFrameKey])

  const previewDomainFrame = React.useMemo<DomainFrameJson | null>(() => {
    if (draftSpecJson) return { ...liveDomainFrame, ...draftSpecJson } as DomainFrameJson
    return liveDomainFrame
  }, [draftSpecJson, liveDomainFrame])

  const jsonKey = activeFrameKey ? (FRAME_TO_JSON_KEY[activeFrameKey] ?? null) : null
  const jsonBlockValue = jsonKey && previewDomainFrame
    ? (previewDomainFrame as any)[jsonKey]
    : null

  const FrameComponent = activeFrameKey ? CORE_FRAME_MAP[activeFrameKey] ?? null : null

  // String leaves for direct editing (cover tagline lives under `theme`, not `cover`)
  const stringLeaves = React.useMemo<StringLeaf[]>(() => {
    if (!previewDomainFrame) return []
    const leaves: StringLeaf[] = []
    if (jsonKey) {
      const block = (previewDomainFrame as unknown as Record<string, unknown>)[jsonKey]
      for (const leaf of extractStringLeaves(block)) {
        leaves.push({ ...leaf, blockKey: jsonKey })
      }
    }
    if (activeFrameKey === "cover") {
      const theme = (previewDomainFrame as unknown as Record<string, unknown>)["theme"]
      if (theme && typeof theme === "object") {
        for (const leaf of extractStringLeaves(theme)) {
          leaves.push({ ...leaf, blockKey: "theme" })
        }
      }
    }
    return leaves
  }, [jsonKey, previewDomainFrame, activeFrameKey])

  const handleOverlayClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!activeFrameKey || activeTab !== "preview") return
      if (!jsonKey) return

      const overlay = e.currentTarget
      overlay.style.pointerEvents = "none"
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      overlay.style.pointerEvents = ""

      if (!target) return
      const clickedText = target.textContent?.trim() ?? ""
      if (!clickedText) return

      const leaf = stringLeaves.find(
        (l) =>
          l.value === clickedText ||
          l.value.includes(clickedText) ||
          clickedText.includes(l.value),
      )
      if (!leaf) return

      setEditPopup({
        x: e.clientX,
        y: e.clientY,
        path: leaf.path,
        value: leaf.value,
        blockKey: leaf.blockKey,
      })
    },
    [activeFrameKey, activeTab, jsonKey, stringLeaves],
  )

  const handleEditSave = React.useCallback(
    (path: string[], newValue: string, blockKey?: string) => {
      if (!activeFrameKey || !previewDomainFrame) return
      const rootKey = blockKey ?? jsonKey
      if (!rootKey) return

      const currentBlock =
        ((previewDomainFrame as unknown as Record<string, unknown>)[rootKey] as Record<string, unknown>) ??
        {}
      const updatedBlock = setNestedValue(currentBlock, path, newValue)
      const updatedFrame = { ...previewDomainFrame, [rootKey]: updatedBlock } as DomainFrameJson
      onDirectEdit(updatedFrame)
      setEditPopup(null)
    },
    [activeFrameKey, previewDomainFrame, jsonKey, onDirectEdit],
  )

  if (!activeFrameKey || !activeFrameInfo) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="density-content flex flex-1 items-center justify-center min-h-0">
          <p className="text-[13px] text-center" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Select a frame to view details
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="density-content flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header: dot + frame name */}
      <div
        className="shrink-0 flex items-center gap-2.5 px-4 py-3 border-b"
        style={{
          borderColor: "hsl(var(--theme-border-soft))",
          background: "hsl(var(--theme-surface-paper))",
        }}
      >
        <span
          className="shrink-0 rounded-full"
          style={{ width: 8, height: 8, background: activeFrameInfo.dotColor }}
        />
        <p
          className="text-[13px] font-semibold truncate"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {activeFrameInfo.name}
        </p>
      </div>

      {/* Tab bar */}
      <div
        className="shrink-0 flex border-b overflow-x-auto"
        style={{
          borderColor: "hsl(var(--theme-border-soft))",
          background: "hsl(var(--theme-surface-paper))",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="shrink-0 px-4 py-2 text-[12px] font-medium transition-colors"
            style={{
              color: activeTab === tab.key
                ? "hsl(var(--theme-ink-primary))"
                : "hsl(var(--theme-ink-tertiary))",
              borderBottom: activeTab === tab.key
                ? "2px solid hsl(var(--theme-ink-primary))"
                : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "preview" && (
          <div className="flex flex-col h-full">
            {/* Preview audience (compact menu) */}
            <div
              className="shrink-0 flex items-center justify-end px-4 py-2 border-b"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                background: "hsl(var(--theme-surface-elevated) / 0.3)",
              }}
            >
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="relative flex h-8 w-8 items-center justify-center rounded-md border transition-colors"
                    style={{
                      borderColor: "hsl(var(--theme-border-soft))",
                      color: "hsl(var(--theme-ink-primary))",
                      background: "transparent",
                    }}
                    aria-label="Preview audience"
                  >
                    <Eye className="h-4 w-4" strokeWidth={2} aria-hidden />
                    <span
                      className="pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full"
                      style={{
                        background:
                          audience === "admin"
                            ? "hsl(var(--theme-ink-primary))"
                            : audience === "keeper"
                              ? "hsl(var(--theme-accent-primary))"
                              : "hsl(var(--theme-ink-tertiary))",
                        border: "1px solid hsl(var(--theme-surface-paper))",
                      }}
                    />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    sideOffset={6}
                    align="end"
                    className="z-[10050] min-w-[148px] rounded-md border border-gray-200 bg-white py-1 text-[12px] shadow-md"
                  >
                    {AUDIENCE_OPTIONS.map(({ key, label }) => (
                      <DropdownMenu.Item
                        key={key}
                        className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 outline-none data-[highlighted]:bg-gray-100"
                        onSelect={() => setAudience(key)}
                      >
                        <span style={{ color: "hsl(var(--theme-ink-primary))" }}>{label}</span>
                        {audience === key ? (
                          <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--theme-ink-secondary))" }} aria-hidden />
                        ) : (
                          <span className="w-3.5 shrink-0" aria-hidden />
                        )}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-auto">
              {FrameComponent ? (
                <div className="relative h-full overflow-auto">
                  <div style={{ pointerEvents: "auto" }}>
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
                  {jsonKey && (
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
                  <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                    No preview available for this frame
                  </p>
                </div>
              )}
            </div>

            {/* Direct-edit hint */}
            {jsonKey && (
              <div
                className="shrink-0 px-4 py-1.5 border-t"
                style={{
                  borderColor: "hsl(var(--theme-border-soft))",
                  background: "hsl(var(--theme-surface-elevated) / 0.3)",
                }}
              >
                <p style={{ fontSize: 10, color: "hsl(var(--theme-ink-tertiary))" }}>
                  Click any text in the preview to edit it directly
                </p>
              </div>
            )}

            {/* Frame Components — live props added via Props tab */}
            {frameInstanceProps.length > 0 && (
              <div
                className="shrink-0 border-t overflow-y-auto keeper-panel-scroll"
                style={{
                  borderColor: "hsl(var(--theme-border-soft))",
                  maxHeight: 180,
                }}
              >
                <div className="px-4 py-3">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  >
                    Frame Components ({frameInstanceProps.length})
                  </p>
                  <div className="space-y-1.5">
                    {frameInstanceProps.map((prop) => {
                      const displayName = (prop.config.name as string | undefined) || prop.type
                      return (
                        <div
                          key={prop.id}
                          className="flex items-center gap-2 rounded-md px-2.5 py-1.5 border"
                          style={{
                            background: "hsl(var(--theme-surface-elevated) / 0.4)",
                            borderColor: "hsl(var(--theme-border-soft))",
                          }}
                        >
                          <div
                            className="shrink-0 rounded-sm"
                            style={{
                              width: 6,
                              height: 6,
                              background: "hsl(var(--theme-accent-primary))",
                              opacity: 0.7,
                            }}
                          />
                          <span
                            className="flex-1 text-[12px] font-medium truncate"
                            style={{ color: "hsl(var(--theme-ink-primary))" }}
                          >
                            {displayName}
                          </span>
                          <span
                            className="shrink-0 font-mono text-[10px]"
                            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                          >
                            {prop.type}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "config" && (
          <ConfigTabContent frameBlock={jsonBlockValue} />
        )}

      {activeTab === "props" && (
        <PropsTabContent
          frameInstanceProps={frameInstanceProps}
          onAddProp={onAddProp}
        />
      )}

      {activeTab === "brief" && (
        <BriefTabContent liveDomainFrame={liveDomainFrame} />
      )}

      {activeTab === "code" && (
        <CodeTabContent domainFrame={previewDomainFrame} />
      )}

      {activeTab === "json" && (
          jsonBlockValue ? (
            <JsonTabContent value={jsonBlockValue} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  background: "hsl(var(--theme-surface-elevated) / 0.5)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 5v3M8 10.5v.5" stroke="hsl(var(--theme-ink-tertiary))" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="8" r="6.25" stroke="hsl(var(--theme-ink-tertiary))" strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                  No JSON block for this frame
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  This frame renders live data — its content is not governed by frame JSON.
                </p>
              </div>
            </div>
          )
        )}
      </div>
      </div>

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
