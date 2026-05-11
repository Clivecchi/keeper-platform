"use client"

/**
 * KeeperPresence
 * ==============
 * Schema-driven Chronicle surface for all object types.
 *
 * Rendering rules:
 *   - Resolves the active schema via usePresenceSchema (3-level: object > domain > default)
 *   - For each field: renders if always===true OR minDensity is satisfied by props.density
 *   - editable fields → AutoResizeTextarea with 1000ms debounce → PATCH to object endpoint
 *   - read-only fields → styled static text
 *   - Role styling: primary (large/bold), secondary (body), ambient (small/muted), quiet (smallest)
 *   - Never empty: if no fields pass density check, primary field renders unconditionally
 *   - Fetches the record itself when objectId is provided (for full label resolution)
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import { usePresenceSchema } from "./usePresenceSchema"
import {
  fieldPassesDensity,
  resolveFieldLabel,
  type DensityLevel,
  type FieldDefinition,
  type ObjectPresenceSchema,
} from "./KeeperPresenceDefaults"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KeeperPresenceProps {
  /** The raw record data (pre-fetched by caller, or fetched internally by objectId). */
  object?: Record<string, unknown>
  /** Object type key — used for schema resolution and API routing. */
  objectType: string
  /** Object id — used for PATCH saves and label resolution. */
  objectId: string
  /** Domain context for schema resolution. */
  domainId: string
  /** Rendering context (currently informational, Chronicle is default). */
  context?: "chronicle" | "feed" | "journey" | "frame" | "search"
  /** Field density — controls which fields are rendered. Default: standard */
  density?: DensityLevel
  /** Called when an editable field saves successfully. */
  onSaved?: (field: string, value: unknown) => void
  /** Called once the record's primary label is resolved. */
  onLabelResolved?: (label: string) => void
}

// ── PATCH endpoint map ────────────────────────────────────────────────────────

function patchEndpoint(objectType: string, objectId: string): string {
  switch (objectType) {
    case "journey": return `/api/journeys/${encodeURIComponent(objectId)}`
    case "moment":  return `/api/moments/${encodeURIComponent(objectId)}`
    case "keeper":  return `/api/keepers/${encodeURIComponent(objectId)}`
    case "agent":   return `/api/agents/${encodeURIComponent(objectId)}`
    case "draft":   return `/api/v0/drafts/${encodeURIComponent(objectId)}`
    case "dialog":  return `/api/v0/dialogs/${encodeURIComponent(objectId)}`
    default:        return ""
  }
}

// ── Fetch endpoint map ────────────────────────────────────────────────────────

function fetchEndpoint(objectType: string, objectId: string, domainId: string): string {
  switch (objectType) {
    case "journey": return `/api/journeys/${encodeURIComponent(objectId)}`
    case "moment":  return `/api/moments/${encodeURIComponent(objectId)}`
    case "keeper":  return `/api/keepers/${encodeURIComponent(objectId)}?domainId=${encodeURIComponent(domainId)}`
    case "agent":   return `/api/agents/${encodeURIComponent(objectId)}`
    case "draft":   return `/api/v0/drafts?domainId=${encodeURIComponent(domainId)}`
    case "dialog":  return `/api/v0/dialogs/${encodeURIComponent(objectId)}`
    default:        return ""
  }
}

/** Extract record from various API response shapes */
function extractRecord(objectType: string, objectId: string, res: unknown): Record<string, unknown> | null {
  const r = res as Record<string, unknown>
  if (objectType === "draft") {
    const list = (r?.data as unknown[]) ?? (r?.drafts as unknown[]) ?? []
    if (Array.isArray(list)) {
      return (list.find((d: unknown) => (d as Record<string, unknown>)?.id === objectId) as Record<string, unknown>) ?? null
    }
    return null
  }
  return (
    (r?.[objectType] as Record<string, unknown>) ??
    (r?.data as Record<string, unknown>) ??
    (r as Record<string, unknown>)
  ) ?? null
}

// ── Primary label field per object type ──────────────────────────────────────

function primaryField(objectType: string): string {
  switch (objectType) {
    case "journey": return "name"
    case "moment":  return "title"
    case "keeper":  return "title"
    case "agent":   return "name"
    case "draft":   return "title"
    case "dialog":  return "title"
    default:        return "name"
  }
}

// ── Debounce ──────────────────────────────────────────────────────────────────

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Presence primitives ───────────────────────────────────────────────────────

function PresenceLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: "hsl(var(--theme-ink-tertiary) / 0.65)" }}
    >
      {children}
    </p>
  )
}

function PresenceShimmer({ width = "w-28" }: { width?: string }) {
  return (
    <div
      className={`h-2.5 ${width} rounded animate-pulse mb-2`}
      style={{ background: "hsl(var(--theme-surface-elevated) / 0.45)" }}
    />
  )
}

// ── AutoResizeTextarea ────────────────────────────────────────────────────────

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  style,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none ${className ?? ""}`}
      style={{ border: "none", padding: 0, ...style }}
    />
  )
}

// ── Role styles ───────────────────────────────────────────────────────────────

function roleStyle(role: FieldDefinition["role"]): React.CSSProperties {
  switch (role) {
    case "primary":
      return { color: "hsl(var(--theme-ink-primary))", fontSize: 14, fontWeight: 600, lineHeight: "1.35" }
    case "secondary":
      return { color: "hsl(var(--theme-ink-secondary))", fontSize: 12, lineHeight: "1.55" }
    case "ambient":
      return { color: "hsl(var(--theme-ink-tertiary))", fontSize: 11, lineHeight: "1.4" }
    case "quiet":
      return { color: "hsl(var(--theme-ink-tertiary) / 0.6)", fontSize: 10, lineHeight: "1.3" }
  }
}

function roleClass(role: FieldDefinition["role"]): string {
  switch (role) {
    case "primary":   return "font-semibold"
    case "secondary": return ""
    case "ambient":   return "font-medium"
    case "quiet":     return "tabular-nums"
  }
}

// ── Field renderer ────────────────────────────────────────────────────────────

interface FieldRowProps {
  fieldKey: string
  def: FieldDefinition
  value: string
  onChange: (v: string) => void
  isFirst: boolean
}

function FieldRow({ fieldKey, def, value, onChange, isFirst }: FieldRowProps) {
  const label = resolveFieldLabel(fieldKey, def)
  const style = roleStyle(def.role)
  const cls = roleClass(def.role)
  const hairline = "hsl(var(--theme-border-soft) / 0.15)"

  return (
    <div
      className="mb-3"
      style={!isFirst && def.role !== "primary" ? { borderTop: `1px solid ${hairline}`, paddingTop: 10 } : undefined}
    >
      {def.role !== "primary" && (
        <PresenceLabel>{label}</PresenceLabel>
      )}
      {def.editable ? (
        <AutoResizeTextarea
          value={value}
          onChange={onChange}
          placeholder={`${label}…`}
          className={`mt-0.5 ${cls}`}
          style={style}
        />
      ) : (
        <p className={`mt-0.5 ${cls}`} style={style}>
          {value || <span style={{ opacity: 0.35 }}>—</span>}
        </p>
      )}
    </div>
  )
}

// ── Field value helpers ───────────────────────────────────────────────────────

function formatFieldValue(fieldKey: string, raw: unknown): string {
  if (raw === null || raw === undefined) return ""
  if (typeof raw === "string") {
    if (fieldKey.endsWith("At") || fieldKey.endsWith("_at")) {
      const d = new Date(raw)
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      }
    }
    return raw
  }
  if (Array.isArray(raw)) return raw.join(", ")
  if (typeof raw === "object") {
    try { return JSON.stringify(raw) } catch { return "" }
  }
  return String(raw)
}

// ── KeeperPresence component ──────────────────────────────────────────────────

export function KeeperPresence({
  object: objectProp,
  objectType,
  objectId,
  domainId,
  density = "standard",
  onSaved,
  onLabelResolved,
}: KeeperPresenceProps) {
  const [record, setRecord] = React.useState<Record<string, unknown> | null>(objectProp ?? null)
  const [loading, setLoading] = React.useState(!objectProp)

  // Fetch record if not provided
  React.useEffect(() => {
    if (objectProp) {
      setRecord(objectProp)
      setLoading(false)
      return
    }
    if (!objectId || !objectType) return
    let cancelled = false
    setLoading(true)
    const url = fetchEndpoint(objectType, objectId, domainId)
    if (!url) { setLoading(false); return }

    apiFetch(url)
      .then((res) => {
        if (cancelled) return
        const extracted = extractRecord(objectType, objectId, res)
        setRecord(extracted)
        setLoading(false)
        if (extracted && onLabelResolved) {
          const pf = primaryField(objectType)
          const label = typeof extracted[pf] === "string" ? (extracted[pf] as string).trim() : ""
          if (label) onLabelResolved(label)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, objectType, domainId])

  // Resolve schema — use object-level presenceSchema if present on the record
  const objectSchemaOverride =
    record?.presenceSchema && typeof record.presenceSchema === "object"
      ? (record.presenceSchema as Record<string, unknown>)
      : null

  const { schema } = usePresenceSchema(objectType, domainId, objectSchemaOverride)

  // ── Editable field state ────────────────────────────────────────────────────
  // Managed as a single map of fieldKey → string value.
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({})
  const hasEdited = React.useRef(false)
  const [debouncedValues, setDebouncedValues] = React.useState<Record<string, string>>({})

  // Populate field values when record loads
  React.useEffect(() => {
    if (!record) return
    const next: Record<string, string> = {}
    for (const key of Object.keys(schema.fields)) {
      next[key] = formatFieldValue(key, record[key])
    }
    setFieldValues(next)
    hasEdited.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, schema])

  // Debounce all field values together (1000ms)
  const debouncedAll = useDebounced(fieldValues, 1000)
  React.useEffect(() => {
    setDebouncedValues(debouncedAll)
  }, [debouncedAll])

  // Save debounced editable fields
  React.useEffect(() => {
    if (!hasEdited.current || !record || !objectId) return
    const endpoint = patchEndpoint(objectType, objectId)
    if (!endpoint) return

    const editableKeys = Object.entries(schema.fields)
      .filter(([, def]) => def.editable)
      .map(([key]) => key)

    const patch: Record<string, string> = {}
    for (const key of editableKeys) {
      if (debouncedValues[key] !== undefined) {
        patch[key] = debouncedValues[key]
      }
    }
    if (Object.keys(patch).length === 0) return

    apiFetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then(() => {
        if (onSaved) {
          for (const [k, v] of Object.entries(patch)) onSaved(k, v)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValues])

  // ── Determine which fields to render ───────────────────────────────────────
  const visibleFields = React.useMemo(() => {
    const entries = Object.entries(schema.fields).filter(([, def]) =>
      fieldPassesDensity(def, density),
    )
    if (entries.length === 0) {
      const pf = primaryField(objectType)
      const def = schema.fields[pf]
      return def ? [[pf, def] as [string, FieldDefinition]] : []
    }
    return entries as [string, FieldDefinition][]
  }, [schema, density, objectType])

  // ── Render ─────────────────────────────────────────────────────────────────

  const hairline = "hsl(var(--theme-border-soft) / 0.15)"

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
          <PresenceLabel>{objectType}</PresenceLabel>
          <PresenceShimmer width="w-36" />
        </div>
        <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
          <PresenceShimmer width="w-full" />
          <PresenceShimmer width="w-3/4" />
          <PresenceShimmer width="w-1/2" />
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
          <PresenceLabel>{objectType}</PresenceLabel>
        </div>
        <div className="px-4 pt-3">
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            {objectType.charAt(0).toUpperCase() + objectType.slice(1)} not found.
          </p>
        </div>
      </div>
    )
  }

  // Separate primary field for the header
  const primaryKey = primaryField(objectType)
  const primaryEntry = visibleFields.find(([k]) => k === primaryKey)
  const bodyFields = visibleFields.filter(([k]) => k !== primaryKey)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header — primary field */}
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
        <PresenceLabel>{objectType}</PresenceLabel>
        {primaryEntry ? (
          <FieldRow
            fieldKey={primaryEntry[0]}
            def={primaryEntry[1]}
            value={fieldValues[primaryEntry[0]] ?? ""}
            onChange={(v) => {
              hasEdited.current = true
              setFieldValues((prev) => ({ ...prev, [primaryEntry[0]]: v }))
            }}
            isFirst
          />
        ) : (
          <p className="text-[14px] font-semibold mt-1" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {formatFieldValue(primaryKey, record[primaryKey]) || `Untitled ${objectType}`}
          </p>
        )}
      </div>

      {/* Body — remaining fields */}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {bodyFields.map(([key, def], i) => (
          <FieldRow
            key={key}
            fieldKey={key}
            def={def}
            value={fieldValues[key] ?? ""}
            onChange={(v) => {
              hasEdited.current = true
              setFieldValues((prev) => ({ ...prev, [key]: v }))
            }}
            isFirst={i === 0}
          />
        ))}
      </div>
    </div>
  )
}
