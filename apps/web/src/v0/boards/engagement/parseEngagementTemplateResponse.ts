import type { EngagementTemplateDefinition } from "../../../components/engagement/EngagementForm"

type LegacyTemplateField = {
  name: string
  type: string
  label: string
  placeholder?: string
  required?: boolean
  config?: EngagementTemplateDefinition["fields"][number]["config"]
}

type LegacyTemplatePayload = {
  key?: string
  slug?: string
  label?: string
  type?: string
  targetType?: string
  scope?: string
  fields?: LegacyTemplateField[]
  config?: {
    visibility?: string
    requiresConfirmation?: boolean
    action?: {
      successMessage?: string
      errorMessages?: Record<string, string>
    }
  }
}

function normalizeFields(
  fields: LegacyTemplateField[] | undefined,
): EngagementTemplateDefinition["fields"] {
  if (!Array.isArray(fields)) return []
  return fields.map((field) => ({
    name: field.name,
    type: field.type,
    label: field.label,
    placeholder: field.placeholder,
    required: field.required ?? field.config?.required === true,
    config: field.config,
  }))
}

function fromLegacyTemplate(
  payload: LegacyTemplatePayload,
  slug: string,
): EngagementTemplateDefinition | null {
  const resolvedSlug = payload.slug ?? payload.key ?? slug
  const fields = normalizeFields(payload.fields)
  if (!resolvedSlug || !payload.label) return null

  return {
    id: resolvedSlug,
    slug: resolvedSlug,
    label: payload.label,
    type: payload.type ?? "form",
    targetType: payload.targetType,
    config: {
      visibility:
        payload.config?.visibility ??
        (payload.scope === "public" ? "public" : "member"),
      requiresConfirmation: payload.config?.requiresConfirmation ?? false,
      action: {
        successMessage:
          payload.config?.action?.successMessage ?? "Saved successfully",
        errorMessages: payload.config?.action?.errorMessages,
      },
    },
    fields,
  }
}

/** Normalize execute + legacy templates router payloads for Chronicle Acts. */
export function parseEngagementTemplateResponse(
  response: unknown,
  slug: string,
): EngagementTemplateDefinition | null {
  if (!response || typeof response !== "object") return null

  const record = response as Record<string, unknown>

  if (record.success === true && record.data && typeof record.data === "object") {
    const data = record.data as EngagementTemplateDefinition
    if (typeof data.slug === "string" && Array.isArray(data.fields)) {
      return data
    }
  }

  if (typeof record.slug === "string" && Array.isArray(record.fields)) {
    return record as EngagementTemplateDefinition
  }

  return fromLegacyTemplate(record as LegacyTemplatePayload, slug)
}
