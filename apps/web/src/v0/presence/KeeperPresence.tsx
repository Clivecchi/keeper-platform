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
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
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
  resolveFieldLabel,
  type DensityLevel,
  type FieldDefinition,
} from "./KeeperPresenceDefaults"
import type { PresenceLayout } from "./types"
import { DraftPointsSection } from "./DraftPointsSection"
import { FrameConfigPresence, parseFramePropsFromRecord } from "./FrameConfigPresence"
import { BoardDefConfigPresence } from "./BoardDefConfigPresence"
import { BOARD_DEFINITIONS } from "../boards/UniversalBoardDefinition"
import {
  PresentMotionProvider,
  usePresentMotionValues,
} from "../presents/usePresentMotion"
import {
  contextMotionStyle,
  captionMotionStyle,
  primaryMotionStyle,
  secondaryMotionStyle,
} from "../presents/presentMotionStyles"
import {
  resolvePresentForObject,
  type PresentName,
  type RenderContext,
} from "../presents/types"
import { toPresentInstanceKey } from "../presents/presentInstanceKey"

export type { PresenceLayout } from "./types"

export interface KeeperPresenceProps {
  object?: Record<string, unknown>
  objectType: string
  objectId: string
  domainId: string
  domainSlug?: string
  /** Named form the object inhabits — Theatre.js sequence selection. */
  present?: PresentName
  /** Where the object is appearing — distinct from Present. */
  context?: RenderContext
  layout?: PresenceLayout
  density?: DensityLevel
  onSaved?: (field: string, value: unknown) => void
  onLabelResolved?: (label: string) => void
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
  onKeeperSelect?: (id: string) => void
  /** Display name for domain idle — used when objectType is "domain". */
  domainDisplayName?: string
}

function parsePatchFieldErrors(
  err: unknown,
  patchKeys: string[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  const data = (err as { data?: { error?: string; details?: Array<{ path?: (string | number)[]; message?: string }> } })
    ?.data
  const status = (err as { status?: number })?.status

  if (patchKeys.includes("lensSystemPrompt")) {
    const zodLensErr = data?.details?.find((d) =>
      d.path?.some(
        (segment) =>
          String(segment) === "lensSystemPrompt" || String(segment) === "systemPrompt",
      ),
    )
    if (zodLensErr || status === 400) {
      errors.lensSystemPrompt = "Lens prompt must be at least 10 characters."
    }
  }

  return errors
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
    case "frame":
      return "name"
    case "boardDef":
      return "title"
    case "domain":
      return "name"
    case "service":
      return "name"
    default:
      return "name"
  }
}

function objectTypeLabel(objectType: string): string {
  if (objectType === "boardDef") return "Board Definition"
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
      className="text-[12px] font-semibold uppercase tracking-widest"
      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
    >
      {children}
    </p>
  )
}

function PresenceBreadcrumbBar({ breadcrumb }: { breadcrumb: PresenceBreadcrumb }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 min-w-0">
      <span
        className="text-[12px] font-medium truncate"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {breadcrumb.journey}
      </span>
      {breadcrumb.path && (
        <>
          <span
            className="text-[12px] shrink-0"
            style={{ color: "hsl(var(--theme-ink-tertiary) / 0.65)" }}
          >
            /
          </span>
          <span
            className="text-[12px] font-medium truncate"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
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
        className="text-[11px] font-semibold uppercase tracking-widest mb-2.5"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
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
        borderColor: "hsl(var(--theme-border-soft) / 0.45)",
        background: "hsl(var(--theme-surface-elevated) / 0.35)",
      }}
    >
      <span
        className="block text-[14px] font-medium leading-snug"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        {label}
      </span>
      {preview && (
        <span
          className="block text-[13px] leading-relaxed mt-1 line-clamp-2"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {preview}
        </span>
      )}
      {sub && (
        <span
          className="block text-[12px] leading-snug mt-1"
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

function formatCreatedDate(iso: string | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function PathCard({
  label,
  preview,
  sub,
}: {
  label: string
  preview?: string
  sub?: string
}) {
  return (
    <div
      className="rounded-lg border px-3 py-2.5 mb-2"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.45)",
        background: "hsl(var(--theme-surface-elevated) / 0.28)",
      }}
    >
      <p
        className="text-[14px] font-medium leading-snug"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        {label}
      </p>
      {preview && (
        <p
          className="text-[13px] leading-relaxed mt-1"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {preview}
        </p>
      )}
      {sub && (
        <p
          className="text-[12px] mt-1"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function JourneyFocusSections({
  sections,
  onMomentSelect,
}: {
  sections: RelatedSection[]
  onMomentSelect?: (id: string) => void
}) {
  if (sections.length === 0) return null

  return (
    <>
      {sections.map((section) => (
        <PresenceSection key={section.title} title={section.title}>
          {section.title === "Paths" ? (
            section.items.length === 0 ? null : (
              section.items.map((item) => (
                <PathCard
                  key={item.id}
                  label={item.label}
                  preview={item.preview}
                  sub={item.sub}
                />
              ))
            )
          ) : section.items.length === 0 ? (
            <p
              className="text-[14px] leading-relaxed"
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
                  item.navigateKind === "moment" && onMomentSelect
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

function PresentAtmosphereLayer() {
  const motion = usePresentMotionValues()
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        opacity: motion.atmosphereOpacity * 0.28,
        background:
          "radial-gradient(ellipse at 28% 0%, hsl(var(--theme-accent) / 0.14), transparent 62%)",
      }}
    />
  )
}

function JourneyFocusPresence({
  objectId,
  fieldValues,
  setFieldValues,
  markEdited,
  meta,
  relatedSections,
  onMomentSelect,
  onKeeperSelect,
}: {
  objectId: string
  fieldValues: Record<string, string>
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  markEdited: () => void
  meta?: PresenceMeta
  relatedSections: RelatedSection[]
  onMomentSelect?: (id: string) => void
  onKeeperSelect?: (id: string) => void
}) {
  const boardCtx = useUniversalBoardOptional()
  const motion = usePresentMotionValues()
  const activeJourneyId = boardCtx?.selection.activeJourneyId ?? null
  const handleSetActive = boardCtx?.actions.onSetActiveJourney

  const title = fieldValues.name ?? ""
  const forward = fieldValues.forward ?? ""
  const hairline = "hsl(var(--theme-border-soft) / 0.35)"
  const momentCount = meta?.momentCount ?? 0

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <PresentAtmosphereLayer />
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div style={primaryMotionStyle(motion)}>
              <AutoResizeTextarea
                value={title}
                onChange={(v) => {
                  markEdited()
                  setFieldValues((prev) => ({ ...prev, name: v }))
                }}
                placeholder="Untitled journey"
                className="text-[20px] font-semibold leading-snug"
                style={{ color: "hsl(var(--theme-ink-primary))" }}
              />
              <AutoResizeTextarea
                value={forward}
                onChange={(v) => {
                  markEdited()
                  setFieldValues((prev) => ({ ...prev, forward: v }))
                }}
                placeholder="Where this journey is headed…"
                className="text-[14px] leading-relaxed mt-2"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              />
            </div>
          </div>
          {activeJourneyId !== objectId && handleSetActive && (
            <button
              type="button"
              onClick={() => handleSetActive(objectId)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.35)",
                color: "hsl(var(--theme-ink-primary))",
              }}
            >
              Set as Active
            </button>
          )}
        </div>

        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[12px]"
          style={{ ...contextMotionStyle(motion), color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {meta?.keeper && (
            meta.keeper.id ? (
              <button
                type="button"
                onClick={() => onKeeperSelect?.(meta.keeper!.id)}
                className="transition-opacity hover:opacity-80"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                {meta.keeper.title}
              </button>
            ) : (
              <span>{meta.keeper.title}</span>
            )
          )}
          {meta?.createdAt && (
            <span>Created {formatCreatedDate(meta.createdAt)}</span>
          )}
          <span>
            {momentCount} moment{momentCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div
        className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4"
        style={secondaryMotionStyle(motion)}
      >
        <JourneyFocusSections
          sections={relatedSections}
          onMomentSelect={onMomentSelect}
        />
      </div>
    </div>
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
              className="text-[14px] leading-relaxed"
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
  present,
  context = "chronicle",
  layout = "focus",
  density = "standard",
  onSaved,
  onLabelResolved,
  onJourneySelect,
  onMomentSelect,
  onKeeperSelect,
  domainDisplayName,
}: KeeperPresenceProps) {
  const effectivePresent = resolvePresentForObject(objectType, present)
  const motionInstanceKey = React.useMemo(
    () => toPresentInstanceKey(objectType, objectId, domainSlug),
    [objectType, objectId, domainSlug],
  )
  const motionEnabled = layout === "focus"
  const [record, setRecord] = React.useState<Record<string, unknown> | null>(objectProp ?? null)
  const [loading, setLoading] = React.useState(!objectProp)
  const [breadcrumb, setBreadcrumb] = React.useState<PresenceBreadcrumb | undefined>()
  const [meta, setMeta] = React.useState<PresenceMeta | undefined>()
  const [relatedSections, setRelatedSections] = React.useState<RelatedSection[]>([])
  const [hiddenFields, setHiddenFields] = React.useState<string[]>([])

  const boardCtx = useUniversalBoardOptional()
  const [presenceRefresh, setPresenceRefresh] = React.useState(0)

  React.useEffect(() => {
    if (!objectId || !objectType || !domainId) return

    let cancelled = false
    setLoading(true)
    setBreadcrumb(undefined)
    setMeta(undefined)
    setRelatedSections([])
    setHiddenFields([])

    const enrichmentCtx = {
      domainName: domainDisplayName,
      domainSlug,
      domainId,
      activeBoardForFrames: "domain",
    }

    async function load() {
      const extracted =
        objectProp ?? (await fetchPresenceRecord(objectType, objectId, domainId, domainSlug))
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
        enrichmentCtx,
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
    }

    load().catch(() => {
      if (!cancelled) {
        setRecord(null)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, objectType, domainId, domainSlug, domainDisplayName, objectProp, presenceRefresh, boardCtx?.selection.draftPresenceRevision])

  const handlePresenceRefresh = React.useCallback(() => {
    setPresenceRefresh((n) => n + 1)
  }, [])

  const objectSchemaOverride =
    record?.presenceSchema && typeof record.presenceSchema === "object"
      ? (record.presenceSchema as Record<string, unknown>)
      : null

  const { schema } = usePresenceSchema(objectType, domainId, objectSchemaOverride)

  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const hasEdited = React.useRef(false)
  const debouncedValues = useDebounced(fieldValues, 1000)

  React.useEffect(() => {
    if (!record) return
    const next: Record<string, string> = {}
    for (const key of Object.keys(schema.fields)) {
      next[key] = formatFieldValue(key, record[key], schema.fields[key]?.role ?? "secondary")
    }
    setFieldValues(next)
    setFieldErrors({})
    hasEdited.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, schema])

  React.useEffect(() => {
    if (!hasEdited.current || !record || !objectId || !domainId) return
    const endpoint = patchEndpoint(objectType, objectId, domainId)

    const editableKeys = Object.entries(schema.fields)
      .filter(([, def]) => def.editable)
      .map(([key]) => key)

    const patch: Record<string, string> = {}
    for (const key of editableKeys) {
      if (key === "lensSystemPrompt") continue
      if (debouncedValues[key] !== undefined) {
        patch[key] = debouncedValues[key]
      }
    }

    const lensId = typeof record.lensId === "string" ? record.lensId : ""
    const lensPrompt = debouncedValues.lensSystemPrompt
    const shouldSaveLens =
      Boolean(lensId) &&
      editableKeys.includes("lensSystemPrompt") &&
      lensPrompt !== undefined

    if (Object.keys(patch).length === 0 && !shouldSaveLens) return
    if (Object.keys(patch).length > 0 && !endpoint) return

    const requestBody =
      objectType === "agent" && domainId
        ? { ...patch, domainId }
        : patch

    void (async () => {
      try {
        if (shouldSaveLens) {
          await apiFetch(`/api/kip/lenses/${encodeURIComponent(lensId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ systemPrompt: lensPrompt }),
          })
          setFieldErrors((prev) => {
            const next = { ...prev }
            delete next.lensSystemPrompt
            return next
          })
        }

        if (Object.keys(patch).length > 0 && endpoint) {
          await apiFetch(endpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          })
          setFieldErrors((prev) => {
            const next = { ...prev }
            for (const key of Object.keys(patch)) {
              delete next[key]
            }
            return next
          })
          if (onSaved) {
            for (const [k, v] of Object.entries(patch)) onSaved(k, v)
          }
        }

        if (objectType === "agent" && (shouldSaveLens || Object.keys(patch).length > 0)) {
          handlePresenceRefresh()
        }
      } catch (err: unknown) {
        const patchKeys = [
          ...(shouldSaveLens ? ["lensSystemPrompt"] : []),
          ...Object.keys(patch),
        ]
        const patchErrors = parsePatchFieldErrors(err, patchKeys)
        if (Object.keys(patchErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...patchErrors }))
        }
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValues])

  const effectiveDensity: DensityLevel = layout === "config" ? "comfortable" : density
  const handleKeeperSelect =
    onKeeperSelect ?? boardCtx?.actions.onKeeperSelect

  const visibleFields = React.useMemo(() => {
    const hidden = new Set(hiddenFields)
    return Object.entries(schema.fields).filter(
      ([key, def]) => !hidden.has(key) && fieldPassesDensity(def, effectiveDensity),
    ) as [string, FieldDefinition][]
  }, [schema, effectiveDensity, hiddenFields])

  const hairline = "hsl(var(--theme-border-soft) / 0.35)"
  const typeLabel = objectTypeLabel(objectType)
  const primaryKey = primaryField(objectType)

  return (
    <PresentMotionProvider
      present={effectivePresent}
      instanceKey={motionInstanceKey}
      enabled={motionEnabled && !loading && !!record}
    >
      <div className="flex flex-col h-full min-h-0" data-render-context={context}>
        <KeeperPresenceSurface
        loading={loading}
        record={record}
        objectType={objectType}
        objectId={objectId}
        domainId={domainId}
        domainSlug={domainSlug}
        layout={layout}
        effectiveDensity={effectiveDensity}
        hairline={hairline}
        typeLabel={typeLabel}
        primaryKey={primaryKey}
        fieldValues={fieldValues}
        setFieldValues={setFieldValues}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        markEdited={() => {
          hasEdited.current = true
        }}
        schema={schema}
        meta={meta}
        breadcrumb={breadcrumb}
        relatedSections={relatedSections}
        hiddenFields={hiddenFields}
        visibleFields={visibleFields}
        handleKeeperSelect={handleKeeperSelect}
        handlePresenceRefresh={handlePresenceRefresh}
        onLabelResolved={onLabelResolved}
        onJourneySelect={onJourneySelect}
        onMomentSelect={onMomentSelect}
      />
      </div>
    </PresentMotionProvider>
  )
}

function KeeperPresenceSurface({
  loading,
  record,
  objectType,
  objectId,
  domainId,
  domainSlug,
  layout,
  effectiveDensity,
  hairline,
  typeLabel,
  primaryKey,
  fieldValues,
  setFieldValues,
  fieldErrors,
  setFieldErrors,
  markEdited,
  schema,
  meta,
  breadcrumb,
  relatedSections,
  hiddenFields,
  visibleFields,
  handleKeeperSelect,
  handlePresenceRefresh,
  onLabelResolved,
  onJourneySelect,
  onMomentSelect,
}: {
  loading: boolean
  record: Record<string, unknown> | null
  objectType: string
  objectId: string
  domainId: string
  domainSlug?: string
  layout: PresenceLayout
  effectiveDensity: DensityLevel
  hairline: string
  typeLabel: string
  primaryKey: string
  fieldValues: Record<string, string>
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  fieldErrors: Record<string, string>
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  markEdited: () => void
  schema: ReturnType<typeof usePresenceSchema>["schema"]
  meta?: PresenceMeta
  breadcrumb?: PresenceBreadcrumb
  relatedSections: RelatedSection[]
  hiddenFields: string[]
  visibleFields: [string, FieldDefinition][]
  handleKeeperSelect?: (id: string) => void
  handlePresenceRefresh: () => void
  onLabelResolved?: (label: string) => void
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
}) {
  const motion = usePresentMotionValues()

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
          <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            This {objectType} isn&apos;t here right now — but the story continues.
          </p>
        </div>
      </div>
    )
  }

  if (objectType === "journey" && layout === "focus") {
    return (
      <JourneyFocusPresence
        objectId={objectId}
        fieldValues={fieldValues}
        setFieldValues={setFieldValues}
        markEdited={markEdited}
        meta={meta}
        relatedSections={relatedSections}
        onMomentSelect={onMomentSelect}
        onKeeperSelect={handleKeeperSelect}
      />
    )
  }

  if (objectType === "frame" && layout === "config" && record) {
    return (
      <FrameConfigPresence
        frameKey={objectId}
        frameName={String(record.name ?? objectId)}
        domainId={domainId}
        domainSlug={domainSlug}
        frameInstanceId={
          typeof record.frameInstanceId === "string" ? record.frameInstanceId : null
        }
        pattern={typeof record.pattern === "string" ? record.pattern : undefined}
        visibility={typeof record.visibility === "string" ? record.visibility : undefined}
        description={
          typeof record.description === "string" ? record.description : undefined
        }
        props={parseFramePropsFromRecord(record)}
        frameJson={typeof record.frameJson === "string" ? record.frameJson : undefined}
        domainSnapshot={
          record.domainSnapshot && typeof record.domainSnapshot === "object"
            ? (record.domainSnapshot as Record<string, unknown>)
            : undefined
        }
        onPropsSaved={handlePresenceRefresh}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  if (objectType === "boardDef" && layout === "config") {
    const boardDefId =
      typeof record?.boardDefId === "string"
        ? record.boardDefId
        : typeof record?.boardId === "string"
          ? record.boardId
          : objectId
    const def = BOARD_DEFINITIONS[boardDefId]
    if (def) {
      return (
        <BoardDefConfigPresence
          def={def}
          onLabelResolved={onLabelResolved}
        />
      )
    }
  }

  const surfaceStyle =
    layout === "config"
      ? { background: "hsl(var(--theme-surface-elevated) / 0.06)" }
      : undefined

  const primaryDef = schema.fields[primaryKey]
  const primaryValue = fieldValues[primaryKey] ?? ""
  const secondaryFields = visibleFields.filter(([key, def]) => {
    if (key === primaryKey || def.role !== "secondary") return false
    if (key === "lensSystemPrompt") {
      return Boolean(record?.lensId) || Boolean(fieldValues[key]?.trim())
    }
    return Boolean(fieldValues[key])
  })
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
    tagline: "Short identity line for this agent…",
    lensSystemPrompt: "Domain lens — shapes Kip's voice and behavior…",
  }

  return (
    <div className="relative flex flex-col h-full min-h-0" style={surfaceStyle}>
      <PresentAtmosphereLayer />
      {/* Story header — type whisper, title, meta line */}
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
        {layout === "config" && (
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Configuring
          </p>
        )}
        {breadcrumb && (
          <div style={contextMotionStyle(motion)}>
            <PresenceBreadcrumbBar breadcrumb={breadcrumb} />
          </div>
        )}
        <div
          style={{
            ...captionMotionStyle(motion),
            ...contextMotionStyle(motion),
          }}
        >
          <PresenceWhisper>{typeLabel}</PresenceWhisper>
        </div>

        <div style={primaryMotionStyle(motion)}>
          {primaryDef?.editable ? (
            <AutoResizeTextarea
              value={primaryValue}
              onChange={(v) => {
                markEdited()
                setFieldValues((prev) => ({ ...prev, [primaryKey]: v }))
              }}
              placeholder={`Untitled ${objectType}`}
              className="text-[19px] font-semibold leading-snug mt-1"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            />
          ) : (
            <h2
              className="text-[19px] font-semibold leading-snug mt-1"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {primaryValue || `Untitled ${objectType}`}
            </h2>
          )}
        </div>

        {meta?.line && (
          <p
            className="text-[13px] mt-2 leading-relaxed"
            style={{ ...contextMotionStyle(motion), color: "hsl(var(--theme-ink-secondary))" }}
          >
            {meta.line}
          </p>
        )}
      </div>

      {/* Story body — prose, threads, never labeled form rows */}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {secondaryFields.map(([key, def]) => (
          <div key={key} className="mb-4" style={secondaryMotionStyle(motion)}>
            {def.label ? (
              <p className="keeper-presence-field-label mb-1.5">
                {resolveFieldLabel(key, def)}
              </p>
            ) : null}
            {def.editable ? (
              <>
                <AutoResizeTextarea
                  value={fieldValues[key] ?? ""}
                  onChange={(v) => {
                    markEdited()
                    setFieldValues((prev) => ({ ...prev, [key]: v }))
                    if (fieldErrors[key]) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next[key]
                        return next
                      })
                    }
                  }}
                  placeholder={secondaryPlaceholders[key] ?? "…"}
                  className={
                    key === "lensSystemPrompt"
                      ? "keeper-presence-field-value font-mono text-[15px]"
                      : "keeper-presence-field-value"
                  }
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                />
                {fieldErrors[key] ? (
                  <p
                    className="text-[13px] mt-1.5 leading-relaxed"
                    style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
                  >
                    {fieldErrors[key]}
                  </p>
                ) : null}
              </>
            ) : def.multiline ? (
              <pre
                className="keeper-presence-field-value whitespace-pre-wrap break-words font-mono max-h-96 overflow-y-auto"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                {fieldValues[key]}
              </pre>
            ) : (
              <p
                className="keeper-presence-field-value"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                {fieldValues[key]}
              </p>
            )}
          </div>
        ))}

        {objectType === "draft" && (
          <PresenceSection title="Points">
            <DraftPointsSection spec={record?.spec ?? record?.spec_json} />
          </PresenceSection>
        )}

        {ambientFields.map(([key]) => (
          <p
            key={key}
            className="text-[14px] leading-relaxed mb-3"
            style={{ ...contextMotionStyle(motion), color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {fieldValues[key]}
          </p>
        ))}

        <div style={secondaryMotionStyle(motion)}>
          <RelatedSections
            sections={relatedSections}
            onJourneySelect={onJourneySelect}
            onMomentSelect={onMomentSelect}
          />
        </div>

        {quietFields.length > 0 && !meta?.line && (
          <p
            className="text-[12px] mt-2"
            style={{ ...contextMotionStyle(motion), color: "hsl(var(--theme-ink-tertiary) / 0.55)" }}
          >
            {quietFields.map(([key]) => fieldValues[key]).filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  )
}
