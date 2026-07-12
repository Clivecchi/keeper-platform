/**
 * Frame-as-mirror helpers for domain lead agent identity.
 * Authoritative: Domain.settings.primaryAgentId → kip_agents.
 * Mirror: frame_json.kip.agent_id (guest/jsonframe copy only).
 */

import { isSyntheticLeadAgentSlug, PLACEHOLDER_FRAME_AGENT_IDS } from "./domainLeadBindings.js"

export type DomainLeadResolutionSource = "db" | "mirror" | "uncast"

export interface DomainLeadMirrorInput {
  frame_json?: unknown
}

export function readFrameLeadAgentMirror(
  frameJson: DomainLeadMirrorInput["frame_json"],
): string | null {
  if (!frameJson || typeof frameJson !== "object") return null
  const kip = (frameJson as { kip?: { agent_id?: unknown } }).kip
  const raw = kip?.agent_id
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

/** True when mirror agent_id should be overwritten from authoritative lead slug. */
export function frameLeadMirrorNeedsSync(
  frameJson: unknown,
  authoritativeSlug: string,
): boolean {
  const mirror = readFrameLeadAgentMirror(frameJson)
  const target = authoritativeSlug.trim()
  if (!target) return false
  return mirror !== target
}

export function patchFrameLeadAgentMirror(
  frameJson: unknown,
  leadAgentSlug: string,
): Record<string, unknown> {
  const base =
    frameJson && typeof frameJson === "object" && !Array.isArray(frameJson)
      ? ({ ...(frameJson as Record<string, unknown>) } as Record<string, unknown>)
      : {}
  const kip =
    base.kip && typeof base.kip === "object"
      ? { ...(base.kip as Record<string, unknown>) }
      : {}
  return {
    ...base,
    kip: {
      ...kip,
      agent_id: leadAgentSlug.trim(),
    },
  }
}

/** Non-authoritative frame slug — usable only after kip_agents row lookup confirms cast. */
export function isUsableFrameLeadMirrorSlug(slug: string | null | undefined): boolean {
  const trimmed = slug?.trim() ?? ""
  if (!trimmed || PLACEHOLDER_FRAME_AGENT_IDS.has(trimmed)) return false
  if (trimmed === "kip" || trimmed === "kip-default") return false
  return true
}

export function isFrameLeadMirrorPlaceholder(slug: string | null | undefined): boolean {
  return isSyntheticLeadAgentSlug(slug)
}
