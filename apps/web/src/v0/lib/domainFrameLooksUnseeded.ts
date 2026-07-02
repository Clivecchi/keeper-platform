import { domainFrameLooksUnseeded as sharedDomainFrameLooksUnseeded } from "@keeper/shared"
import type { DomainFrameJson } from "../data/domain-frame.types"

/**
 * True when the loaded frame still reflects platform defaults — usually because
 * `domain.frame_json` is empty and GET /frame returned the API fallback, or a
 * persisted copy of the platform seed remains on a personal domain.
 */
export function domainFrameLooksUnseeded(
  frame: DomainFrameJson,
  domainSlug: string,
  domainName?: string | null,
): boolean {
  return sharedDomainFrameLooksUnseeded(frame, domainSlug, domainName)
}
