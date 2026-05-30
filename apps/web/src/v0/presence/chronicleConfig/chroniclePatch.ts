/**
 * Universal Chronicle targeted save — one PATCH route per entity kind.
 */

import { apiFetch } from "../../../lib/api"
import type { ChronicleEntityKind, ChronicleSaveResult } from "./types"

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

  if (patchKeys.includes("lensSystemPrompt")) {
    const zodLensErr = data?.details?.find((d) =>
      d.path?.some(
        (segment) =>
          String(segment) === "lensSystemPrompt" || String(segment) === "systemPrompt",
      ),
    )
    if (zodLensErr || status === 400) {
      errors.lensSystemPrompt = "Agent voice must be at least 10 characters."
    }
  }

  if (Object.keys(errors).length === 0 && patchKeys.length > 0) {
    errors[patchKeys[0]] = message
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
    default:
      return ""
  }
}

export function resolveChronicleFramePatchEndpoint(domainSlug: string): string {
  return `/api/domains/${encodeURIComponent(domainSlug)}/frame`
}

export interface ChronicleSaveContext {
  domainId: string
  domainSlug?: string
}

/** Agent PATCH body — includes domainId for lens resolution. */
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
      case "purpose":
        domainBody.description = value
        break
      case "tagline":
        frameBody.theme = {
          ...(frameBody.theme as Record<string, unknown> | undefined),
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

      if (Object.keys(payload).length > 0) {
        await apiFetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (options?.framePayload && ctx.domainSlug) {
        await apiFetch(resolveChronicleFramePatchEndpoint(ctx.domainSlug), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.framePayload),
        })
      }

      return { status: "saved", message: "Saved" }
    }

    const endpoint = resolveChroniclePatchEndpoint(entityKind, entityId, ctx.domainId)
    if (!endpoint) {
      return { status: "error", message: "No save path for this entity kind." }
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
