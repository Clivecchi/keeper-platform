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
import { AgentFocusPresence } from "./cover/AgentFocusPresence"
import { DomainFocusPresence } from "./cover/DomainFocusPresence"
import { KeyFocusPresence } from "./cover/KeyFocusPresence"
import { CapabilityFocusPresence } from "./cover/CapabilityFocusPresence"
import { KeeperFocusPresence } from "./cover/KeeperFocusPresence"
import { LibraryItemFocusPresence } from "./cover/LibraryItemFocusPresence"
import { IntegrationFocusPresence } from "./cover/IntegrationFocusPresence"
import { KipApi, type ModelProvider } from "../../lib/kipApi"
import { parseChroniclePatchFieldErrors } from "./chronicleConfig/chroniclePatch"
import { useChronicleConfig } from "./chronicleConfig/useChronicleConfig"
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
import { useAuth } from "../../context/AuthContext"
import { useBoardEngagement } from "../boards/engagement/useBoardEngagement"
import { JourneyChronicleEngagement } from "../boards/engagement/JourneyChronicleEngagement"
import { PresenceEngagementActions } from "../boards/engagement/PresenceEngagementActions"

export type { PresenceLayout } from "./types"

export interface KeeperPresenceProps {
  object?: Record<string, unknown>
  objectType: string
  objectId: string
  domainId: string
  domainSlug?: string
  /** Named form the object inhabits — Theatre.js sequence selection. */
  /** Active board id — drives IDE build-context fields on domain Chronicle. */
  boardId?: string
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
  onSessionSelect?: (id: string) => void
  onKeySelect?: (id: string) => void
  /** Display name for domain idle — used when objectType is "domain". */
  domainDisplayName?: string
}

const AGENT_PROMPT_FIELD_KEYS = new Set(["lensSystemPrompt", "composedSystemPrompt"])

function buildDomainFieldPatch(
  schema: ReturnType<typeof usePresenceSchema>["schema"],
  fieldValues: Record<string, string>,
): Record<string, string> {
  const editableKeys = Object.entries(schema.fields)
    .filter(([, def]) => def.editable)
    .map(([key]) => key)

  const patch: Record<string, string> = {}
  for (const key of editableKeys) {
    if (fieldValues[key] !== undefined) {
      patch[key] = fieldValues[key]
    }
  }
  return patch
}

function buildAgentFieldPatch(
  schema: ReturnType<typeof usePresenceSchema>["schema"],
  fieldValues: Record<string, string>,
  options?: { includeShortLens?: boolean },
): Record<string, string> {
  const editableKeys = Object.entries(schema.fields)
    .filter(([, def]) => def.editable)
    .map(([key]) => key)

  const patch: Record<string, string> = {}
  for (const key of editableKeys) {
    if (key === "model_settings") continue
    if (key === "lensSystemPrompt") {
      const trimmed = fieldValues[key]?.trim() ?? ""
      if (trimmed.length >= 10) {
        patch[key] = trimmed
      } else if (options?.includeShortLens && trimmed.length > 0) {
        patch[key] = trimmed
      }
      continue
    }
    if (fieldValues[key] !== undefined) {
      patch[key] = fieldValues[key]
    }
  }
  return patch
}

function buildAgentAdvancedPatch(
  advancedValues: { temperature: string; max_tokens: string },
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  const temp = advancedValues.temperature.trim()
  const maxTokens = advancedValues.max_tokens.trim()
  if (temp) body.temperature = Number.parseFloat(temp)
  if (maxTokens) body.max_tokens = Number.parseInt(maxTokens, 10)
  return body
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
      return "display_label"
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
    case "key":
      return "display_label"
    case "capability":
      return "display_label"
    case "library":
      return "display_label"
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

function isTimestampField(fieldKey: string): boolean {
  return (
    fieldKey.endsWith("At") ||
    fieldKey.endsWith("_at") ||
    fieldKey === "updatedAt" ||
    fieldKey === "createdAt"
  )
}

function formatFieldValue(
  fieldKey: string,
  raw: unknown,
  role: FieldDefinition["role"],
): string {
  if (raw === null || raw === undefined) return ""
  if (typeof raw === "string") {
    if (isTimestampField(fieldKey)) {
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
  if (typeof raw === "boolean") {
    return raw ? "true" : "false"
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

function agentFieldVisible(
  objectType: string,
  key: string,
  def: FieldDefinition,
  fieldValues: Record<string, string>,
  record: Record<string, unknown> | null,
): boolean {
  if (objectType === "agent" && def.editable) return true
  if (def.role === "body" && key === "lensSystemPrompt") {
    return Boolean(record?.lensId) || Boolean(fieldValues[key]?.trim())
  }
  if (def.role === "body") {
    return Boolean(fieldValues[key]?.trim())
  }
  if (def.role === "quiet" && !def.editable) {
    return Boolean(fieldValues[key])
  }
  if (def.role === "quiet" && def.editable) {
    return objectType === "agent" || Boolean(fieldValues[key])
  }
  return Boolean(fieldValues[key])
}

const MODEL_PROVIDERS: ModelProvider[] = ["openai", "anthropic", "together-ai", "elevenlabs"]

function PresenceFieldEditor({
  fieldKey,
  def,
  value,
  fieldError,
  placeholder,
  onChange,
  modelProvider,
}: {
  fieldKey: string
  def: FieldDefinition
  value: string
  fieldError?: string
  placeholder?: string
  onChange: (v: string) => void
  modelProvider?: string
}) {
  if (fieldKey === "memory_enabled") {
    return (
      <>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="rounded border"
            style={{ borderColor: "hsl(var(--theme-border-soft))" }}
          />
          <span
            className="text-[14px]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            SOLE memory enabled
          </span>
        </label>
        {fieldError ? (
          <p
            className="text-[13px] mt-1.5 leading-relaxed"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            {fieldError}
          </p>
        ) : null}
      </>
    )
  }

  if (fieldKey === "model_provider") {
    return (
      <>
        <select
          value={value || "openai"}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-[14px] rounded-md border px-2.5 py-1.5 bg-transparent"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.55)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          {MODEL_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {fieldError ? (
          <p
            className="text-[13px] mt-1.5 leading-relaxed"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            {fieldError}
          </p>
        ) : null}
      </>
    )
  }

  if (fieldKey === "model") {
    const provider = (modelProvider || "openai") as ModelProvider
    const models = KipApi.getAvailableModels(provider)
    const options = models.includes(value) ? models : value ? [value, ...models] : models
    return (
      <>
        <select
          value={value || models[0] || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-[14px] rounded-md border px-2.5 py-1.5 bg-transparent"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.55)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          {options.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {fieldError ? (
          <p
            className="text-[13px] mt-1.5 leading-relaxed"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            {fieldError}
          </p>
        ) : null}
      </>
    )
  }

  if (fieldKey === "visibility") {
    return (
      <>
        <select
          value={value || "private"}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-[14px] rounded-md border px-2.5 py-1.5 bg-transparent"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.55)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
          <option value="shared">Shared</option>
        </select>
        {fieldError ? (
          <p
            className="text-[13px] mt-1.5 leading-relaxed"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            {fieldError}
          </p>
        ) : null}
      </>
    )
  }

  const isPromptField =
    fieldKey === "lensSystemPrompt" || fieldKey === "composedSystemPrompt"

  if (def.editable) {
    return (
      <>
        <AutoResizeTextarea
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? "…"}
          className={
            isPromptField
              ? "keeper-presence-field-value font-mono text-[15px]"
              : "keeper-presence-field-value"
          }
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        />
        {fieldError ? (
          <p
            className="text-[13px] mt-1.5 leading-relaxed"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            {fieldError}
          </p>
        ) : null}
      </>
    )
  }

  if (def.multiline) {
    return (
      <pre
        className="keeper-presence-field-value whitespace-pre-wrap break-words font-mono max-h-96 overflow-y-auto"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {value}
      </pre>
    )
  }

  return (
    <p
      className="keeper-presence-field-value"
      style={{ color: "hsl(var(--theme-ink-secondary))" }}
    >
      {value}
    </p>
  )
}

function PathCard({
  label,
  preview,
  sub,
  onClick,
}: {
  label: string
  preview?: string
  sub?: string
  onClick?: () => void
}) {
  const Wrapper = onClick ? "button" : "div"
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-3 py-2.5 mb-2${onClick ? " transition-all hover:opacity-90" : ""}`}
      style={{
        cursor: onClick ? "pointer" : "default",
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
    </Wrapper>
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

function DialogFocusSections({
  sections,
  onSessionSelect,
}: {
  sections: RelatedSection[]
  onSessionSelect?: (id: string) => void
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
              Nothing here yet — open the Dialog to begin.
            </p>
          ) : section.title === "Recent Exchanges" ? (
            section.items.map((item) => (
              <PathCard
                key={item.id}
                label={item.label}
                preview={item.preview}
                sub={item.sub}
                onClick={
                  item.navigateKind === "session" && onSessionSelect
                    ? () => onSessionSelect(item.id)
                    : undefined
                }
              />
            ))
          ) : (
            section.items.map((item) => (
              <PresenceThread
                key={item.id}
                label={item.label}
                sub={item.sub}
                preview={item.preview}
                onClick={
                  item.navigateKind === "session" && onSessionSelect
                    ? () => onSessionSelect(item.id)
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

function DialogFocusPresence({
  fieldValues,
  setFieldValues,
  markEdited,
  meta,
  relatedSections,
  onSessionSelect,
}: {
  fieldValues: Record<string, string>
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  markEdited: () => void
  meta?: PresenceMeta
  relatedSections: RelatedSection[]
  onSessionSelect?: (id: string) => void
}) {
  const motion = usePresentMotionValues()
  const hairline = "hsl(var(--theme-border-soft) / 0.35)"
  const title = fieldValues.title ?? ""
  const scope = fieldValues.context?.trim()

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <PresentAtmosphereLayer />
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
        <div style={primaryMotionStyle(motion)}>
          <AutoResizeTextarea
            value={title}
            onChange={(v) => {
              markEdited()
              setFieldValues((prev) => ({ ...prev, title: v }))
            }}
            placeholder="Untitled dialog"
            className="text-[20px] font-semibold leading-snug"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          />
          {meta?.line && (
            <p
              className="text-[13px] mt-1.5 leading-snug"
              style={{ ...contextMotionStyle(motion), color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {meta.line}
            </p>
          )}
          {scope && (
            <p
              className="text-[12px] mt-1 italic leading-snug truncate"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
              title={scope}
            >
              {scope}
            </p>
          )}
        </div>
      </div>

      <div
        className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4"
        style={secondaryMotionStyle(motion)}
      >
        {relatedSections.length === 0 ? (
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Nothing here yet — open the Dialog to begin.
          </p>
        ) : (
          <DialogFocusSections
            sections={relatedSections}
            onSessionSelect={onSessionSelect}
          />
        )}
      </div>
    </div>
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
  domainId,
  fieldValues,
  setFieldValues,
  markEdited,
  meta,
  relatedSections,
  onMomentSelect,
  onKeeperSelect,
  onEngagementSuccess,
}: {
  objectId: string
  domainId: string
  fieldValues: Record<string, string>
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  markEdited: () => void
  meta?: PresenceMeta
  relatedSections: RelatedSection[]
  onMomentSelect?: (id: string) => void
  onKeeperSelect?: (id: string) => void
  onEngagementSuccess?: () => void
}) {
  const boardCtx = useUniversalBoardOptional()
  const { isAuthenticated } = useAuth()
  const engagement = useBoardEngagement(() => {
    onEngagementSuccess?.()
    boardCtx?.actions.bumpJourneyNav()
  })
  const motion = usePresentMotionValues()
  const activeJourneyId = boardCtx?.selection.activeJourneyId ?? null
  const handleSetActive = boardCtx?.actions.onSetActiveJourney
  const activeKeeperId =
    boardCtx?.selection.selectedKeeperId ??
    meta?.keeper?.id ??
    undefined

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

        <JourneyChronicleEngagement
          engagement={engagement}
          journeyId={objectId}
          domainId={domainId}
          keeperId={activeKeeperId}
          isAuthenticated={isAuthenticated}
        />
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
  onSessionSelect,
}: {
  sections: RelatedSection[]
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
  onSessionSelect?: (id: string) => void
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
                      : item.navigateKind === "session" && onSessionSelect
                        ? () => onSessionSelect(item.id)
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
  onSessionSelect,
  onKeySelect,
  domainDisplayName,
  boardId: boardIdProp,
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

  const skipPresenceSchemaFetch =
    (objectType === "key" && layout === "focus") ||
    (objectType === "capability" && layout === "focus") ||
    (objectType === "library" && layout === "focus") ||
    (objectType === "keeper" && layout === "focus") ||
    (objectType === "service" && layout === "focus") ||
    objectType === "boardDef" ||
    (objectType === "frame" && layout === "config") ||
    (objectType === "domain" && layout === "focus")
  const { schema } = usePresenceSchema(
    objectType,
    domainId,
    objectSchemaOverride,
    skipPresenceSchemaFetch,
  )

  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({})
  const [advancedOpen, setAdvancedOpen] = React.useState(false)
  const [advancedValues, setAdvancedValues] = React.useState({ temperature: "", max_tokens: "" })
  const hasEdited = React.useRef(false)
  const hasEditedAdvanced = React.useRef(false)
  const debouncedValues = useDebounced(fieldValues, 1000)
  const debouncedAdvancedValues = useDebounced(advancedValues, 1000)

  const fieldValuesRef = React.useRef(fieldValues)
  const advancedValuesRef = React.useRef(advancedValues)
  fieldValuesRef.current = fieldValues
  advancedValuesRef.current = advancedValues

  const usesExplicitChronicleSave = objectType === "agent" || objectType === "domain"
  const boardId = boardIdProp

  const chronicleConfig = useChronicleConfig({
    entityKind: objectType === "domain" ? "domain" : "agent",
    entityId: usesExplicitChronicleSave ? objectId : null,
    domainId,
    domainSlug,
    buildPayload: () => {
      if (objectType === "agent") {
        const patch = buildAgentFieldPatch(schema, fieldValuesRef.current, {
          includeShortLens: true,
        })
        const advancedPatch = buildAgentAdvancedPatch(advancedValuesRef.current)
        const merged: Record<string, unknown> = { ...patch, ...advancedPatch }
        if (Object.keys(merged).length === 0) return null
        return merged
      }
      if (objectType === "domain") {
        const keys =
          boardId === "ide"
            ? [
                "name",
                "tagline",
                "keeperType",
                "purpose",
                "theme_color",
                "visibility",
                "buildContextName",
                "buildContextDescription",
                "activeRepository",
                "activeBranch",
                "environment",
              ]
            : ["name", "tagline", "keeperType", "purpose", "theme_color", "visibility"]
        const patch: Record<string, string> = {}
        for (const key of keys) {
          if (fieldValuesRef.current[key] !== undefined) {
            patch[key] = fieldValuesRef.current[key]
          }
        }
        if (Object.keys(patch).length === 0) return null
        return patch
      }
      return null
    },
    validate: () => {
      if (objectType !== "agent") return null
      const lensTrimmed = fieldValuesRef.current.lensSystemPrompt?.trim() ?? ""
      if (lensTrimmed.length > 0 && lensTrimmed.length < 10) {
        return "System prompt must be at least 10 characters."
      }
      return null
    },
    patchKeys: () => {
      if (objectType === "agent") {
        const patch = buildAgentFieldPatch(schema, fieldValuesRef.current, {
          includeShortLens: true,
        })
        return [...Object.keys(patch), ...Object.keys(buildAgentAdvancedPatch(advancedValuesRef.current))]
      }
      if (objectType === "domain") {
        return Object.keys(buildDomainFieldPatch(schema, fieldValuesRef.current))
      }
      return []
    },
    onSaved,
    onRefresh: handlePresenceRefresh,
  })

  const [autoSaveStatus, setAutoSaveStatus] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [autoSaveMessage, setAutoSaveMessage] = React.useState<string | null>(null)

  const saveStatus = usesExplicitChronicleSave ? chronicleConfig.saveStatus : autoSaveStatus
  const saveMessage = usesExplicitChronicleSave ? chronicleConfig.saveMessage : autoSaveMessage
  const isDirty = usesExplicitChronicleSave ? chronicleConfig.isDirty : false
  const fieldErrors = chronicleConfig.fieldErrors
  const setFieldErrors = chronicleConfig.setFieldErrors

  const markEdited = React.useCallback(() => {
    hasEdited.current = true
    if (usesExplicitChronicleSave) {
      chronicleConfig.markEdited()
    }
  }, [usesExplicitChronicleSave, chronicleConfig])

  const handleExplicitSave = chronicleConfig.handleSave

  React.useEffect(() => {
    if (!record) return
    const next: Record<string, string> = {}
    for (const key of Object.keys(schema.fields)) {
      next[key] = formatFieldValue(key, record[key], schema.fields[key]?.role ?? "secondary")
    }
    setFieldValues(next)
    setFieldErrors({})
    hasEdited.current = false

    const settings =
      record.model_settings && typeof record.model_settings === "object" && !Array.isArray(record.model_settings)
        ? (record.model_settings as Record<string, unknown>)
        : {}
    setAdvancedValues({
      temperature:
        typeof settings.temperature === "number" ? String(settings.temperature) : "",
      max_tokens:
        typeof settings.max_tokens === "number" ? String(settings.max_tokens) : "",
    })
    hasEditedAdvanced.current = false
    if (usesExplicitChronicleSave) {
      chronicleConfig.resetSaveState()
    } else {
      setAutoSaveStatus("idle")
      setAutoSaveMessage(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, schema])

  React.useEffect(() => {
    if (usesExplicitChronicleSave) return
    if (!hasEdited.current || !record || !objectId || !domainId) return
    const endpoint = patchEndpoint(objectType, objectId, domainId)

    const editableKeys = Object.entries(schema.fields)
      .filter(([, def]) => def.editable)
      .map(([key]) => key)

    const patch: Record<string, string> = {}
    for (const key of editableKeys) {
      if (key === "model_settings") continue
      if (key === "lensSystemPrompt") {
        const trimmed = debouncedValues[key]?.trim() ?? ""
        if (trimmed.length >= 10) {
          patch[key] = trimmed
        }
        continue
      }
      if (debouncedValues[key] !== undefined) {
        patch[key] = debouncedValues[key]
      }
    }

    if (Object.keys(patch).length === 0) return
    if (!endpoint) return

    void (async () => {
      try {
        setAutoSaveStatus("saving")
        setAutoSaveMessage(null)
        await apiFetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        setFieldErrors((prev) => {
          const next = { ...prev }
          for (const key of Object.keys(patch)) {
            delete next[key]
          }
          return next
        })
        setAutoSaveStatus("saved")
        setAutoSaveMessage("Saved")
        if (onSaved) {
          for (const [k, v] of Object.entries(patch)) onSaved(k, v)
        }
      } catch (err: unknown) {
        const patchErrors = parseChroniclePatchFieldErrors(err, Object.keys(patch))
        if (Object.keys(patchErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...patchErrors }))
        }
        setAutoSaveStatus("error")
        setAutoSaveMessage(
          (Object.values(patchErrors)[0] as string | undefined) ??
            (typeof (err as { data?: { error?: string } })?.data?.error === "string"
              ? (err as { data: { error: string } }).data.error
              : "Save failed"),
        )
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
      ([, def]) =>
        !def.hiddenByDefault && fieldPassesDensity(def, effectiveDensity),
    ).filter(([key]) => !hidden.has(key)) as [string, FieldDefinition][]
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
        domainDisplayName={domainDisplayName}
        layout={layout}
        effectiveDensity={effectiveDensity}
        hairline={hairline}
        typeLabel={typeLabel}
        primaryKey={primaryKey}
        fieldValues={fieldValues}
        setFieldValues={setFieldValues}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        saveStatus={saveStatus}
        saveMessage={saveMessage}
        advancedOpen={advancedOpen}
        setAdvancedOpen={setAdvancedOpen}
        advancedValues={advancedValues}
        setAdvancedValues={setAdvancedValues}
        markAdvancedEdited={() => {
          hasEditedAdvanced.current = true
          chronicleConfig.markEdited()
        }}
        markEdited={markEdited}
        isDirty={isDirty}
        onChronicleSave={
          usesExplicitChronicleSave ? () => void handleExplicitSave() : undefined
        }
        onDismissSaveError={
          usesExplicitChronicleSave ? chronicleConfig.dismissSaveError : undefined
        }
        boardId={boardId}
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
        onSessionSelect={onSessionSelect}
        onKeySelect={onKeySelect}
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
  domainDisplayName,
  layout,
  effectiveDensity,
  hairline,
  typeLabel,
  primaryKey,
  fieldValues,
  setFieldValues,
  fieldErrors,
  setFieldErrors,
  saveStatus,
  saveMessage,
  advancedOpen,
  setAdvancedOpen,
  advancedValues,
  setAdvancedValues,
  markAdvancedEdited,
  markEdited,
  isDirty,
  onChronicleSave,
  onDismissSaveError,
  boardId,
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
  onSessionSelect,
  onKeySelect,
}: {
  loading: boolean
  record: Record<string, unknown> | null
  objectType: string
  objectId: string
  domainId: string
  domainSlug?: string
  domainDisplayName?: string
  layout: PresenceLayout
  effectiveDensity: DensityLevel
  hairline: string
  typeLabel: string
  primaryKey: string
  fieldValues: Record<string, string>
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  fieldErrors: Record<string, string>
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  saveStatus: "idle" | "saving" | "saved" | "error"
  saveMessage: string | null
  advancedOpen: boolean
  setAdvancedOpen: React.Dispatch<React.SetStateAction<boolean>>
  advancedValues: { temperature: string; max_tokens: string }
  setAdvancedValues: React.Dispatch<React.SetStateAction<{ temperature: string; max_tokens: string }>>
  markAdvancedEdited: () => void
  markEdited: () => void
  isDirty: boolean
  onChronicleSave?: () => void | Promise<void>
  onDismissSaveError?: () => void
  boardId?: string
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
  onSessionSelect?: (id: string) => void
  onKeySelect?: (id: string) => void
}) {
  const motion = usePresentMotionValues()
  const { isAuthenticated } = useAuth()
  const boardCtx = useUniversalBoardOptional()
  const momentEngagement = useBoardEngagement(handlePresenceRefresh)

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
        domainId={domainId}
        fieldValues={fieldValues}
        setFieldValues={setFieldValues}
        markEdited={markEdited}
        meta={meta}
        relatedSections={relatedSections}
        onMomentSelect={onMomentSelect}
        onKeeperSelect={handleKeeperSelect}
        onEngagementSuccess={handlePresenceRefresh}
      />
    )
  }

  if (objectType === "dialog" && layout === "focus") {
    return (
      <DialogFocusPresence
        fieldValues={fieldValues}
        setFieldValues={setFieldValues}
        markEdited={markEdited}
        meta={meta}
        relatedSections={relatedSections}
        onSessionSelect={onSessionSelect}
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
  const fieldVisible = (key: string, def: FieldDefinition) =>
    agentFieldVisible(objectType, key, def, fieldValues, record)

  const AGENT_CARD_FIELD_KEYS = new Set(["tagline"])
  const secondaryFields = visibleFields.filter(
    ([key, def]) =>
      key !== primaryKey
      && def.role === "secondary"
      && fieldVisible(key, def)
      && !(objectType === "agent" && AGENT_CARD_FIELD_KEYS.has(key)),
  )
  const bodyFields = visibleFields.filter(
    ([key, def]) =>
      key !== primaryKey &&
      def.role === "body" &&
      fieldVisible(key, def) &&
      !(objectType === "agent" && AGENT_PROMPT_FIELD_KEYS.has(key)),
  )
  const ambientFields = visibleFields.filter(
    ([key, def]) =>
      key !== primaryKey &&
      def.role === "ambient" &&
      fieldVisible(key, def) &&
      !hiddenFields.includes(key),
  )
  const quietReadOnlyFields = visibleFields.filter(
    ([key, def]) =>
      key !== primaryKey && def.role === "quiet" && !def.editable && fieldVisible(key, def),
  )
  const quietEditableFields = visibleFields.filter(
    ([key, def]) =>
      key !== primaryKey && def.role === "quiet" && def.editable && fieldVisible(key, def),
  )

  const secondaryPlaceholders: Record<string, string> = {
    forward: "Where this journey is headed…",
    narrative: "What happened here…",
    purpose: "What this keeper holds…",
    summary: "What this draft carries…",
    context: "Where this dialog lives…",
    tagline: "Short identity line for this agent…",
    personality: "How this agent speaks and shows up…",
    lensSystemPrompt: "Domain lens — shapes voice and behavior…",
    avatar: "Avatar URL or emoji…",
    theme_color: "Accent color token or hex…",
    tools: "Capability tags, comma-separated…",
    model: "Model identifier…",
    model_provider: "openai, anthropic, together-ai…",
  }

  const handleFieldChange = (key: string, v: string) => {
    markEdited()
    setFieldValues((prev) => ({ ...prev, [key]: v }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  if (objectType === "domain" && layout === "focus" && record) {
    const ideBuildContextFields = (
      boardId === "ide"
        ? (Object.entries(schema.fields).filter(
            ([key, def]) =>
              def.editable &&
              [
                "buildContextName",
                "buildContextDescription",
                "activeRepository",
                "activeBranch",
                "environment",
              ].includes(key),
          ) as [string, FieldDefinition][])
        : []
    )

    const renderFieldEditor = (
      key: string,
      def: FieldDefinition,
      placeholder?: string,
    ) => (
      <PresenceFieldEditor
        fieldKey={key}
        def={def}
        value={fieldValues[key] ?? ""}
        fieldError={fieldErrors[key]}
        placeholder={placeholder}
        onChange={(v) => handleFieldChange(key, v)}
      />
    )

    return (
      <DomainFocusPresence
        objectId={objectId}
        record={record}
        fieldValues={fieldValues}
        fieldErrors={fieldErrors}
        visibleFields={visibleFields}
        ideBuildContextFields={ideBuildContextFields}
        relatedSections={relatedSections}
        saveStatus={saveStatus}
        saveMessage={saveMessage}
        isDirty={isDirty}
        onSave={() => void onChronicleSave?.()}
        onFieldChange={handleFieldChange}
        renderFieldEditor={renderFieldEditor}
      />
    )
  }

  if (objectType === "keeper" && layout === "focus" && record) {
    return (
      <KeeperFocusPresence
        objectId={objectId}
        domainId={domainId}
        record={record}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  if (objectType === "key" && layout === "focus" && record) {
    return (
      <KeyFocusPresence
        objectId={objectId}
        domainId={domainId}
        record={record}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  if (objectType === "capability" && layout === "focus" && record) {
    return (
      <CapabilityFocusPresence
        objectId={objectId}
        domainId={domainId}
        record={record}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  if (objectType === "library" && layout === "focus" && record) {
    return (
      <LibraryItemFocusPresence
        objectId={objectId}
        domainId={domainId}
        record={record}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  if (objectType === "service" && layout === "focus") {
    return (
      <IntegrationFocusPresence
        objectId={objectId}
        domainId={domainId}
        record={record ?? {}}
        boardId={boardId}
        onKeySelect={onKeySelect}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  if (objectType === "agent" && layout === "focus" && record) {
    const renderFieldEditor = (
      key: string,
      def: FieldDefinition,
      placeholder?: string,
    ) => (
      <PresenceFieldEditor
        fieldKey={key}
        def={def}
        value={fieldValues[key] ?? ""}
        fieldError={fieldErrors[key]}
        placeholder={placeholder}
        onChange={(v) => handleFieldChange(key, v)}
        modelProvider={fieldValues.model_provider}
      />
    )

    return (
      <AgentFocusPresence
        objectId={objectId}
        domainId={domainId}
        record={record}
        domainSlug={domainSlug}
        domainDisplayName={domainDisplayName}
        fieldValues={fieldValues}
        fieldErrors={fieldErrors}
        hiddenFields={hiddenFields}
        visibleFields={visibleFields}
        relatedSections={relatedSections}
        saveStatus={saveStatus}
        saveMessage={saveMessage}
        isDirty={isDirty}
        advancedOpen={advancedOpen}
        advancedValues={advancedValues}
        onSaveAgent={onChronicleSave}
        onDismissSaveError={onDismissSaveError}
        onFieldChange={handleFieldChange}
        onAdvancedOpenChange={setAdvancedOpen}
        onAdvancedChange={(key, value) => {
          markAdvancedEdited()
          setAdvancedValues((prev) => ({ ...prev, [key]: value }))
        }}
        renderFieldEditor={renderFieldEditor}
      />
    )
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

        {objectType !== "agent" && (
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
        )}

        {meta?.line && (
          <p
            className="text-[13px] mt-2 leading-relaxed"
            style={{ ...contextMotionStyle(motion), color: "hsl(var(--theme-ink-secondary))" }}
          >
            {meta.line}
          </p>
        )}
        {objectType === "agent" && saveStatus !== "idle" && saveMessage && (
          <p
            className="text-[12px] mt-2 font-medium"
            style={{
              color:
                saveStatus === "error"
                  ? "hsl(var(--theme-status-error, 0 72% 51%))"
                  : "hsl(var(--theme-ink-tertiary))",
            }}
            aria-live="polite"
          >
            {saveStatus === "saving" ? "Saving…" : saveMessage}
          </p>
        )}

        {objectType === "moment" && layout === "focus" && (
          <PresenceEngagementActions
            engagement={momentEngagement}
            keeperTypeName="Moment"
            entityType="moment"
            entityId={objectId}
            domainId={domainId}
            keeperId={boardCtx?.selection.selectedKeeperId ?? undefined}
            journeyId={boardCtx?.selection.activeJourneyId ?? undefined}
            targetType="moment"
            includeSlugs={["moment.update"]}
            isAuthenticated={isAuthenticated}
            className="mt-3"
          />
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
            <PresenceFieldEditor
              fieldKey={key}
              def={def}
              value={fieldValues[key] ?? ""}
              fieldError={fieldErrors[key]}
              placeholder={secondaryPlaceholders[key]}
              onChange={(v) => handleFieldChange(key, v)}
            />
          </div>
        ))}

        {bodyFields.map(([key, def]) => (
          <div key={key} className="mb-4" style={secondaryMotionStyle(motion)}>
            {def.label ? (
              <p className="keeper-presence-field-label mb-1.5">
                {resolveFieldLabel(key, def)}
              </p>
            ) : null}
            <PresenceFieldEditor
              fieldKey={key}
              def={def}
              value={fieldValues[key] ?? ""}
              fieldError={fieldErrors[key]}
              placeholder={secondaryPlaceholders[key]}
              onChange={(v) => handleFieldChange(key, v)}
            />
          </div>
        ))}

        {objectType === "draft" && (
          <PresenceSection title="Points">
            <DraftPointsSection spec={record?.spec ?? record?.spec_json} />
          </PresenceSection>
        )}

        {ambientFields.map(([key, def]) => (
          <div key={key} className="mb-3" style={contextMotionStyle(motion)}>
            {def.label || objectType === "agent" ? (
              <p className="keeper-presence-field-label mb-1.5">
                {resolveFieldLabel(key, def)}
              </p>
            ) : null}
            {def.editable ? (
              <PresenceFieldEditor
                fieldKey={key}
                def={def}
                value={fieldValues[key] ?? ""}
                fieldError={fieldErrors[key]}
                placeholder={secondaryPlaceholders[key]}
                onChange={(v) => handleFieldChange(key, v)}
              />
            ) : (
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                {fieldValues[key]}
              </p>
            )}
          </div>
        ))}

        <div style={secondaryMotionStyle(motion)}>
          <RelatedSections
            sections={relatedSections}
            onJourneySelect={onJourneySelect}
            onMomentSelect={onMomentSelect}
            onSessionSelect={onSessionSelect}
          />
        </div>

        {quietReadOnlyFields.length > 0 && !meta?.line && (
          <p
            className="text-[12px] mt-2"
            style={{ ...contextMotionStyle(motion), color: "hsl(var(--theme-ink-tertiary) / 0.55)" }}
          >
            {quietReadOnlyFields.map(([key]) => fieldValues[key]).filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </div>
  )
}
