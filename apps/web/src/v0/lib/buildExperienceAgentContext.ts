import type { DomainFrameJson } from "../data/domain-frame.types"
import type { AgentContext } from "../../hooks/useAgentDialog"
import type { AudienceRole } from "../data/domain-frame.types"

/**
 * Safe agentContext payload from domain frame JSON — tolerates partial / fallback frames.
 */
export function buildExperienceAgentContext(
  domainFrame: DomainFrameJson | null | undefined,
  audience: AudienceRole | string,
): AgentContext | undefined {
  if (!domainFrame) return undefined

  const directions = Array.isArray(domainFrame.directions) ? domainFrame.directions : []
  const kipContextRecord =
    domainFrame.kip_context && typeof domainFrame.kip_context === "object"
      ? domainFrame.kip_context
      : {}

  return {
    audience,
    model: domainFrame.kip?.model,
    forward: domainFrame.forward,
    directions: directions.filter(
      (d) =>
        Array.isArray(d?.available_to) &&
        d.available_to.includes(audience as AudienceRole),
    ),
    kip_context:
      (typeof kipContextRecord[audience as AudienceRole] === "string"
        ? kipContextRecord[audience as AudienceRole]
        : "") ?? "",
  }
}
