"use client"

import * as React from "react"
import type {
  EngagementContext,
  EngagementTemplateDefinition,
  TemplateField,
} from "../../../components/engagement/EngagementForm"
import { ChronicleConfigShell } from "./ChronicleConfigShell"
import type { ChronicleSaveStatus } from "./types"

const HIDDEN_CONTEXT_FIELDS = new Set([
  "keeperId",
  "domainId",
  "journeyId",
  "dialogId",
  "kind",
])

const INPUT_CLASS =
  "w-full rounded-md border px-3 py-2 text-[13px] bg-transparent outline-none resize-y"

const INPUT_STYLE = {
  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
} as const

export interface ChronicleActPresenceProps {
  template: EngagementTemplateDefinition
  context: EngagementContext
  onSubmit: (inputs: Record<string, unknown>) => Promise<void>
  onClose: () => void
  submitting?: boolean
  errorMessage?: string | null
}

function visibleTemplateFields(
  template: EngagementTemplateDefinition,
  context: EngagementContext,
): TemplateField[] {
  return template.fields.filter((field) => {
    if (!HIDDEN_CONTEXT_FIELDS.has(field.name)) return true
    const ctxValue = context[field.name as keyof EngagementContext]
    return ctxValue === undefined || ctxValue === ""
  })
}

function validateFields(
  fields: TemplateField[],
  inputs: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const field of fields) {
    const value = inputs[field.name]
    const required =
      field.required || field.config?.required === true

    if (
      required &&
      (value === undefined || value === null || value === "")
    ) {
      errors[field.name] = `${field.label} is required`
      continue
    }

    if (typeof value !== "string" || !value) continue

    if (field.config?.minLength && value.length < field.config.minLength) {
      errors[field.name] = `${field.label} must be at least ${field.config.minLength} characters`
    }
    if (field.config?.maxLength && value.length > field.config.maxLength) {
      errors[field.name] = `${field.label} must be at most ${field.config.maxLength} characters`
    }
  }

  return errors
}

function ChronicleActField({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: TemplateField
  value: string
  error?: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="mb-4">
      <p className="keeper-presence-field-label mb-1.5">
        {field.label}
        {field.required ? (
          <span
            className="ml-1"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            *
          </span>
        ) : null}
      </p>

      {field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={4}
          className={INPUT_CLASS}
          style={{ ...INPUT_STYLE, minHeight: "6rem" }}
        />
      ) : field.type === "select" && field.config?.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full text-[14px] rounded-md border px-2.5 py-1.5 bg-transparent"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.55)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          <option value="">{field.placeholder || "Select…"}</option>
          {field.config.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === "password" ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={INPUT_CLASS}
          style={INPUT_STYLE}
        />
      )}

      {error ? (
        <p
          className="text-[13px] mt-1.5 leading-relaxed"
          style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Declared Chronicle Act surface — engagement templates render through the same
 * shell as Config Mode (ChronicleConfigShell), not a bespoke form layout.
 */
export function ChronicleActPresence({
  template,
  context,
  onSubmit,
  onClose,
  submitting = false,
  errorMessage = null,
}: ChronicleActPresenceProps) {
  const fields = React.useMemo(
    () => visibleTemplateFields(template, context),
    [template, context],
  )

  const [inputs, setInputs] = React.useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  )
  const [touched, setTouched] = React.useState(false)

  React.useEffect(() => {
    const initial: Record<string, string> = {}
    for (const field of fields) {
      const fromContext = context[field.name as keyof EngagementContext]
      if (fromContext !== undefined && fromContext !== null) {
        initial[field.name] = String(fromContext)
      }
    }
    setInputs(initial)
    setFieldErrors({})
    setTouched(false)
  }, [fields, context, template.slug])

  const saveStatus: ChronicleSaveStatus = submitting
    ? "saving"
    : errorMessage
      ? "error"
      : "idle"

  const handleFieldChange = (name: string, value: string) => {
    setTouched(true)
    setInputs((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleSave = async () => {
    const errors = validateFields(fields, inputs)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const payload: Record<string, unknown> = { ...inputs }
    for (const key of HIDDEN_CONTEXT_FIELDS) {
      const ctxValue = context[key as keyof EngagementContext]
      if (
        ctxValue !== undefined &&
        ctxValue !== "" &&
        payload[key] === undefined
      ) {
        payload[key] = ctxValue
      }
    }

    await onSubmit(payload)
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: template.label,
        avatar: template.icon ?? "◇",
        status: "Act",
      }}
      onBack={onClose}
      saveStatus={saveStatus}
      saveMessage={errorMessage}
      isDirty={touched || fields.some((f) => inputs[f.name]?.trim())}
      onSave={() => void handleSave()}
      saveLabel="Submit"
    >
      {fields.map((field) => (
        <ChronicleActField
          key={field.name}
          field={field}
          value={inputs[field.name] ?? ""}
          error={fieldErrors[field.name]}
          disabled={submitting}
          onChange={(value) => handleFieldChange(field.name, value)}
        />
      ))}
    </ChronicleConfigShell>
  )
}
