"use client"

/**
 * KeeperPresence
 * ==============
 * Universal Chronicle rendering surface.
 *
 * Schema-driven field selection; storybook presentation.
 * Every object in focus is part of a story already in progress —
 * not a database row, not a labeled form.
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import { usePresenceSchema } from "./usePresenceSchema"
import {
  fetchPresenceRecord,
  enrichPresenceRecord,
  type PresenceBreadcrumb,
  type PresenceMeta,
  type RelatedSection,
} from "./presenceEnrichment"
import {
  fieldPassesDensity,
  type DensityLevel,
  type FieldDefinition,
} from "./KeeperPresenceDefaults"

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
  onMomentSelect?: (id: string) => void
}

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

function formatFieldValue(
  fieldKey: string,
  raw: unknown,
  role: FieldDefinition["role"],
): string {
  if (raw === null || raw === undefined) return ""
  if (typeof raw === "string") {
    if (role === "quiet" || fieldKey.endsWith("At") || fieldKey.endsWith("_at")) {
      const d = new Date(raw)
      if (!Number.isNaN(d.getTime())) {
        return role === "quiet"
          ? formatRelative(raw)
          : d.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
      }
    }
    return raw.trim()
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

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function PresenceWhisper({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: "hsl(var(--theme-ink-tertiary) / 0.55)" }}
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
    <div className="mb-5">
      <p
        className="text-[9px] font-semibold uppercase tracking-widest mb-2.5"
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
  preview,
  onClick,
}: {
  label: string
  sub?: string
  preview?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left group rounded-lg border px-3 py-2.5 mb-2 transition-all hover:opacity-90"
      style={{
        cursor: onClick ? "pointer" : "default",
        borderColor: "hsl(var(--theme-border-soft) / 0.25)",
        background: "hsl(var(--theme-surface-elevated) / 0.18)",
      }}
    >
      <span
        className="block text-[12px] font-medium leading-snug"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        {label}
      </span>
      {preview && (
        <span
          className="block text-[11px] leading-relaxed mt-1 line-clamp-2"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {preview}
        </span>
      )}
      {sub && (
        <span
          className="block text-[10px] leading-snug mt-1"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {sub}
        </span>
      )}
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

function RelatedSections({
  sections,
  onJourneySelect,
  onMomentSelect,
}: {
  sections: RelatedSection[]
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
}) {
  if (sections.length === 0) return null

  return (
    <>
      {sections.map((section) => (
        <PresenceSection key={section.title} title={section.title}>
          {section.items.length === 0 ? (
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Nothing here yet — but this journey is alive.
            </p>
          ) : (
            section.items.map((item) => (
              <PresenceThread
                key={item.id}
                label={item.label}
                sub={item.sub}
                preview={item.preview}
                onClick={
                  item.navigateKind === "journey" && onJourneySelect
                    ? () => onJourneySelect(item.id)
                    : item.navigateKind === "moment" && onMomentSelect
                      ? () => onMomentSelect(item.id)
                      : undefined
                }
              />
            ))
          )}
        </PresenceSection>
      ))}
    </>
  )
}

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
  onMomentSelect,
}: KeeperPresenceProps) {
  const [record, setRecord] = React.useState<Record<string, unknown> | null>(objectProp ?? null)
  const [loading, setLoading] = React.useState(!objectProp)
  const [breadcrumb, setBreadcrumb] = React.useState<PresenceBreadcrumb | undefined>()
  const [meta, setMeta] = React.useState<PresenceMeta | undefined>()
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
    setMeta(undefined)
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
        setMeta(enriched.meta)
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
    return Object.entries(schema.fields).filter(
      ([key, def]) => !hidden.has(key) && fieldPassesDensity(def, density),
    ) as [string, FieldDefinition][]
  }, [schema, density, hiddenFields])

  const hairline = "hsl(var(--theme-border-soft) / 0.15)"
  const typeLabel = objectTypeLabel(objectType)
  const primaryKey = primaryField(objectType)

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
          <PresenceWhisper>{typeLabel}</PresenceWhisper>
          <PresenceShimmer width="w-36" />
        </div>
        <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
          <PresenceShimmer width="w-full" />
          <PresenceShimmer width="w-3/4" />
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
          <PresenceWhisper>{typeLabel}</PresenceWhisper>
        </div>
        <div className="px-4 pt-3">
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            This {objectType} isn&apos;t here right now — but the story continues.
          </p>
        </div>
      </div>
    )
  }

  const primaryDef = schema.fields[primaryKey]
  const primaryValue = fieldValues[primaryKey] ?? ""
  const secondaryFields = visibleFields.filter(
    ([key, def]) => key !== primaryKey && def.role === "secondary" && fieldValues[key],
  )
  const ambientFields = visibleFields.filter(
    ([key, def]) =>
      key !== primaryKey &&
      def.role === "ambient" &&
      fieldValues[key] &&
      !hiddenFields.includes(key),
  )
  const quietFields = visibleFields.filter(
    ([key, def]) => key !== primaryKey && def.role === "quiet" && fieldValues[key],
  )

  const secondaryPlaceholders: Record<string, string> = {
    forward: "Where this journey is headed…",
    narrative: "What happened here…",
    purpose: "What this keeper holds…",
    summary: "What this draft carries…",
    context: "Where this dialog lives…",
    context_scope: "How this agent shows up…",
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Story header — type whisper, title, meta line */}
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
        {breadcrumb && <PresenceBreadcrumbBar breadcrumb={breadcrumb} />}
        <PresenceWhisper>{typeLabel}</PresenceWhisper>

        {primaryDef?.editable ? (
          <AutoResizeTextarea
            value={primaryValue}
            onChange={(v) => {
              hasEdited.current = true
              setFieldValues((prev) => ({ ...prev, [primaryKey]: v }))
            }}
            placeholder={`Untitled ${objectType}`}
            className="text-[15px] font-semibold leading-snug mt-1"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          />
        ) : (
          <h2
            className="text-[15px] font-semibold leading-snug mt-1"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {primaryValue || `Untitled ${objectType}`}
          </h2>
        )}

        {meta?.line && (
          <p
            className="text-[10px] mt-2 leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-tertiary) / 0.7)" }}
          >
            {meta.line}
          </p>
        )}
      </div>

      {/* Story body — prose, threads, never labeled form rows */}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {secondaryFields.map(([key, def]) => (
          <div key={key} className="mb-4">
            {def.editable ? (
              <AutoResizeTextarea
                value={fieldValues[key] ?? ""}
                onChange={(v) => {
                  hasEdited.current = true
                  setFieldValues((prev) => ({ ...prev, [key]: v }))
                }}
                placeholder={secondaryPlaceholders[key] ?? "…"}
                className="text-[12px] leading-relaxed"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              />
            ) : (
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                {fieldValues[key]}
              </p>
            )}
          </div>
        ))}

        {ambientFields.map(([key]) => (
          <p
            key={key}
            className="text-[11px] leading-relaxed mb-3"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {fieldValues[key]}
          </p>
        ))}

        <RelatedSections
          sections={relatedSections}
          onJourneySelect={onJourneySelect}
          onMomentSelect={onMomentSelect}
        />

        {quietFields.length > 0 && !meta?.line && (
          <p
            className="text-[10px] mt-2"
            style={{ color: "hsl(var(--theme-ink-tertiary) / 0.55)" }}
          >
            {quietFields.map(([key]) => fieldValues[key]).filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  )
}
