"use client"

/**
 * KeeperPresence
 * ==============
 * Schema-driven Chronicle surface for all object types.
 *
 * One component renders any Keeper object — Moment, Journey, Keeper, Draft,
 * Dialog, Agent — in any context. Field hierarchy is intrinsic to the object;
 * Treatment (density) is the volume knob.
 *
 * Chronicle views are thin wrappers that call this and get out of the way.
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import { usePresenceSchema } from "./usePresenceSchema"
import {
  fetchPresenceRecord,
  enrichPresenceRecord,
  type PresenceBreadcrumb,
  type RelatedSection,
} from "./presenceEnrichment"
import {
  fieldPassesDensity,
  resolveFieldLabel,
  type DensityLevel,
  type FieldDefinition,
} from "./KeeperPresenceDefaults"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KeeperPresenceProps {
  object?: Record<string, unknown>
  objectType: string
  objectId: string
  domainId: string
  domainSlug?: string
  context?: "chronicle" | "feed" | "journey" | "frame" | "search"
  density?: DensityLevel
  onSaved?: (field: string, value: unknown) => void
  onLabelResolved?: (label: string) => void
  onJourneySelect?: (id: string) => void
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

function patchEndpoint(
  objectType: string,
  objectId: string,
  domainId: string,
): string {
  switch (objectType) {
    case "journey":
      return `/api/journeys/${encodeURIComponent(objectId)}`
    case "moment":
      return `/api/moments/${encodeURIComponent(objectId)}`
    case "keeper":
      return `/api/keepers/${encodeURIComponent(objectId)}`
    case "agent":
      return `/api/agents/${encodeURIComponent(objectId)}`
    case "draft":
      return `/api/domains/${encodeURIComponent(domainId)}/kip/drafts/${encodeURIComponent(objectId)}`
    case "dialog":
      return `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(objectId)}`
    default:
      return ""
  }
}

function primaryField(objectType: string): string {
  switch (objectType) {
    case "journey":
      return "name"
    case "moment":
      return "title"
    case "keeper":
      return "title"
    case "agent":
      return "name"
    case "draft":
      return "title"
    case "dialog":
      return "title"
    default:
      return "name"
  }
}

function objectTypeLabel(objectType: string): string {
  return objectType.charAt(0).toUpperCase() + objectType.slice(1)
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatRelative(iso: string | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatFieldValue(fieldKey: string, raw: unknown, role: FieldDefinition["role"]): string {
  if (raw === null || raw === undefined) return ""
  if (typeof raw === "string") {
    if (role === "quiet" || fieldKey.endsWith("At") || fieldKey.endsWith("_at")) {
      const d = new Date(raw)
      if (!Number.isNaN(d.getTime())) {
        return role === "quiet" ? formatRelative(raw) : d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      }
    }
    return raw
  }
  if (typeof raw === "number" && fieldKey === "sessionCount") {
    return `${raw} session${raw === 1 ? "" : "s"}`
  }
  if (Array.isArray(raw)) return raw.join(", ")
  if (typeof raw === "object") {
    try {
      return JSON.stringify(raw)
    } catch {
      return ""
    }
  }
  return String(raw)
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

function PresenceBreadcrumbBar({ breadcrumb }: { breadcrumb: PresenceBreadcrumb }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 min-w-0">
      <span
        className="text-[10px] font-medium truncate"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {breadcrumb.journey}
      </span>
      {breadcrumb.path && (
        <>
          <span
            className="text-[10px] shrink-0"
            style={{ color: "hsl(var(--theme-ink-tertiary) / 0.4)" }}
          >
            /
          </span>
          <span
            className="text-[10px] font-medium truncate"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {breadcrumb.path}
          </span>
        </>
      )}
    </div>
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
    <div className="mb-4">
      <p
        className="text-[9px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: "hsl(var(--theme-ink-tertiary) / 0.5)" }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function PresenceThread({
  label,
  sub,
  onClick,
}: {
  label: string
  sub?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left group flex items-start gap-2 py-1.5 transition-opacity hover:opacity-80"
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <span
        className="mt-[6px] w-1 h-1 rounded-full shrink-0 opacity-30 group-hover:opacity-60 transition-opacity"
        style={{ background: "hsl(var(--theme-ink-tertiary))" }}
      />
      <span className="flex-1 min-w-0">
        <span
          className="block text-[12px] leading-snug truncate"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {label}
        </span>
        {sub && (
          <span
            className="block text-[10px] leading-snug mt-0.5"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {sub}
          </span>
        )}
      </span>
    </button>
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

function roleStyle(role: FieldDefinition["role"]): React.CSSProperties {
  switch (role) {
    case "primary":
      return {
        color: "hsl(var(--theme-ink-primary))",
        fontSize: 15,
        fontWeight: 600,
        lineHeight: "1.35",
      }
    case "secondary":
      return { color: "hsl(var(--theme-ink-secondary))", fontSize: 12, lineHeight: "1.55" }
    case "ambient":
      return { color: "hsl(var(--theme-ink-tertiary))", fontSize: 11, lineHeight: "1.4" }
    case "quiet":
      return {
        color: "hsl(var(--theme-ink-tertiary) / 0.55)",
        fontSize: 10,
        lineHeight: "1.3",
      }
  }
}

function roleClass(role: FieldDefinition["role"]): string {
  switch (role) {
    case "primary":
      return "font-semibold"
    case "secondary":
      return ""
    case "ambient":
      return "font-medium"
    case "quiet":
      return "tabular-nums"
  }
}

interface FieldRowProps {
  fieldKey: string
  def: FieldDefinition
  value: string
  onChange: (v: string) => void
  isFirst: boolean
  inHeader?: boolean
}

function FieldRow({ fieldKey, def, value, onChange, isFirst, inHeader }: FieldRowProps) {
  const label = resolveFieldLabel(fieldKey, def)
  const style = roleStyle(def.role)
  const cls = roleClass(def.role)
  const hairline = "hsl(var(--theme-border-soft) / 0.15)"

  return (
    <div
      className={inHeader ? "mt-1" : "mb-3"}
      style={
        !inHeader && !isFirst && def.role !== "primary"
          ? { borderTop: `1px solid ${hairline}`, paddingTop: 10 }
          : undefined
      }
    >
      {def.role !== "primary" && !inHeader && <PresenceLabel>{label}</PresenceLabel>}
      {def.editable ? (
        <AutoResizeTextarea
          value={value}
          onChange={onChange}
          placeholder={`${label}…`}
          className={`${inHeader ? "" : "mt-0.5"} ${cls}`}
          style={style}
        />
      ) : (
        <p className={`${inHeader ? "" : "mt-0.5"} ${cls}`} style={style}>
          {value || <span style={{ opacity: 0.35 }}>—</span>}
        </p>
      )}
    </div>
  )
}

function RelatedSections({
  sections,
  onJourneySelect,
}: {
  sections: RelatedSection[]
  onJourneySelect?: (id: string) => void
}) {
  if (sections.length === 0) return null
  return (
    <>
      {sections.map((section) => (
        <PresenceSection key={section.title} title={section.title}>
          {section.items.map((item) => (
            <PresenceThread
              key={item.id}
              label={item.label}
              sub={item.sub}
              onClick={
                item.navigateKind === "journey" && onJourneySelect
                  ? () => onJourneySelect(item.id)
                  : undefined
              }
            />
          ))}
        </PresenceSection>
      ))}
    </>
  )
}

// ── KeeperPresence component ──────────────────────────────────────────────────

export function KeeperPresence({
  object: objectProp,
  objectType,
  objectId,
  domainId,
  domainSlug,
  density = "standard",
  onSaved,
  onLabelResolved,
  onJourneySelect,
}: KeeperPresenceProps) {
  const [record, setRecord] = React.useState<Record<string, unknown> | null>(objectProp ?? null)
  const [loading, setLoading] = React.useState(!objectProp)
  const [breadcrumb, setBreadcrumb] = React.useState<PresenceBreadcrumb | undefined>()
  const [relatedSections, setRelatedSections] = React.useState<RelatedSection[]>([])
  const [hiddenFields, setHiddenFields] = React.useState<string[]>([])

  React.useEffect(() => {
    if (objectProp) {
      setRecord(objectProp)
      setLoading(false)
      return
    }
    if (!objectId || !objectType || !domainId) return

    let cancelled = false
    setLoading(true)
    setBreadcrumb(undefined)
    setRelatedSections([])
    setHiddenFields([])

    fetchPresenceRecord(objectType, objectId, domainId, domainSlug)
      .then(async (extracted) => {
        if (cancelled) return
        if (!extracted) {
          setRecord(null)
          setLoading(false)
          return
        }

        const enriched = await enrichPresenceRecord(
          objectType,
          objectId,
          domainId,
          extracted,
          domainSlug,
        )
        if (cancelled) return

        setRecord(enriched.record)
        setBreadcrumb(enriched.breadcrumb)
        setRelatedSections(enriched.relatedSections)
        setHiddenFields(enriched.hiddenFields)
        setLoading(false)

        if (onLabelResolved) {
          const pf = primaryField(objectType)
          const label =
            typeof enriched.record[pf] === "string"
              ? (enriched.record[pf] as string).trim()
              : ""
          if (label) onLabelResolved(label)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecord(null)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, objectType, domainId, domainSlug])

  const objectSchemaOverride =
    record?.presenceSchema && typeof record.presenceSchema === "object"
      ? (record.presenceSchema as Record<string, unknown>)
      : null

  const { schema } = usePresenceSchema(objectType, domainId, objectSchemaOverride)

  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({})
  const hasEdited = React.useRef(false)
  const debouncedValues = useDebounced(fieldValues, 1000)

  React.useEffect(() => {
    if (!record) return
    const next: Record<string, string> = {}
    for (const key of Object.keys(schema.fields)) {
      next[key] = formatFieldValue(key, record[key], schema.fields[key]?.role ?? "secondary")
    }
    setFieldValues(next)
    hasEdited.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, schema])

  React.useEffect(() => {
    if (!hasEdited.current || !record || !objectId || !domainId) return
    const endpoint = patchEndpoint(objectType, objectId, domainId)
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

  const visibleFields = React.useMemo(() => {
    const hidden = new Set(hiddenFields)
    const entries = Object.entries(schema.fields).filter(
      ([key, def]) => !hidden.has(key) && fieldPassesDensity(def, density),
    )
    if (entries.length === 0) {
      const pf = primaryField(objectType)
      const def = schema.fields[pf]
      return def ? [[pf, def] as [string, FieldDefinition]] : []
    }
    return entries as [string, FieldDefinition][]
  }, [schema, density, objectType, hiddenFields])

  const hairline = "hsl(var(--theme-border-soft) / 0.15)"
  const typeLabel = objectTypeLabel(objectType)

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
          <PresenceLabel>{typeLabel}</PresenceLabel>
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
          <PresenceLabel>{typeLabel}</PresenceLabel>
        </div>
        <div className="px-4 pt-3">
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            {typeLabel} not found.
          </p>
        </div>
      </div>
    )
  }

  const primaryKey = primaryField(objectType)
  const primaryEntry = visibleFields.find(([k]) => k === primaryKey)
  const bodyFields = visibleFields.filter(([k]) => k !== primaryKey)
  const quietFields = bodyFields.filter(([, def]) => def.role === "quiet")
  const contentFields = bodyFields.filter(([, def]) => def.role !== "quiet")

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
        {breadcrumb && <PresenceBreadcrumbBar breadcrumb={breadcrumb} />}
        <PresenceLabel>{typeLabel}</PresenceLabel>
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
            inHeader
          />
        ) : (
          <p
            className="text-[15px] font-semibold leading-snug mt-1"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {formatFieldValue(primaryKey, record[primaryKey], "primary") ||
              `Untitled ${objectType}`}
          </p>
        )}
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {contentFields.map(([key, def], i) => (
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

        <RelatedSections sections={relatedSections} onJourneySelect={onJourneySelect} />

        {quietFields.map(([key, def]) => (
          <FieldRow
            key={key}
            fieldKey={key}
            def={def}
            value={fieldValues[key] ?? ""}
            onChange={() => {}}
            isFirst={false}
          />
        ))}
      </div>
    </div>
  )
}
