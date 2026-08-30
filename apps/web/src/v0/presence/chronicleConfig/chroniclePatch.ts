/**
 * Universal Chronicle targeted save — one PATCH route per entity kind.
 */

import { apiFetch } from "../../../lib/api"
import { normalizeTreatmentHexColor } from "../../treatment/resolveDomainTreatment"
import type { ChronicleEntityKind, ChronicleSaveResult } from "./types"

function humanizeChroniclePatchFieldError(field: string, raw: string): string {
  if (field === "lensSystemPrompt" || field === "systemPrompt") {
    return "System prompt must be at least 10 characters."
  }
  if (field === "name" && /at least 1|required/i.test(raw)) {
    return "Name cannot be empty."
  }
  if (field === "purpose" && /at least 1|required/i.test(raw)) {
    return "Purpose cannot be empty."
  }
  if (field === "model_provider" && /invalid|enum/i.test(raw)) {
    return "Choose openai, anthropic, together-ai, or elevenlabs."
  }
  if (raw && raw !== "Validation error") return raw
  return `Check ${field} and try again.`
}

export function parseChroniclePatchFieldErrors(
  err: unknown,
  patchKeys: string[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  const data = (err as {
    data?: {
      error?: string
      details?: Array<{ path?: (string | number)[]; message?: string }>
    }
  })?.data
  const status = (err as { status?: number })?.status
  const message =
    typeof data?.error === "string"
      ? data.error
      : typeof (err as { message?: string })?.message === "string"
        ? (err as { message: string }).message
        : "Save failed"

  const details = Array.isArray(data?.details) ? data.details : []
  for (const detail of details) {
    const pathKey = detail.path
      ?.map((segment) => String(segment))
      .find((segment) => patchKeys.includes(segment) || segment === "systemPrompt")
    if (!pathKey) continue
    const field = pathKey === "systemPrompt" ? "lensSystemPrompt" : pathKey
    errors[field] = humanizeChroniclePatchFieldError(field, detail.message ?? message)
  }

  if (
    patchKeys.includes("slug") &&
    (status === 409 || status === 404 || message.toLowerCase().includes("slug") || message.toLowerCase().includes("domain not found"))
  ) {
    errors.slug = message
  }

  if (Object.keys(errors).length === 0 && patchKeys.length > 0) {
    errors[patchKeys[0]] =
      message === "Validation error"
        ? "Check the fields below and try again."
        : message
  }

  return errors
}

export function resolveChroniclePatchEndpoint(
  entityKind: ChronicleEntityKind,
  entityId: string,
  domainId: string,
): string {
  switch (entityKind) {
    case "journey":
      return `/api/journeys/${encodeURIComponent(entityId)}`
    case "path":
      return `/api/paths/${encodeURIComponent(entityId)}`
    case "moment":
      return `/api/moments/${encodeURIComponent(entityId)}`
    case "keeper":
      return `/api/keepers/${encodeURIComponent(entityId)}`
    case "agent":
      return `/api/agents/${encodeURIComponent(entityId)}`
    case "draft":
      return `/api/domains/${encodeURIComponent(domainId)}/kip/drafts/${encodeURIComponent(entityId)}`
    case "dialog":
      return `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(entityId)}`
    case "domain":
      return `/api/domains/${encodeURIComponent(entityId)}`
    case "service":
    case "integration":
      return `/api/integrations/${encodeURIComponent(entityId)}`
    case "key":
      return `/api/keys/${encodeURIComponent(entityId)}`
    case "capability":
      return `/api/capabilities/${encodeURIComponent(entityId)}`
    case "library":
      return `/api/library-items/${encodeURIComponent(entityId)}`
    case "frame":
      return ""
    case "boardDef":
      return ""
    default:
      return ""
  }
}

/** Integration PATCH is scoped by domainId query param (Chronicle trail id is service slug). */
export function appendIntegrationChroniclePatchQuery(
  endpoint: string,
  domainId: string,
): string {
  const separator = endpoint.includes("?") ? "&" : "?"
  return `${endpoint}${separator}domainId=${encodeURIComponent(domainId)}`
}

export function resolveChronicleFramePatchEndpoint(domainSlug: string): string {
  return `/api/domains/${encodeURIComponent(domainSlug)}/frame`
}

export async function patchDomainTreatment(
  domainSlug: string,
  treatment: Record<string, unknown>,
): Promise<void> {
  await apiFetch(resolveChronicleFramePatchEndpoint(domainSlug), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ treatment }),
  })
}

function mergeTreatmentFramePatch(
  frameBody: Record<string, unknown>,
  partial: {
    name?: string
    palette?: { background?: string; accent?: string }
    font?: { family?: string }
  },
): void {
  const existing =
    frameBody.treatment &&
    typeof frameBody.treatment === "object" &&
    !Array.isArray(frameBody.treatment)
      ? (frameBody.treatment as Record<string, unknown>)
      : {}
  const existingPalette =
    existing.palette &&
    typeof existing.palette === "object" &&
    !Array.isArray(existing.palette)
      ? (existing.palette as Record<string, unknown>)
      : {}
  const existingFont =
    existing.font && typeof existing.font === "object" && !Array.isArray(existing.font)
      ? (existing.font as Record<string, unknown>)
      : {}

  frameBody.treatment = {
    ...existing,
    ...(partial.name !== undefined ? { name: partial.name } : {}),
    palette: {
      ...existingPalette,
      ...(partial.palette ?? {}),
    },
    font: {
      ...existingFont,
      ...(partial.font ?? {}),
    },
  }
}

export interface ChronicleSaveContext {
  domainId: string
  domainSlug?: string
}

/** Agent PATCH body — includes domainId for lens resolution. Omits blank optionals so a name-only save is not rejected. */
export function buildAgentChroniclePatchBody(
  patch: Record<string, unknown>,
  domainId: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = { domainId }
  for (const [key, value] of Object.entries(patch)) {
    if (key === "memory_enabled") {
      body.memory_enabled = value === "true" || value === true
      continue
    }
    if (key === "lensSystemPrompt") {
      const trimmed = typeof value === "string" ? value.trim() : ""
      if (trimmed.length >= 10) body[key] = trimmed
      continue
    }
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed === "" && key !== "name") continue
      body[key] = trimmed
      continue
    }
    body[key] = value
  }
  return body
}

/** Split domain Chronicle fields into domain record PATCH vs frame_json partial PATCH. */
export function splitDomainChroniclePatch(
  patch: Record<string, string>,
): {
  domainBody: Record<string, unknown>
  frameBody: Record<string, unknown>
  patchKeys: string[]
} {
  const domainBody: Record<string, unknown> = {}
  const frameBody: Record<string, unknown> = {}
  const patchKeys: string[] = []
  const settings: Record<string, unknown> = {}
  const ideBuildContext: Record<string, string> = {}
  let themePatch: Record<string, unknown> | undefined

  for (const [key, value] of Object.entries(patch)) {
    patchKeys.push(key)
    switch (key) {
      case "name":
        domainBody.name = value
        break
      case "slug":
        domainBody.slug = value
        break
      case "purpose":
        domainBody.description = value
        break
      case "tagline":
        frameBody.theme = {
          ...(frameBody.theme as Record<string, unknown> | undefined),
          tagline: value,
        }
        domainBody.theme = {
          ...(domainBody.theme as Record<string, unknown> | undefined),
          tagline: value,
        }
        break
      case "theme_color":
        themePatch = { colors: { primary: value } }
        frameBody.theme = {
          ...(frameBody.theme as Record<string, unknown> | undefined),
          colors: { primary: value },
        }
        break
      case "visibility":
        domainBody.isPublic = value === "public"
        frameBody.kip = { visibility: value }
        break
      case "keeperType":
        // incomplete — keeperType character mapping may need dedicated API
        settings.keeperTypeKey = value
        break
      case "buildContextName":
        ideBuildContext.name = value
        break
      case "buildContextDescription":
        ideBuildContext.description = value
        break
      case "activeRepository":
        ideBuildContext.activeRepository = value
        break
      case "activeBranch":
        ideBuildContext.activeBranch = value
        break
      case "environment":
        ideBuildContext.environment = value
        break
      case "treatmentName":
        mergeTreatmentFramePatch(frameBody, { name: value })
        break
      case "treatmentBackground": {
        const normalized = normalizeTreatmentHexColor(value, value)
        mergeTreatmentFramePatch(frameBody, { palette: { background: normalized } })
        break
      }
      case "treatmentAccent": {
        const normalized = normalizeTreatmentHexColor(value, value)
        mergeTreatmentFramePatch(frameBody, { palette: { accent: normalized } })
        break
      }
      case "treatmentFontFamily":
        mergeTreatmentFramePatch(frameBody, { font: { family: value } })
        break
      default:
        break
    }
  }

  if (Object.keys(ideBuildContext).length > 0) {
    settings.ideBuildContext = ideBuildContext
  }
  if (Object.keys(settings).length > 0) {
    domainBody.settings = settings
  }
  if (themePatch) {
    domainBody.theme = themePatch
  }

  return { domainBody, frameBody, patchKeys }
}

/**
 * Targeted Chronicle save — PATCH only the supplied payload.
 * Domain saves may issue a domain PATCH plus an optional frame partial PATCH.
 */
export async function handleChronicleSave(
  entityKind: ChronicleEntityKind,
  entityId: string,
  payload: Record<string, unknown>,
  ctx: ChronicleSaveContext,
  options?: {
    patchKeys?: string[]
    framePayload?: Record<string, unknown>
  },
): Promise<ChronicleSaveResult> {
  const patchKeys = options?.patchKeys ?? Object.keys(payload)

  if (patchKeys.length === 0) {
    // incomplete — no feedback on unchanged save
    return { status: "idle", message: null }
  }

  try {
    if (entityKind === "domain") {
      const endpoint = resolveChroniclePatchEndpoint("domain", entityId, ctx.domainId)
      let frameSlug = ctx.domainSlug?.trim().toLowerCase() || ""

      if (Object.keys(payload).length > 0) {
        const domainRes = (await apiFetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })) as { domain?: { slug?: string } }

        if (domainRes?.domain?.slug) {
          frameSlug = domainRes.domain.slug
        } else if (typeof payload.slug === "string") {
          frameSlug = payload.slug.trim().toLowerCase()
        }
      }

      if (options?.framePayload && frameSlug) {
        await apiFetch(resolveChronicleFramePatchEndpoint(frameSlug), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.framePayload),
        })
      }

      return { status: "saved", message: "Saved" }
    }

    if (entityKind === "frame") {
      const frameSlug = ctx.domainSlug?.trim().toLowerCase() || ""
      if (!frameSlug) {
        return { status: "error", message: "Domain slug is required to save frame config." }
      }
      await apiFetch(resolveChronicleFramePatchEndpoint(frameSlug), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      return { status: "saved", message: "Saved" }
    }

    if (entityKind === "boardDef") {
      return {
        status: "error",
        message:
          "Board definitions are code-defined; Chronicle cannot persist boardDef edits.",
      }
    }

    let endpoint = resolveChroniclePatchEndpoint(entityKind, entityId, ctx.domainId)
    if (!endpoint) {
      return { status: "error", message: "No save path for this entity kind." }
    }

    if (
      entityKind === "service" ||
      entityKind === "integration" ||
      entityKind === "keeper"
    ) {
      endpoint = appendIntegrationChroniclePatchQuery(endpoint, ctx.domainId)
    }

    await apiFetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    return { status: "saved", message: "Saved" }
  } catch (err: unknown) {
    const fieldErrors = parseChroniclePatchFieldErrors(err, patchKeys)
    return {
      status: "error",
      message:
        Object.values(fieldErrors)[0] ??
        (typeof (err as { data?: { error?: string } })?.data?.error === "string"
          ? (err as { data: { error: string } }).data.error
          : "Save failed"),
      fieldErrors,
    }
  }
}
