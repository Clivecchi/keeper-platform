import type { DomainFrameJson, DomainFrameKipContext } from "../data/domain-frame.types"
import type { AgentContext } from "../../hooks/useAgentDialog"
import type { AudienceRole } from "../data/domain-frame.types"
import { isVisibleToAudience } from "@keeper/shared"

function resolveKipContextString(
  kipContext: DomainFrameKipContext | undefined,
  audience: AudienceRole,
): string {
  if (!kipContext) return ""
  const direct = kipContext[audience as keyof DomainFrameKipContext]
  if (typeof direct === "string" && direct) return direct
  if (audience === "friend") {
    if (typeof kipContext.friend === "string" && kipContext.friend) return kipContext.friend
    if (typeof kipContext.keeper === "string") return kipContext.keeper
  }
  return ""
}

/**
 * Safe agentContext payload from domain frame JSON — tolerates partial / fallback frames.
 */
export function buildExperienceAgentContext(
  domainFrame: DomainFrameJson | null | undefined,
  audience: AudienceRole | string,
): AgentContext | undefined {
  if (!domainFrame) return undefined

  const directions = Array.isArray(domainFrame.directions) ? domainFrame.directions : []

  return {
    audience,
    model: domainFrame.kip?.model,
    forward: domainFrame.forward,
    directions: directions.filter(
      (d) =>
        Array.isArray(d?.available_to) &&
        isVisibleToAudience(d.available_to, audience as AudienceRole),
    ),
    kip_context: resolveKipContextString(domainFrame.kip_context, audience as AudienceRole),
  }
}
